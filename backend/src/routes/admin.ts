import express from 'express';
import { User } from '../models/User.js';
import { Transaction } from '../models/Transaction.js';
import { Game } from '../models/Game.js';
import { verifyToken, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// Middleware to ensure user is admin
const requireAdmin = (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden: Admin access required' });
  }
  next();
};

// Get all transactions with filtering (by game name, category, date range, and optional userId)
router.get('/transactions', verifyToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { category, gameName, startDate, endDate, userId } = req.query;

    const gameFilter: any = {};
    let shouldFilterByGameIds = false;

    if (category) {
      gameFilter.genre = { $regex: new RegExp(`^${category}$`, 'i') };
      shouldFilterByGameIds = true;
    }
    if (gameName) {
      gameFilter.title = { $regex: new RegExp(gameName as string, 'i') };
      shouldFilterByGameIds = true;
    }

    let allowedGameIds: string[] = [];
    if (shouldFilterByGameIds) {
      const matchedGames = await Game.find(gameFilter).select('_id');
      allowedGameIds = matchedGames.map(g => g._id.toString());
      if (allowedGameIds.length === 0) return res.json([]);
    }

    const txFilter: any = {};
    if (shouldFilterByGameIds) txFilter.gameId = { $in: allowedGameIds };

    // Filter by specific user (as buyer OR seller)
    if (userId) {
      txFilter.$or = [{ sellerId: userId }, { buyerId: userId }];
    }

    if (startDate || endDate) {
      txFilter.createdAt = {};
      if (startDate) {
        const start = new Date(startDate as string);
        start.setHours(0, 0, 0, 0);
        txFilter.createdAt.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        txFilter.createdAt.$lte = end;
      }
    }

    const transactions = await Transaction.find(txFilter)
      .populate('gameId', 'title genre')
      .populate('sellerId', 'username email')
      .populate('buyerId', 'username email')
      .sort({ createdAt: -1 });

    res.json(transactions);
  } catch (error) {
    console.error('✗ Error fetching all transactions:', error);
    res.status(500).json({ message: 'Error fetching transactions', error });
  }
});

// Get all non-admin users (for filter dropdown)
router.get('/users', verifyToken, requireAdmin, async (_req: AuthRequest, res) => {
  try {
    const users = await User.find({ role: { $ne: 'admin' } }).select('-password').sort({ username: 1 });
    res.json(users);
  } catch (error) {
    console.error('✗ Error fetching users:', error);
    res.status(500).json({ message: 'Error fetching users', error });
  }
});

export default router;
