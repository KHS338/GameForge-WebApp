import mongoose from 'mongoose';

// Track monthly analytics for users registrations
const userRegistrationAnalyticsSchema = new mongoose.Schema({
  year: {
    type: Number,
    required: true,
  },
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12,
  },
  totalRegistrations: {
    type: Number,
    default: 0,
  },
  buyerRegistrations: {
    type: Number,
    default: 0,
  },
  sellerRegistrations: {
    type: Number,
    default: 0,
  },
});

userRegistrationAnalyticsSchema.index({ year: 1, month: 1 }, { unique: true });

// Track monthly revenue analytics
const revenueAnalyticsSchema = new mongoose.Schema({
  year: {
    type: Number,
    required: true,
  },
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12,
  },
  totalRevenue: {
    type: Number,
    default: 0,
  },
  platformRevenue: {
    type: Number,
    default: 0,
  },
  sellerRevenue: {
    type: Number,
    default: 0,
  },
  gameCount: {
    type: Number,
    default: 0,
  },
  saleCount: {
    type: Number,
    default: 0,
  },
});

revenueAnalyticsSchema.index({ year: 1, month: 1 }, { unique: true });

// Track per-seller monthly analytics
const sellerAnalyticsSchema = new mongoose.Schema({
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  year: {
    type: Number,
    required: true,
  },
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12,
  },
  totalSales: {
    type: Number,
    default: 0,
  },
  totalRevenue: {
    type: Number,
    default: 0,
  },
  averageRating: {
    type: Number,
    default: 0,
  },
  gamesAnalytics: [
    {
      gameId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Game',
        required: true,
      },
      sales: {
        type: Number,
        default: 0,
      },
      revenue: {
        type: Number,
        default: 0,
      },
    },
  ],
});

sellerAnalyticsSchema.index({ sellerId: 1, year: 1, month: 1 }, { unique: true });

// Track game popularity based on reviews
const gamePopularityAnalyticsSchema = new mongoose.Schema({
  gameId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Game',
    required: true,
  },
  year: {
    type: Number,
    required: true,
  },
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12,
  },
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  reviewCount: {
    type: Number,
    default: 0,
  },
  totalDownloads: {
    type: Number,
    default: 0,
  },
  totalSales: {
    type: Number,
    default: 0,
  },
});

gamePopularityAnalyticsSchema.index({ gameId: 1, year: 1, month: 1 }, { unique: true });

export const UserRegistrationAnalytics = mongoose.model(
  'UserRegistrationAnalytics',
  userRegistrationAnalyticsSchema
);
export const RevenueAnalytics = mongoose.model('RevenueAnalytics', revenueAnalyticsSchema);
export const SellerAnalytics = mongoose.model('SellerAnalytics', sellerAnalyticsSchema);
export const GamePopularityAnalytics = mongoose.model(
  'GamePopularityAnalytics',
  gamePopularityAnalyticsSchema
);
