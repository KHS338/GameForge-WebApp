import mongoose, { Types } from 'mongoose';
import { Game } from '../models/Game.js';
import { User } from '../models/User.js';
import { averageVectors, normalizeVector } from '../utils/gameVector.js';
import { generateGameEmbedding } from './embeddingService.js';

const VECTOR_INDEX_NAME = 'game_vector_index';

function toObjectId(value: string): Types.ObjectId {
  return new mongoose.Types.ObjectId(value);
}

async function getGameVector(gameId: string): Promise<number[] | null> {
  const game = await Game.findById(gameId);

  if (!game) {
    return null;
  }

  if (Array.isArray(game.game_vector) && game.game_vector.length > 0) {
    return game.game_vector;
  }

  return generateGameEmbedding({
    title: game.title,
    genre: game.genre,
    tags: game.tags,
    description: game.description,
  });
}

export async function getSimilarGamesByVector(params: {
  queryVector: number[];
  excludeGameId?: string;
  limit?: number;
}): Promise<any[]> {
  const { queryVector, excludeGameId, limit = 5 } = params;

  if (!queryVector.length) {
    return [];
  }

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

  if (excludeGameId && mongoose.Types.ObjectId.isValid(excludeGameId)) {
    pipeline.push({
      $match: {
        _id: { $ne: toObjectId(excludeGameId) },
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

  return Game.aggregate(pipeline as any);
}

export async function getGameRecommendations(gameId: string, limit = 5): Promise<any[]> {
  const vector = await getGameVector(gameId);

  if (!vector) {
    return getPopularGames(limit);
  }

  return getSimilarGamesByVector({ queryVector: vector, excludeGameId: gameId, limit });
}

export async function getUserInterestVector(userId: string): Promise<number[] | null> {
  const user = await User.findById(userId).populate('purchases');

  if (!user || !Array.isArray(user.purchases) || user.purchases.length === 0) {
    return null;
  }

  const vectors = await Promise.all(
    user.purchases.map(async (purchase: any) => {
      if (Array.isArray(purchase?.game_vector) && purchase.game_vector.length > 0) {
        return purchase.game_vector as number[];
      }

      if (purchase?.title && purchase?.genre && purchase?.description) {
        return generateGameEmbedding({
          title: purchase.title,
          genre: purchase.genre,
          tags: purchase.tags,
          description: purchase.description,
        });
      }

      return null;
    })
  );

  const validVectors = vectors.filter((vector): vector is number[] => Array.isArray(vector) && vector.length > 0);

  if (validVectors.length === 0) {
    return null;
  }

  return normalizeVector(averageVectors(validVectors));
}

export async function getUserRecommendations(userId: string, limit = 5): Promise<any[]> {
  const vector = await getUserInterestVector(userId);

  if (!vector) {
    return getPopularGames(limit);
  }

  return getSimilarGamesByVector({ queryVector: vector, limit });
}

export async function getPopularGames(limit = 5): Promise<any[]> {
  return Game.find({ published: true })
    .sort({ featured: -1, rating: -1, downloads: -1, revenue: -1, createdAt: -1 })
    .limit(limit)
    .populate('sellerId', 'username');
}
