import express from 'express';
import { verifyToken, AuthRequest } from '../middleware/auth.js';
import { getGameRecommendations, getPopularGames, getUserRecommendations } from '../services/recommendationService.js';

const router = express.Router();

router.get('/popular', async (_req, res) => {
  try {
    const games = await getPopularGames(5);
    res.json(games);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching popular games', error });
  }
});

router.get('/game/:id', async (req, res) => {
  try {
    const games = await getGameRecommendations(req.params.id, 5);
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

export default router;
