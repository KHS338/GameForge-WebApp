import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['sale', 'feature_fee'],
      required: true,
    },
    gameId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Game',
      required: true,
    },
    buyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    amount: {
      type: Number,
      required: true,
    },
    platformCut: {
      type: Number,
      default: 0,
    },
    totalPrice: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export const Transaction = mongoose.model('Transaction', transactionSchema);
