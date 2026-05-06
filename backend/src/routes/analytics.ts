import express, { Response } from 'express';
import { verifyToken, requireAdmin, optionalVerifyToken, AuthRequest } from '../middleware/auth.js';
import {
  getUserRegistrationAnalytics,
  getRevenueAnalytics,
  getSellerAnalytics,
  getGamePopularityAnalytics,
  getTopSellingGames,
  getTopRatedGames,
  getDashboardSummary,
} from '../services/analyticsService.js';
import { computeAllAnalytics, computeSellerAnalytics, computeGamePopularityAnalytics } from '../services/analyticsComputeService.js';

const router = express.Router();

// Admin: Get user registration analytics (last 12 months)
router.get('/admin/registrations', verifyToken, requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    await computeAllAnalytics();
    const analytics = await getUserRegistrationAnalytics();
    res.json(analytics);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Admin: Get revenue analytics (last 12 months)
router.get('/admin/revenue', verifyToken, requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    await computeAllAnalytics();
    const analytics = await getRevenueAnalytics();
    res.json(analytics);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Admin: Get dashboard summary
router.get('/admin/summary', verifyToken, requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    await computeAllAnalytics();
    const summary = await getDashboardSummary();
    res.json(summary);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Seller: Get personal sales and revenue analytics (last 12 months)
router.get('/seller/analytics', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.role === 'buyer') {
      return res.status(403).json({ message: 'Only sellers and admins can access this' });
    }

    await computeSellerAnalytics();
    const sellerId = req.user.id;
    const analytics = await getSellerAnalytics(sellerId);
    res.json(analytics);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Public: Get game popularity analytics (last 12 months)
router.get('/games/popularity', optionalVerifyToken, async (_req: AuthRequest, res: Response) => {
  try {
    await computeGamePopularityAnalytics();
    const analytics = await getGamePopularityAnalytics();
    res.json(analytics);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Public: Get top selling games for a specific month
router.get('/games/top-selling', optionalVerifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const today = new Date();
    const year = parseInt(req.query.year as string) || today.getFullYear();
    const month = parseInt(req.query.month as string) || today.getMonth() + 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const games = await getTopSellingGames(year, month, limit);
    res.json(games);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Public: Get top rated games for a specific month
router.get('/games/top-rated', optionalVerifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const today = new Date();
    const year = parseInt(req.query.year as string) || today.getFullYear();
    const month = parseInt(req.query.month as string) || today.getMonth() + 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const games = await getTopRatedGames(year, month, limit);
    res.json(games);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
