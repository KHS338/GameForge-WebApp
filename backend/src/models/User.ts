import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';

const notificationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    detail: {
      type: String,
      required: true,
    },
    tone: {
      type: String,
      enum: ['success', 'info', 'warning'],
      default: 'info',
    },
    category: {
      type: String,
      enum: ['purchase', 'feature', 'system'],
      default: 'system',
    },
    read: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ['buyer', 'seller', 'admin'],
      default: 'buyer',
    },
    walletBalance: {
      type: Number,
      default: 100,
      min: 0,
    },
    notificationsEnabled: {
      type: Boolean,
      default: true,
    },
    notifications: [notificationSchema],
    discountSettings: {
      defaultPercent: {
        type: Number,
        default: 30,
        min: 0,
        max: 100,
      },
      overrides: [
        {
          gameId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Game',
          },
          percent: {
            type: Number,
            default: 0,
            min: 0,
            max: 100,
          },
        },
      ],
    },
    avatar: String,
    bio: String,
    socialLinks: {
      twitter: String,
      instagram: String,
      website: String,
    },
    purchases: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Game',
      },
    ],
    listings: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Game',
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcryptjs.genSalt(10);
    const hash = await bcryptjs.hash(this.password, salt);
    this.password = hash;
    next();
  } catch (error: any) {
    next(error);
  }
});

// Method to compare password with hash
userSchema.methods.comparePassword = async function (enteredPassword: string) {
  return await bcryptjs.compare(enteredPassword, this.password);
};

export const User = mongoose.model('User', userSchema);
