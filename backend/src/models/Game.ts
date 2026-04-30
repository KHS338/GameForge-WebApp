import mongoose from 'mongoose';

const gameSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    genre: {
      type: String,
      required: true,
    },
    studio: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    featured: {
      type: Boolean,
      default: false,
    },
      featureExpiresAt: {
        type: Date,
        default: null,
      },
    published: {
      type: Boolean,
      default: true,
    },
    discountPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    tags: {
      type: [String],
      default: [],
    },
    rating: {
      type: Number,
      default: 4.5,
      min: 0,
      max: 5,
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    media: {
      cover: String,
      gallery: [String],
    },
    downloads: {
      type: Number,
      default: 0,
    },
    revenue: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export const Game = mongoose.model('Game', gameSchema);
