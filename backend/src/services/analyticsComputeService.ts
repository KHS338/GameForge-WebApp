import {
  UserRegistrationAnalytics,
  RevenueAnalytics,
  SellerAnalytics,
  GamePopularityAnalytics,
} from '../models/Analytics.js';
import { User } from '../models/User.js';
import { Transaction } from '../models/Transaction.js';
import { Game } from '../models/Game.js';

// Compute and update user registration analytics from actual user data
export async function computeUserRegistrationAnalytics() {
  // Get all users grouped by registration month
  const usersByMonth = await User.aggregate([
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        },
        users: { $push: '$role' },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  // Upsert each month's data
  for (const monthData of usersByMonth) {
    const year = monthData._id.year;
    const month = monthData._id.month;
    const totalRegistrations = monthData.count;
    const buyerRegistrations = monthData.users.filter((r: string) => r === 'buyer').length;
    const sellerRegistrations = monthData.users.filter((r: string) => r === 'seller').length;

    await UserRegistrationAnalytics.findOneAndUpdate(
      { year, month },
      {
        year,
        month,
        totalRegistrations,
        buyerRegistrations,
        sellerRegistrations,
      },
      { upsert: true }
    );
  }

  console.log(`✓ Updated user registration analytics for ${usersByMonth.length} months`);
}

// Compute and update revenue analytics from actual transaction data
export async function computeRevenueAnalytics() {
  // Get all transactions grouped by year and month
  const salesByMonth = await Transaction.aggregate([
    { $match: { type: 'sale' } },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        },
        totalRevenue: { $sum: '$totalPrice' },
        platformRevenue: { $sum: '$platformCut' },
        saleCount: { $sum: 1 },
        gameIds: { $addToSet: '$gameId' },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  // Upsert each month's data
  for (const monthData of salesByMonth) {
    const year = monthData._id.year;
    const month = monthData._id.month;
    const totalRevenue = monthData.totalRevenue || 0;
    const platformRevenue = monthData.platformRevenue || 0;
    const sellerRevenue = totalRevenue - platformRevenue;
    const gameCount = monthData.gameIds.length;
    const saleCount = monthData.saleCount;

    await RevenueAnalytics.findOneAndUpdate(
      { year, month },
      {
        year,
        month,
        totalRevenue,
        platformRevenue,
        sellerRevenue,
        gameCount,
        saleCount,
      },
      { upsert: true }
    );
  }

  console.log(`✓ Updated revenue analytics for ${salesByMonth.length} months`);
}

// Compute and update per-seller analytics from transaction data
export async function computeSellerAnalytics() {
  const sellers = await User.find({ role: 'seller' });

  for (const seller of sellers) {
    // Get all transactions for this seller grouped by month
    const sellerSalesByMonth = await Transaction.aggregate([
      {
        $match: {
          sellerId: seller._id,
          type: 'sale',
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          totalSales: { $sum: 1 },
          totalRevenue: { $sum: '$amount' },
          gameData: {
            $push: {
              gameId: '$gameId',
              amount: '$amount',
            },
          },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    // Get seller's average game rating
    const sellerGames = await Game.find({ sellerId: seller._id });
    const avgRating = sellerGames.length
      ? sellerGames.reduce((sum, g) => sum + (g.rating || 0), 0) / sellerGames.length
      : 0;

    // Upsert each month's data
    for (const monthData of sellerSalesByMonth) {
      const year = monthData._id.year;
      const month = monthData._id.month;
      const totalSales = monthData.totalSales;
      const totalRevenue = monthData.totalRevenue;

      // Group sales by game
      const gameMap = new Map<string, { sales: number; revenue: number }>();
      for (const gd of monthData.gameData) {
        const gameId = gd.gameId.toString();
        if (!gameMap.has(gameId)) {
          gameMap.set(gameId, { sales: 0, revenue: 0 });
        }
        const current = gameMap.get(gameId)!;
        current.sales += 1;
        current.revenue += gd.amount || 0;
      }

      const gamesAnalytics = Array.from(gameMap.entries()).map(([gameId, data]) => ({
        gameId,
        sales: data.sales,
        revenue: data.revenue,
      }));

      await SellerAnalytics.findOneAndUpdate(
        { sellerId: seller._id, year, month },
        {
          sellerId: seller._id,
          year,
          month,
          totalSales,
          totalRevenue,
          averageRating: Math.min(5, Math.max(0, avgRating)),
          gamesAnalytics,
        },
        { upsert: true }
      );
    }
  }

  console.log(`✓ Updated seller analytics for ${sellers.length} sellers`);
}

// Compute and update game popularity analytics from transaction and review data
export async function computeGamePopularityAnalytics() {
  // Get all game sales grouped by game and month
  const gameSalesByMonth = await Transaction.aggregate([
    { $match: { type: 'sale' } },
    {
      $group: {
        _id: {
          gameId: '$gameId',
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        },
        totalSales: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  // Get all games for quick lookup
  const gamesMap = new Map();
  const games = await Game.find({ published: true });
  for (const g of games) {
    gamesMap.set(g._id.toString(), g);
  }

  // Upsert each game-month combination
  for (const salesData of gameSalesByMonth) {
    const gameId = salesData._id.gameId;
    const year = salesData._id.year;
    const month = salesData._id.month;
    const totalSales = salesData.totalSales;

    const game = gamesMap.get(gameId.toString());
    if (!game) continue; // Skip if game not found

    const totalDownloads = totalSales; // Approximate downloads as sales
    const reviewCount = (game.reviews?.length || 0) as number;
    const averageRating = (game.rating || 0) as number;

    await GamePopularityAnalytics.findOneAndUpdate(
      { gameId, year, month },
      {
        gameId,
        year,
        month,
        totalSales,
        totalDownloads,
        reviewCount,
        averageRating: Math.min(5, Math.max(0, averageRating)),
      },
      { upsert: true }
    );
  }

  console.log(`✓ Updated game popularity analytics for ${gameSalesByMonth.length} game-month combinations`);
}

// Compute all analytics (call this periodically)
export async function computeAllAnalytics() {
  try {
    console.log('🔄 Computing analytics from transaction data...');
    await computeUserRegistrationAnalytics();
    await computeRevenueAnalytics();
    await computeSellerAnalytics();
    await computeGamePopularityAnalytics();
    console.log('✅ Analytics computation completed');
  } catch (error) {
    console.error('❌ Error computing analytics:', error);
    throw error;
  }
}
