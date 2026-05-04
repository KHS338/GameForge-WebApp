import express from 'express';
import { verifyToken, optionalVerifyToken, AuthRequest } from '../middleware/auth.js';
import { getGameRecommendations, getHomeFeaturedGames, getPopularGames, getUserPurchasedGameIds, getUserRecommendations } from '../services/recommendationService.js';

const router = express.Router();

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

export default router;
