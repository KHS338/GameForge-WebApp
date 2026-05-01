import mongoose from 'mongoose';

const forumCommentSchema = new mongoose.Schema(
  {
    gameId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Game',
      required: true,
      index: true,
    },
    topicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ForumTopic',
      required: true,
      index: true,
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    parentCommentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ForumComment',
      default: null,
      index: true,
    },
    depth: {
      type: Number,
      default: 0,
      min: 0,
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
    replyCount: {
      type: Number,
      default: 0,
      min: 0,
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
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

forumCommentSchema.index({ topicId: 1, parentCommentId: 1, createdAt: 1 });
forumCommentSchema.index({ topicId: 1, upvotes: -1, createdAt: 1 });

export const ForumComment = mongoose.model('ForumComment', forumCommentSchema);
