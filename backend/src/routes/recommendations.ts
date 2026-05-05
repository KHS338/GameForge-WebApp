import express from 'express';
import { Game } from '../models/Game.js';
import { verifyToken, optionalVerifyToken, AuthRequest } from '../middleware/auth.js';
import { generateEmbedding } from '../services/embeddingService.js';
import {
  getDefaultPopularGames,
  getGameRecommendations,
  getHomeFeaturedGames,
  getPopularGames,
  getSimilarGamesByVector,
  getUserPurchasedGameIds,
  getUserRecommendations,
} from '../services/recommendationService.js';

const router = express.Router();

function extractKeywords(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((part) => part.length >= 3)
    .slice(0, 12);
}

function buildReason(query: string, game: any): string {
  const keywords = extractKeywords(query);
  const haystack = `${game.title} ${game.genre} ${game.description} ${(game.tags ?? []).join(' ')}`.toLowerCase();
  const matches = keywords.filter((keyword) => haystack.includes(keyword));

  if (matches.length > 0) {
    const top = matches.slice(0, 3).join(', ');
    return `Matches your request around ${top}.`;
  }

  const tags = Array.isArray(game.tags) && game.tags.length > 0 ? game.tags.slice(0, 2).join(', ') : game.genre;
  return `Strong fit by genre and theme (${tags}).`;
}

function toIdString(value: unknown): string {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'object' && value !== null && '_id' in value) {
    const nested = (value as any)._id;
    if (typeof nested === 'string') {
      return nested;
    }
  }

  return String(value);
}

function scoreKeywordMatch(game: any, keywords: string[]): number {
  const title = String(game.title ?? '').toLowerCase();
  const genre = String(game.genre ?? '').toLowerCase();
  const description = String(game.description ?? '').toLowerCase();
  const tags = Array.isArray(game.tags) ? game.tags.map((tag: string) => tag.toLowerCase()) : [];

  let score = 0;

  for (const keyword of keywords) {
    if (title.includes(keyword)) {
      score += 6;
    }
    if (genre.includes(keyword)) {
      score += 5;
    }
    if (tags.some((tag: string) => tag.includes(keyword))) {
      score += 4;
    }
    if (description.includes(keyword)) {
      score += 2;
    }
  }

  return score;
}

async function getKeywordRecommendations(query: string, excludeIds: string[], limit: number): Promise<any[]> {
  const keywords = extractKeywords(query);
  if (keywords.length === 0) {
    return [];
  }

  const pool = await Game.find({ published: true })
    .sort({ featured: -1, rating: -1, downloads: -1, createdAt: -1 })
    .limit(120)
    .populate('sellerId', 'username');

  const excluded = new Set(excludeIds);

  const scored = pool
    .filter((game) => !excluded.has(toIdString(game._id)))
    .map((game) => {
      const base = Number(game.rating ?? 0) + Number(game.downloads ?? 0) * 0.001;
      const keywordScore = scoreKeywordMatch(game, keywords);
      return {
        game,
        score: keywordScore * 10 + base,
        keywordScore,
      };
    })
    .filter((entry) => entry.keywordScore > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map((entry) => entry.game);

  return scored;
}

router.get('/popular', async (_req, res) => {
  try {
    const games = await getPopularGames(5);
    res.json(games);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching popular games', error });
  }
});

router.get('/home-featured', optionalVerifyToken, async (req: AuthRequest, res) => {
  try {
    const games = await getHomeFeaturedGames(req.user?.id, 10);
    res.json(games);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching home featured games', error });
  }
});

router.get('/game/:id', optionalVerifyToken, async (req: AuthRequest, res) => {
  try {
    const purchasedIds = req.user ? await getUserPurchasedGameIds(req.user.id) : [];
    const games = await getGameRecommendations(req.params.id, 5, purchasedIds);
    res.json(games);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching game recommendations', error });
  }
});

router.get('/me', verifyToken, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const games = await getUserRecommendations(req.user.id, 5);
    res.json(games);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching personalized recommendations', error });
  }
});

router.post('/chat', optionalVerifyToken, async (req: AuthRequest, res) => {
  try {
    const query = String(req.body?.query ?? '').trim();
    if (!query) {
      return res.status(400).json({ message: 'Query is required' });
    }

    const purchasedIds = req.user ? await getUserPurchasedGameIds(req.user.id) : [];
    const queryVector = await generateEmbedding(query);

    let games = await getSimilarGamesByVector({
      queryVector,
      excludeGameIds: purchasedIds,
      limit: 5,
    });

    if (games.length < 5) {
      const idsFromVector = games.map((game) => toIdString((game as any)._id));
      const keywordFallback = await getKeywordRecommendations(query, [...purchasedIds, ...idsFromVector], 5 - games.length);
      games = [...games, ...keywordFallback];
    }

    if (games.length === 0) {
      games = await getDefaultPopularGames(5, purchasedIds);
    }

    const normalizedGames = games.map((game: any) =>
      typeof game?.toObject === 'function' ? game.toObject() : game
    );

    const withReasons = normalizedGames.map((game) => ({
      ...game,
      reason: buildReason(query, game),
    }));

    const answer = withReasons.length
      ? `I found ${withReasons.length} games based on "${query}". Start with ${withReasons[0]?.title ?? 'a top pick'}, then explore the rest.`
      : `I could not find matches for "${query}" right now.`;

    res.json({
      query,
      answer,
      games: withReasons,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error generating chat recommendations', error });
  }
});

export default router;
