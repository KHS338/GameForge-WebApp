import express from 'express';
import { Game } from '../models/Game.js';
import { User } from '../models/User.js';
import { Transaction } from '../models/Transaction.js';
import { verifyToken, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// Get all games
router.get('/', async (req, res) => {
  try {
    const { genre, featured, search } = req.query;
    console.log(`📚 GET /games - genre: ${genre || 'all'}, featured: ${featured || 'no'}, search: ${search || 'none'}`);
    const filter: any = { published: true };

    if (featured === 'true') {
      filter.featured = true;
    }

    if (genre) {
      filter.genre = genre;
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const games = await Game.find(filter).populate('sellerId', 'username');
    console.log(`✓ Found ${games.length} games`);
    res.json(games);
  } catch (error) {
    console.error('✗ Error fetching games:', error);
    res.status(500).json({ message: 'Error fetching games', error });
  }
});

// Get featured games
router.get('/featured', async (_req, res) => {
  try {
    const games = await Game.find({ featured: true, published: true }).populate('sellerId', 'username');
    res.json(games);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching featured games', error });
  }
});

// Get all unique tags
router.get('/tags/all', async (_req, res) => {
  try {
    const games = await Game.find({ tags: { $exists: true, $ne: [] } }, { tags: 1 });
    const uniqueTags = Array.from(new Set(games.flatMap((game) => game.tags || [])));
    res.json({ tags: uniqueTags.sort() });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tags', error });
  }
});

// Get single game by ID
router.get('/:id', async (req, res) => {
  try {
    const game = await Game.findById(req.params.id).populate('sellerId', 'username email');
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }
    res.json(game);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching game', error });
  }
});

// Create new game (seller only, requires auth)
router.post('/', verifyToken, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    if (req.user.role !== 'seller' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only sellers can create games' });
    }

    const { title, genre, studio, description, price, tags, discountPercent, media } = req.body;

    if (!title || !genre || !studio || !description || price === undefined) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const game = new Game({
      title,
      genre,
      studio,
      description,
      price,
      discountPercent: Number.isFinite(Number(discountPercent)) ? Number(discountPercent) : 0,
      tags: Array.isArray(tags) ? tags : typeof tags === 'string' ? tags.split(',').map((tag: string) => tag.trim()).filter(Boolean) : [],
      sellerId: req.user.id,
      media: {
        cover: media?.cover || req.body.cover || '',
        gallery: media?.gallery || req.body.gallery || [],
      },
    });

    await game.save();
    await game.populate('sellerId', 'username');

    res.status(201).json(game);
  } catch (error) {
    res.status(500).json({ message: 'Error creating game', error });
  }
});

// Purchase a game using buyer wallet
router.post('/:id/purchase', verifyToken, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    if (req.user.role !== 'buyer') {
      return res.status(403).json({ message: 'Only buyers can purchase games' });
    }

    const game = await Game.findById(req.params.id).populate('sellerId');

    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

    const sellerId = typeof game.sellerId === 'string' ? game.sellerId : game.sellerId._id.toString();
    const buyer = await User.findById(req.user.id);
    const seller = await User.findById(sellerId);

    if (!buyer || !seller) {
      return res.status(404).json({ message: 'Buyer or seller not found' });
    }

    const discountPercent = Number(game.discountPercent ?? 0);
    const discountedPrice = Number((game.price * (1 - discountPercent / 100)).toFixed(2));

    if ((buyer.walletBalance ?? 0) < discountedPrice) {
      return res.status(400).json({ message: 'Insufficient wallet balance' });
    }

    const platformCut = Number((discountedPrice * 0.2).toFixed(2));
    const sellerCredit = Number((discountedPrice - platformCut).toFixed(2));

    buyer.walletBalance = Number(((buyer.walletBalance ?? 0) - discountedPrice).toFixed(2));
    seller.walletBalance = Number(((seller.walletBalance ?? 0) + sellerCredit).toFixed(2));

    if (!buyer.purchases.some((purchase) => purchase.toString() === game._id.toString())) {
      buyer.purchases.push(game._id);
    }

    game.downloads = (game.downloads ?? 0) + 1;

    const transaction = new Transaction({
      sellerId: seller._id,
      type: 'sale',
      gameId: game._id,
      buyerId: buyer._id,
      amount: sellerCredit,
      platformCut: platformCut,
      totalPrice: discountedPrice,
    });

    await Promise.all([buyer.save(), seller.save(), game.save(), transaction.save()]);

    const updatedGame = await Game.findById(game._id).populate('sellerId', 'username');

    console.log(`💸 Purchase complete - game: ${game.title}, buyer: ${buyer.email}, seller credit: $${sellerCredit}, platform cut: $${platformCut}`);

    res.json({
      message: 'Purchase complete',
      game: updatedGame,
      wallet: {
        buyerBalance: buyer.walletBalance,
        sellerBalance: seller.walletBalance,
        platformCut,
        discountedPrice,
        discountPercent,
      },
    });
  } catch (error) {
    console.error('✗ Error purchasing game:', error);
    res.status(500).json({ message: 'Error purchasing game', error });
  }
});

// Feature a game using seller wallet
// Feature a game using seller wallet (7 days for $15)
router.post('/:id/feature', verifyToken, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    if (req.user.role !== 'seller' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only sellers can feature games' });
    }

    const game = await Game.findById(req.params.id).populate('sellerId');

    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

    const sellerId = typeof game.sellerId === 'string' ? game.sellerId : game.sellerId._id.toString();
    if (req.user.role !== 'admin' && sellerId !== req.user.id) {
      return res.status(403).json({ message: 'You can only feature your own games' });
    }

    // Check if already featured and not expired
    if (game.featureExpiresAt && new Date() < game.featureExpiresAt) {
      return res.json({
        message: 'Game is already featured',
        game,
        featureExpiresAt: game.featureExpiresAt,
      });
    }

    const seller = await User.findById(sellerId);

    if (!seller) {
      return res.status(404).json({ message: 'Seller not found' });
    }

    const featureFee = 15;
    if ((seller.walletBalance ?? 0) < featureFee) {
      return res.status(400).json({ message: 'Insufficient wallet balance to feature this game' });
    }

    seller.walletBalance = Number(((seller.walletBalance ?? 0) - featureFee).toFixed(2));
    game.featured = true;
    // Set feature expiration to 7 days from now
    game.featureExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const transaction = new Transaction({
      sellerId: seller._id,
      type: 'feature_fee',
      gameId: game._id,
      amount: -featureFee,
      totalPrice: featureFee,
    });

    await Promise.all([seller.save(), game.save(), transaction.save()]);

    const updatedGame = await Game.findById(game._id).populate('sellerId', 'username');

    console.log(`⭐ Game featured - game: ${game.title}, seller: ${seller.email}, fee: $${featureFee}, expires: ${game.featureExpiresAt}`);

    res.json({
      message: 'Game featured successfully for 7 days',
      game: updatedGame,
      walletBalance: seller.walletBalance,
      featureFee,
      featureExpiresAt: updatedGame?.featureExpiresAt,
    });
  } catch (error) {
    console.error('✗ Error featuring game:', error);
    res.status(500).json({ message: 'Error featuring game', error });
  }
});

// Update game (seller can update own games)
router.patch('/:id', verifyToken, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const game = await Game.findById(req.params.id);

    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

    if (game.sellerId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Can only update your own games' });
    }

    const { title, genre, studio, description, price, featured, rating, tags, discountPercent, media } = req.body;
    const updateData: any = {};

    if (title !== undefined) updateData.title = title;
    if (genre !== undefined) updateData.genre = genre;
    if (studio !== undefined) updateData.studio = studio;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = price;
    if (featured !== undefined) updateData.featured = featured;
    if (rating !== undefined) updateData.rating = rating;
    if (discountPercent !== undefined) updateData.discountPercent = Number(discountPercent);
    if (media !== undefined) updateData.media = media;
    if (tags !== undefined) {
      updateData.tags = Array.isArray(tags) ? tags : typeof tags === 'string' ? tags.split(',').map((tag: string) => tag.trim()).filter(Boolean) : [];
    }

    const updatedGame = await Game.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
    }).populate('sellerId', 'username');

    res.json(updatedGame);
  } catch (error) {
    res.status(500).json({ message: 'Error updating game', error });
  }
});

// Delete game (seller can delete own games)
router.delete('/:id', verifyToken, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const game = await Game.findById(req.params.id);

    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

    if (game.sellerId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Can only delete your own games' });
    }

    await Game.findByIdAndDelete(req.params.id);
    res.json({ message: 'Game deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting game', error });
  }
});

export default router;
