import express from 'express';
import { Transaction } from '../models/Transaction.js';
import { verifyToken, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

router.get('/seller', verifyToken, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    if (req.user.role !== 'seller' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only sellers can access their transactions' });
    }

    const { startDate, endDate, gameId } = req.query;
    
    const filter: any = { sellerId: req.user.id };

    if (gameId) {
      filter.gameId = gameId;
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate as string);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate as string);
      }
    }

    const transactions = await Transaction.find(filter)
      .populate('gameId', 'title')
      .populate('buyerId', 'username email')
      .sort({ createdAt: -1 });

    res.json(transactions);
  } catch (error) {
    console.error('✗ Error fetching transactions:', error);
    res.status(500).json({ message: 'Error fetching transactions', error });
  }
});

export default router;
