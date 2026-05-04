import mongoose from 'mongoose';

const forumReportSchema = new mongoose.Schema(
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
    commentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ForumComment',
      default: null,
      index: true,
    },
    targetType: {
      type: String,
      enum: ['topic', 'comment'],
      required: true,
    },
    reporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    details: {
      type: String,
      default: '',
      maxlength: 2000,
    },
    status: {
      type: String,
      enum: ['open', 'resolved'],
      default: 'open',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

forumReportSchema.index({ topicId: 1, status: 1, createdAt: -1 });
forumReportSchema.index({ commentId: 1, status: 1, createdAt: -1 });

export const ForumReport = mongoose.model('ForumReport', forumReportSchema);
