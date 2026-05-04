import mongoose, { Types } from 'mongoose';
import { Game } from '../models/Game.js';
import { Transaction } from '../models/Transaction.js';
import { User } from '../models/User.js';
import { averageVectors, normalizeVector } from '../utils/gameVector.js';
import { generateGameEmbedding } from './embeddingService.js';

const VECTOR_INDEX_NAME = 'game_vector_index';
const TRENDING_WINDOW_HOURS = 24;
const LARGE_BUYER_MIN_PURCHASES = 5;
const MAX_SYSTEM_FEATURED_GAMES = 10;
const SYSTEM_FEATURED_DURATION_DAYS = 7;
const REFEATURE_COOLDOWN_DAYS = 14;
const LOW_SALES_LOOKBACK_DAYS = 14;
const LOW_SALES_MAX_COUNT = 3;

function toObjectId(value: string): Types.ObjectId {
  return new mongoose.Types.ObjectId(value);
}

function toIdString(value: unknown): string {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (value instanceof mongoose.Types.ObjectId) {
    return value.toString();
  }

  if (typeof value === 'object' && value !== null && '_id' in value) {
    const nested = (value as any)._id;
    if (typeof nested === 'string') {
      return nested;
    }
    if (nested instanceof mongoose.Types.ObjectId) {
      return nested.toString();
    }
  }

  return String(value);
}

function normalizeGameIds(gameIds: string[] = []): string[] {
  const unique = new Set<string>();

  for (const gameId of gameIds) {
    if (typeof gameId !== 'string' || !mongoose.Types.ObjectId.isValid(gameId)) {
      continue;
    }

    unique.add(toObjectId(gameId).toString());
  }

  return [...unique];
}

function toObjectIds(gameIds: string[] = []): Types.ObjectId[] {
  return normalizeGameIds(gameIds).map((gameId) => toObjectId(gameId));
}

function shuffleArray<T>(items: T[]): T[] {
  const array = [...items];
  for (let index = array.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [array[index], array[randomIndex]] = [array[randomIndex], array[index]];
  }
  return array;
}

function scoreGameForUser(game: any, preferredGenres: Map<string, number>, preferredTags: Set<string>): number {
  const genreScore = preferredGenres.get(game.genre) ?? 0;
  const tags = Array.isArray(game.tags) ? game.tags : [];
  const tagScore = tags.reduce((total: number, tag: string) => total + (preferredTags.has(tag) ? 1 : 0), 0);
  const purchasePenalty = Number(game.downloads ?? 0) * 0.01;
  return genreScore * 2 + tagScore - purchasePenalty;
}

async function ensureGameVectorForDoc(game: any): Promise<number[] | null> {
  if (!game) {
    return null;
  }

  if (Array.isArray(game.game_vector) && game.game_vector.length > 0) {
    return game.game_vector;
  }

  if (!game.title || !game.genre || !game.description) {
    return null;
  }

  const vector = await generateGameEmbedding({
    title: game.title,
    genre: game.genre,
    tags: game.tags,
    description: game.description,
  });

  const gameId = toIdString(game._id);
  if (gameId && mongoose.Types.ObjectId.isValid(gameId)) {
    await Game.updateOne({ _id: toObjectId(gameId) }, { $set: { game_vector: vector } });
  }

  return vector;
}

export async function getUserPurchasedGameIds(userId: string): Promise<string[]> {
  const user = await User.findById(userId).select('purchases').lean();
  if (!user || !Array.isArray(user.purchases)) {
    return [];
  }

  return user.purchases.map((gameId) => toIdString(gameId)).filter(Boolean);
}

async function getGameVector(gameId: string): Promise<number[] | null> {
  if (!mongoose.Types.ObjectId.isValid(gameId)) {
    return null;
  }

  const game = await Game.findById(gameId);
  return ensureGameVectorForDoc(game);
}

export async function getSimilarGamesByVector(params: {
  queryVector: number[];
  excludeGameIds?: string[];
  limit?: number;
}): Promise<any[]> {
  const { queryVector, excludeGameIds = [], limit = 5 } = params;

  if (!queryVector.length) {
    return [];
  }

  const normalizedExcludeIds = excludeGameIds
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => toObjectId(id));

  const pipeline: any[] = [
    {
      $vectorSearch: {
        index: VECTOR_INDEX_NAME,
        path: 'game_vector',
        queryVector,
        numCandidates: Math.max(limit * 10, 20),
        limit: Math.max(limit * 10, 20),
        filter: {
          published: true,
        },
      },
    },
  ];

  if (normalizedExcludeIds.length > 0) {
    pipeline.push({
      $match: {
        _id: { $nin: normalizedExcludeIds },
      },
    });
  }

  pipeline.push(
    {
      $project: {
        title: 1,
        genre: 1,
        studio: 1,
        description: 1,
        price: 1,
        tags: 1,
        rating: 1,
        sellerId: 1,
        featured: 1,
        published: 1,
        downloads: 1,
        revenue: 1,
        media: 1,
        score: { $meta: 'vectorSearchScore' },
      },
    },
    {
      $limit: limit,
    }
  );

  try {
    return Game.aggregate(pipeline as any);
  } catch {
    return [];
  }
}

export async function getGameRecommendations(gameId: string, limit = 5, extraExcludeGameIds: string[] = []): Promise<any[]> {
  const vector = await getGameVector(gameId);
  const excludeIds = normalizeGameIds([gameId, ...extraExcludeGameIds]);

  if (!vector) {
    return getDefaultPopularGames(limit, excludeIds);
  }

  const vectorResults = await getSimilarGamesByVector({ queryVector: vector, excludeGameIds: excludeIds, limit });
  if (vectorResults.length >= limit) {
    return vectorResults;
  }

  const fallback = await getDefaultPopularGames(limit - vectorResults.length, [
    ...excludeIds,
    ...vectorResults.map((game) => toIdString(game._id)),
  ]);

  return [...vectorResults, ...fallback];
}

export async function getUserInterestVector(userId: string): Promise<number[] | null> {
  const user = await User.findById(userId).populate('purchases');

  if (!user || !Array.isArray(user.purchases) || user.purchases.length === 0) {
    return null;
  }

  const vectors = await Promise.all(
    user.purchases.map(async (purchase: any) => {
      if (!purchase) {
        return null;
      }

      if (!purchase.published) {
        return null;
      }

      if (Array.isArray(purchase.game_vector) && purchase.game_vector.length > 0) {
        return purchase.game_vector as number[];
      }

      return ensureGameVectorForDoc(purchase);
    })
  );

  const validVectors = vectors.filter((vector): vector is number[] => Array.isArray(vector) && vector.length > 0);

  if (validVectors.length === 0) {
    return null;
  }

  return normalizeVector(averageVectors(validVectors));
}

export async function getUserRecommendations(userId: string, limit = 5): Promise<any[]> {
  const purchasedIds = normalizeGameIds(await getUserPurchasedGameIds(userId));
  const excludeIds = [...purchasedIds];
  const vector = await getUserInterestVector(userId);

  if (!vector) {
    return getDefaultPopularGames(limit, excludeIds);
  }

  const vectorResults = await getSimilarGamesByVector({ queryVector: vector, excludeGameIds: excludeIds, limit });
  if (vectorResults.length >= limit) {
    return vectorResults;
  }

  const fallback = await getDefaultPopularGames(limit - vectorResults.length, [
    ...excludeIds,
    ...vectorResults.map((game) => toIdString(game._id)),
  ]);

  return [...vectorResults, ...fallback];
}

export async function getDefaultPopularGames(limit = 5, excludeGameIds: string[] = []): Promise<any[]> {
  const validExcludeIds = toObjectIds(excludeGameIds);

  const filter: any = { published: true };
  if (validExcludeIds.length > 0) {
    filter._id = { $nin: validExcludeIds };
  }

  return Game.find(filter)
    .sort({ featured: -1, rating: -1, downloads: -1, revenue: -1, createdAt: -1 })
    .limit(limit)
    .populate('sellerId', 'username');
}

async function getCurrentSystemFeaturedPool(limit = MAX_SYSTEM_FEATURED_GAMES): Promise<any[]> {
  const now = new Date();

  await Game.updateMany(
    {
      systemFeatured: true,
      systemFeaturedUntil: { $lte: now },
    },
    {
      $set: {
        systemFeatured: false,
        systemFeaturedUntil: null,
      },
    }
  );

  return Game.find({
    published: true,
    systemFeatured: true,
    systemFeaturedUntil: { $gt: now },
  })
    .sort({ systemFeaturedUntil: -1, lastFeaturedAt: -1 })
    .limit(limit)
    .populate('sellerId', 'username');
}

async function buildLowSalesCandidateGames(excludeGameIds: string[], limit: number): Promise<any[]> {
  const now = new Date();
  const cooldownDate = new Date(now.getTime() - REFEATURE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
  const lowSalesSince = new Date(now.getTime() - LOW_SALES_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  const excludedObjectIds = toObjectIds(excludeGameIds);

  const salesGroups = await Transaction.aggregate([
    {
      $match: {
        type: 'sale',
        createdAt: { $gte: lowSalesSince },
      },
    },
    {
      $group: {
        _id: '$gameId',
        salesCount: { $sum: 1 },
      },
    },
  ]);

  const salesMap = new Map<string, number>();
  for (const entry of salesGroups) {
    salesMap.set(toIdString(entry._id), Number(entry.salesCount ?? 0));
  }

  const candidates = await Game.find({
    published: true,
    systemFeatured: { $ne: true },
    _id: excludedObjectIds.length > 0 ? { $nin: excludedObjectIds } : { $exists: true },
    $or: [
      { lastFeaturedAt: null },
      { lastFeaturedAt: { $exists: false } },
      { lastFeaturedAt: { $lte: cooldownDate } },
    ],
  })
    .sort({ rating: -1, createdAt: -1 })
    .limit(Math.max(limit * 4, 40));

  return candidates
    .map((game) => ({
      game,
      salesCount: salesMap.get(toIdString(game._id)) ?? 0,
    }))
    .filter((entry) => entry.salesCount <= LOW_SALES_MAX_COUNT)
    .sort((left, right) => {
      if (left.salesCount !== right.salesCount) {
        return left.salesCount - right.salesCount;
      }

      const leftDownloads = Number(left.game.downloads ?? 0);
      const rightDownloads = Number(right.game.downloads ?? 0);
      if (leftDownloads !== rightDownloads) {
        return leftDownloads - rightDownloads;
      }

      return Number(right.game.rating ?? 0) - Number(left.game.rating ?? 0);
    })
    .slice(0, limit)
    .map((entry) => entry.game);
}

async function ensureSystemFeaturedPool(limit = MAX_SYSTEM_FEATURED_GAMES): Promise<any[]> {
  const now = new Date();
  let active = await getCurrentSystemFeaturedPool(limit);

  if (active.length >= limit) {
    return active;
  }

  const needed = limit - active.length;
  const activeIds = active.map((game) => toIdString(game._id));
  const lowSalesCandidates = await buildLowSalesCandidateGames(activeIds, needed);

  if (lowSalesCandidates.length > 0) {
    const until = new Date(now.getTime() + SYSTEM_FEATURED_DURATION_DAYS * 24 * 60 * 60 * 1000);
    const candidateIds = lowSalesCandidates.map((game) => game._id);

    await Game.updateMany(
      { _id: { $in: candidateIds } },
      {
        $set: {
          systemFeatured: true,
          systemFeaturedUntil: until,
          lastFeaturedAt: now,
        },
      }
    );

    active = await getCurrentSystemFeaturedPool(limit);
  }

  return active;
}

export async function getHomeFeaturedGames(userId?: string, limit = MAX_SYSTEM_FEATURED_GAMES): Promise<any[]> {
  const cappedLimit = Math.min(limit, MAX_SYSTEM_FEATURED_GAMES);
  const activePool = await ensureSystemFeaturedPool(cappedLimit);

  const purchasedIds = userId ? normalizeGameIds(await getUserPurchasedGameIds(userId)) : [];
  const purchasedSet = new Set(purchasedIds);

  const preferredGenres = new Map<string, number>();
  const preferredTags = new Set<string>();

  if (userId) {
    const user = await User.findById(userId).populate('purchases');
    if (user && Array.isArray(user.purchases)) {
      for (const purchase of user.purchases as any[]) {
        if (!purchase) {
          continue;
        }

        const genre = typeof purchase.genre === 'string' ? purchase.genre : '';
        if (genre) {
          preferredGenres.set(genre, (preferredGenres.get(genre) ?? 0) + 1);
        }

        const tags = Array.isArray(purchase.tags) ? purchase.tags : [];
        for (const tag of tags) {
          preferredTags.add(tag);
        }
      }
    }
  }

  const basePool = activePool.filter((game) => !purchasedSet.has(toIdString(game._id)));

  const scored = basePool
    .map((game) => ({
      game,
      score: scoreGameForUser(game, preferredGenres, preferredTags),
    }))
    .sort((left, right) => right.score - left.score);

  const selectedIds = new Set<string>();
  const selected: any[] = [];

  for (const entry of scored) {
    if (selected.length >= cappedLimit) {
      break;
    }

    if (entry.score <= 0 && preferredGenres.size > 0) {
      continue;
    }

    const id = toIdString(entry.game._id);
    if (selectedIds.has(id)) {
      continue;
    }

    selectedIds.add(id);
    selected.push(entry.game);
  }

  if (selected.length < cappedLimit) {
    const remainingPool = shuffleArray(basePool).filter((game) => !selectedIds.has(toIdString(game._id)));
    for (const game of remainingPool) {
      if (selected.length >= cappedLimit) {
        break;
      }

      const id = toIdString(game._id);
      selectedIds.add(id);
      selected.push(game);
    }
  }

  if (selected.length < cappedLimit) {
    const randomFallback = await Game.aggregate([
      {
        $match: {
          published: true,
          _id: {
            $nin: toObjectIds([
              ...purchasedIds,
              ...selected.map((game) => toIdString(game._id)),
            ]),
          },
        },
      },
      {
        $sample: { size: cappedLimit - selected.length },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'sellerId',
          foreignField: '_id',
          as: 'seller',
        },
      },
      {
        $unwind: {
          path: '$seller',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          title: 1,
          genre: 1,
          studio: 1,
          description: 1,
          price: 1,
          tags: 1,
          rating: 1,
          featured: 1,
          published: 1,
          downloads: 1,
          revenue: 1,
          media: 1,
          createdAt: 1,
          updatedAt: 1,
          lastFeaturedAt: 1,
          sellerId: {
            _id: '$seller._id',
            username: '$seller.username',
          },
        },
      },
    ]);

    for (const game of randomFallback) {
      if (selected.length >= cappedLimit) {
        break;
      }

      const id = toIdString(game._id);
      if (selectedIds.has(id)) {
        continue;
      }

      selectedIds.add(id);
      selected.push(game);
    }
  }

  return selected.slice(0, cappedLimit);
}

export async function getPopularGames(limit = 5, excludeGameIds: string[] = []): Promise<any[]> {
  const since = new Date(Date.now() - TRENDING_WINDOW_HOURS * 60 * 60 * 1000);
  const validExcludeIds = toObjectIds(excludeGameIds);

  const pipeline: any[] = [
    {
      $match: {
        type: 'sale',
        buyerId: { $ne: null },
        gameId: { $ne: null },
        createdAt: { $gte: since },
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'buyerId',
        foreignField: '_id',
        as: 'buyer',
      },
    },
    {
      $unwind: '$buyer',
    },
    {
      $match: {
        $expr: {
          $gte: [
            {
              $size: {
                $ifNull: ['$buyer.purchases', []],
              },
            },
            LARGE_BUYER_MIN_PURCHASES,
          ],
        },
      },
    },
    {
      $group: {
        _id: '$gameId',
        recentSalesCount: { $sum: 1 },
        recentRevenue: {
          $sum: {
            $ifNull: ['$totalPrice', '$amount'],
          },
        },
      },
    },
    {
      $lookup: {
        from: 'games',
        localField: '_id',
        foreignField: '_id',
        as: 'game',
      },
    },
    {
      $unwind: '$game',
    },
    {
      $match: {
        'game.published': true,
        ...(validExcludeIds.length > 0 ? { 'game._id': { $nin: validExcludeIds } } : {}),
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'game.sellerId',
        foreignField: '_id',
        as: 'seller',
      },
    },
    {
      $unwind: {
        path: '$seller',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $addFields: {
        score: {
          $add: [
            '$recentSalesCount',
            {
              $divide: ['$recentRevenue', 100],
            },
          ],
        },
      },
    },
    {
      $project: {
        _id: '$game._id',
        title: '$game.title',
        genre: '$game.genre',
        studio: '$game.studio',
        description: '$game.description',
        price: '$game.price',
        tags: '$game.tags',
        rating: '$game.rating',
        featured: '$game.featured',
        published: '$game.published',
        downloads: '$game.downloads',
        revenue: '$game.revenue',
        media: '$game.media',
        createdAt: '$game.createdAt',
        updatedAt: '$game.updatedAt',
        sellerId: {
          _id: '$seller._id',
          username: '$seller.username',
        },
        score: 1,
      },
    },
    {
      $sort: {
        score: -1,
        featured: -1,
        rating: -1,
        downloads: -1,
      },
    },
    {
      $limit: limit,
    },
  ];

  return Transaction.aggregate(pipeline);
}
