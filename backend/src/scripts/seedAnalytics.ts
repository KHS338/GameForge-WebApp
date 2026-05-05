import mongoose from 'mongoose';
import dotenv from 'dotenv';
import {
  UserRegistrationAnalytics,
  RevenueAnalytics,
  SellerAnalytics,
  GamePopularityAnalytics,
} from '../models/Analytics.js';
import { User } from '../models/User.js';
import { Game } from '../models/Game.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gameforge';

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected to MongoDB');
  } catch (error) {
    console.error('✗ Failed to connect to MongoDB:', error);
    process.exit(1);
  }
}

function getRandomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateRandomData(base: number, variance: number = 0.2): number {
  const variation = base * variance;
  return base + (Math.random() - 0.5) * 2 * variation;
}

async function seedUserRegistrationAnalytics() {
  console.log('📊 Seeding User Registration Analytics...');

  // Clear existing data
  await UserRegistrationAnalytics.deleteMany({});

  const months = [];
  const today = new Date();

  for (let i = 11; i >= 0; i--) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;

    // Generate realistic registration patterns (more in recent months)
    const baseRegistrations = 50 + i * 5;
    const totalRegistrations = Math.round(generateRandomData(baseRegistrations, 0.15));
    const buyerRatio = 0.65;
    const sellerRatio = 0.35;

    const doc = {
      year,
      month,
      totalRegistrations,
      buyerRegistrations: Math.round(totalRegistrations * buyerRatio),
      sellerRegistrations: Math.round(totalRegistrations * sellerRatio),
    };

    months.push(doc);
  }

  await UserRegistrationAnalytics.insertMany(months);
  console.log(`✓ Seeded ${months.length} months of user registration data`);
}

async function seedRevenueAnalytics() {
  console.log('📊 Seeding Revenue Analytics...');

  // Clear existing data
  await RevenueAnalytics.deleteMany({});

  const months = [];
  const today = new Date();

  for (let i = 11; i >= 0; i--) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;

    // Generate realistic revenue patterns (growing trend)
    const baseSalesCount = 30 + i * 8;
    const avgGamePrice = 25;
    const saleCount = Math.round(generateRandomData(baseSalesCount, 0.2));
    const totalRevenue = saleCount * avgGamePrice + generateRandomData(1000, 0.1);
    const platformCut = 0.3;

    const doc = {
      year,
      month,
      totalRevenue: Math.round(totalRevenue),
      platformRevenue: Math.round(totalRevenue * platformCut),
      sellerRevenue: Math.round(totalRevenue * (1 - platformCut)),
      gameCount: getRandomBetween(20, 50),
      saleCount,
    };

    months.push(doc);
  }

  await RevenueAnalytics.insertMany(months);
  console.log(`✓ Seeded ${months.length} months of revenue data`);
}

async function seedSellerAnalytics() {
  console.log('📊 Seeding Seller Analytics...');

  // Clear existing data
  await SellerAnalytics.deleteMany({});

  const sellers = await User.find({ role: 'seller' }).limit(5);

  if (sellers.length === 0) {
    console.log('⚠ No sellers found in database. Skipping seller analytics seeding.');
    return;
  }

  const today = new Date();

  for (const seller of sellers) {
    for (let i = 11; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;

      const sellerGames = await Game.find({ sellerId: seller._id }).limit(3);

      // Generate realistic sales patterns
      const baseSales = 10 + i * 3;
      const totalSales = Math.round(generateRandomData(baseSales, 0.25));
      const totalRevenue = Math.round(totalSales * 25 + generateRandomData(500, 0.1));

      const gamesAnalytics = sellerGames.map((game) => ({
        gameId: game._id,
        sales: getRandomBetween(2, Math.max(3, Math.ceil(totalSales / sellerGames.length))),
        revenue: Math.round(generateRandomData(500, 0.15)),
      }));

      await SellerAnalytics.create({
        sellerId: seller._id,
        year,
        month,
        totalSales,
        totalRevenue,
        averageRating: parseFloat((Math.random() * 2 + 3.5).toFixed(2)),
        gamesAnalytics,
      });
    }
  }

  console.log(`✓ Seeded seller analytics for ${sellers.length} sellers`);
}

async function seedGamePopularityAnalytics() {
  console.log('📊 Seeding Game Popularity Analytics...');

  // Clear existing data
  await GamePopularityAnalytics.deleteMany({});

  const games = await Game.find({ published: true }).limit(20);

  if (games.length === 0) {
    console.log('⚠ No published games found. Skipping game popularity seeding.');
    return;
  }

  const today = new Date();

  for (const game of games) {
    for (let i = 11; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;

      // Generate realistic popularity patterns
      const baseDownloads = 50 + i * 15;
      const baseSales = 20 + i * 5;
      const baseReviews = 5 + i * 2;

      const totalDownloads = Math.round(generateRandomData(baseDownloads, 0.2));
      const totalSales = Math.round(generateRandomData(baseSales, 0.25));
      const reviewCount = Math.round(generateRandomData(baseReviews, 0.3));

      // Calculate average rating based on game's base rating with some monthly variance
      const baseRating = game.rating || 4.0;
      const monthlyVariance = (Math.random() - 0.5) * 0.5;
      const averageRating = Math.max(1, Math.min(5, baseRating + monthlyVariance));

      await GamePopularityAnalytics.create({
        gameId: game._id,
        year,
        month,
        averageRating: parseFloat(averageRating.toFixed(2)),
        reviewCount,
        totalDownloads,
        totalSales,
      });
    }
  }

  console.log(`✓ Seeded game popularity analytics for ${games.length} games`);
}

async function seedAllAnalytics() {
  try {
    await connectDB();

    console.log('\n🌱 Starting Analytics Data Seeding...\n');

    await seedUserRegistrationAnalytics();
    await seedRevenueAnalytics();
    await seedSellerAnalytics();
    await seedGamePopularityAnalytics();

    console.log('\n✅ Analytics seeding completed successfully!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

seedAllAnalytics();
