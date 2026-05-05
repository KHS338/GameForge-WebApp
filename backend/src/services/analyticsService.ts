import {
  UserRegistrationAnalytics,
  RevenueAnalytics,
  SellerAnalytics,
  GamePopularityAnalytics,
} from '../models/Analytics.js';
import { User } from '../models/User.js';
import { Transaction } from '../models/Transaction.js';
import { Game } from '../models/Game.js';

// Helper function to sanitize numeric values and prevent NaN/-Infinity
function sanitizeNumber(val: any, defaultValue: number = 0): number {
  if (val === null || val === undefined) return defaultValue;
  const n = Number(val);
  return Number.isFinite(n) ? n : defaultValue;
}

// Helper function to get last 12 months
export function getLast12Months() {
  const months = [];
  const today = new Date();
  for (let i = 11; i >= 0; i--) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
    months.push({
      year: date.getFullYear(),
      month: date.getMonth() + 1,
    });
  }
  return months;
}

// Admin Dashboard: User Registration Analytics
export async function getUserRegistrationAnalytics() {
  const months = getLast12Months();
  const analytics = await UserRegistrationAnalytics.find({
    $or: months.map((m) => ({ year: m.year, month: m.month })),
  }).sort({ year: 1, month: 1 });

  return {
    data: analytics,
    months: months,
  };
}

// Admin Dashboard: Revenue Analytics
export async function getRevenueAnalytics() {
  const months = getLast12Months();
  const analytics = await RevenueAnalytics.find({
    $or: months.map((m) => ({ year: m.year, month: m.month })),
  }).sort({ year: 1, month: 1 });

  return {
    data: analytics,
    months: months,
  };
}

// Seller Dashboard: Individual Seller Analytics
export async function getSellerAnalytics(sellerId: string) {
  const months = getLast12Months();
  const analytics = await SellerAnalytics.find({
    sellerId,
    $or: months.map((m) => ({ year: m.year, month: m.month })),
  })
    .populate('gamesAnalytics.gameId', 'title')
    .sort({ year: 1, month: 1 });

  return {
    data: analytics,
    months: months,
  };
}

// Public: Game Popularity Analytics
export async function getGamePopularityAnalytics() {
  const months = getLast12Months();
  const analytics = await GamePopularityAnalytics.find({
    $or: months.map((m) => ({ year: m.year, month: m.month })),
  })
    .populate('gameId', 'title rating')
    .sort({ year: 1, month: 1, averageRating: -1 });

  return {
    data: analytics,
    months: months,
  };
}

// Get top selling games in a month
export async function getTopSellingGames(year: number, month: number, limit: number = 10) {
  const analytics = await GamePopularityAnalytics.find({ year, month })
    .populate('gameId', 'title rating sellerId')
    .sort({ totalSales: -1 })
    .limit(limit);

  return analytics;
}

// Get top rated games in a month
export async function getTopRatedGames(year: number, month: number, limit: number = 10) {
  const analytics = await GamePopularityAnalytics.find({ year, month })
    .populate('gameId', 'title rating sellerId')
    .sort({ averageRating: -1, reviewCount: -1 })
    .limit(limit);

  return analytics;
}

// Aggregate all stats for dashboard summary
export async function getDashboardSummary() {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;

  const userStats = await UserRegistrationAnalytics.findOne({
    year: currentYear,
    month: currentMonth,
  });

  const revenueStats = await RevenueAnalytics.findOne({
    year: currentYear,
    month: currentMonth,
  });

  const totalUsers = await User.countDocuments();
  const totalGames = await Game.countDocuments({ published: true });
  const totalSales = await Transaction.countDocuments({ type: 'sale' });

  return {
    currentMonth: `${currentMonth}/${currentYear}`,
    totalUsers: sanitizeNumber(totalUsers, 0),
    totalGames: sanitizeNumber(totalGames, 0),
    totalSales: sanitizeNumber(totalSales, 0),
    monthlyStats: {
      newRegistrations: sanitizeNumber(userStats?.totalRegistrations, 0),
      monthlyRevenue: sanitizeNumber(revenueStats?.totalRevenue, 0),
      monthlySales: sanitizeNumber(revenueStats?.saleCount, 0),
    },
  };
}
