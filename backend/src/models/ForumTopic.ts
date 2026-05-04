import mongoose from 'mongoose';

const forumTopicSchema = new mongoose.Schema(
  {
    gameId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Game',
      required: true,
      index: true,
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 180,
    },
    bodyMarkdown: {
      type: String,
      required: true,
      maxlength: 25000,
    },
    upvoters: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    downvoters: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    upvotes: {
      type: Number,
      default: 0,
      min: 0,
    },
    downvotes: {
      type: Number,
      default: 0,
      min: 0,
    },
    commentCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    pinned: {
      type: Boolean,
      default: false,
    },
    locked: {
      type: Boolean,
      default: false,
    },
    reportsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    editedAt: {
      type: Date,
      default: null,
    },
    lastActivityAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

forumTopicSchema.index({ gameId: 1, pinned: -1, lastActivityAt: -1 });
forumTopicSchema.index({ gameId: 1, pinned: -1, upvotes: -1, createdAt: -1 });

export const ForumTopic = mongoose.model('ForumTopic', forumTopicSchema);
