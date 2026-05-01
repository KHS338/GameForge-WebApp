import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { verifyToken, AuthRequest } from '../middleware/auth.js';
import { Game } from '../models/Game.js';
import { ForumTopic } from '../models/ForumTopic.js';
import { ForumComment } from '../models/ForumComment.js';
import { ForumReport } from '../models/ForumReport.js';

const router = express.Router();

function isValidObjectId(id: string) {
  return mongoose.Types.ObjectId.isValid(id);
}

function normalizeVote(value: unknown): -1 | 0 | 1 | null {
  if (value === 1 || value === '1') return 1;
  if (value === -1 || value === '-1') return -1;
  if (value === 0 || value === '0') return 0;
  return null;
}

function hasUserId(ids: mongoose.Types.ObjectId[], userId: string) {
  return ids.some((id) => id.toString() === userId);
}

function getUserVote(upvoters: mongoose.Types.ObjectId[], downvoters: mongoose.Types.ObjectId[], userId?: string) {
  if (!userId) {
    return 0;
  }

  if (hasUserId(upvoters, userId)) {
    return 1;
  }

  if (hasUserId(downvoters, userId)) {
    return -1;
  }

  return 0;
}

function canModerate(authorId: mongoose.Types.ObjectId, user?: { id: string; role: string }) {
  if (!user) {
    return false;
  }

  if (user.role === 'admin') {
    return true;
  }

  return authorId.toString() === user.id;
}

function attachOptionalUser(req: AuthRequest, _res: express.Response, next: express.NextFunction) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { id: string; email: string; role: string };
    req.user = decoded;
    next();
  } catch {
    next();
  }
}

function applyVoteToDoc(doc: { upvoters: mongoose.Types.ObjectId[]; downvoters: mongoose.Types.ObjectId[]; upvotes: number; downvotes: number }, userId: string, vote: -1 | 0 | 1) {
  const nextUpvoters = doc.upvoters.filter((id) => id.toString() !== userId);
  const nextDownvoters = doc.downvoters.filter((id) => id.toString() !== userId);

  if (vote === 1) {
    nextUpvoters.push(new mongoose.Types.ObjectId(userId));
  }

  if (vote === -1) {
    nextDownvoters.push(new mongoose.Types.ObjectId(userId));
  }

  doc.upvoters = nextUpvoters;
  doc.downvoters = nextDownvoters;
  doc.upvotes = nextUpvoters.length;
  doc.downvotes = nextDownvoters.length;
}

router.get('/games/:gameId/topics', attachOptionalUser, async (req: AuthRequest, res) => {
  try {
    const { gameId } = req.params;
    if (!isValidObjectId(gameId)) {
      return res.status(400).json({ message: 'Invalid game id' });
    }

    const gameExists = await Game.exists({ _id: gameId });
    if (!gameExists) {
      return res.status(404).json({ message: 'Game not found' });
    }

    const sort = typeof req.query.sort === 'string' ? req.query.sort : 'activity';
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);
    const queryText = typeof req.query.q === 'string' ? req.query.q.trim() : '';

    const filter: Record<string, unknown> = { gameId: new mongoose.Types.ObjectId(gameId) };
    if (queryText) {
      filter.$or = [
        { title: { $regex: queryText, $options: 'i' } },
        { bodyMarkdown: { $regex: queryText, $options: 'i' } },
      ];
    }

    const sortOption: Record<string, 1 | -1> =
      sort === 'latest'
        ? { pinned: -1, createdAt: -1 }
        : sort === 'top'
          ? { pinned: -1, upvotes: -1, createdAt: -1 }
          : { pinned: -1, lastActivityAt: -1 };

    const [items, total] = await Promise.all([
      ForumTopic.find(filter)
        .sort(sortOption)
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('authorId', 'username role'),
      ForumTopic.countDocuments(filter),
    ]);

    const topics = items.map((topic) => ({
      ...topic.toObject(),
      viewerVote: getUserVote(topic.upvoters, topic.downvoters, req.user?.id),
      canModerate: canModerate(topic.authorId as mongoose.Types.ObjectId, req.user),
    }));

    res.json({
      items: topics,
      total,
      page,
      limit,
      sort,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching forum topics', error });
  }
});

router.post('/games/:gameId/topics', verifyToken, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { gameId } = req.params;
    const { title, bodyMarkdown } = req.body;

    if (!isValidObjectId(gameId)) {
      return res.status(400).json({ message: 'Invalid game id' });
    }

    if (!title || !String(title).trim() || !bodyMarkdown || !String(bodyMarkdown).trim()) {
      return res.status(400).json({ message: 'Topic title and body are required' });
    }

    const gameExists = await Game.exists({ _id: gameId });
    if (!gameExists) {
      return res.status(404).json({ message: 'Game not found' });
    }

    const topic = await ForumTopic.create({
      gameId,
      authorId: req.user.id,
      title: String(title).trim(),
      bodyMarkdown: String(bodyMarkdown),
      lastActivityAt: new Date(),
    });

    await topic.populate('authorId', 'username role');

    res.status(201).json({
      ...topic.toObject(),
      viewerVote: 0,
      canModerate: true,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating forum topic', error });
  }
});

router.get('/topics/:topicId', attachOptionalUser, async (req: AuthRequest, res) => {
  try {
    const { topicId } = req.params;
    if (!isValidObjectId(topicId)) {
      return res.status(400).json({ message: 'Invalid topic id' });
    }

    const topic = await ForumTopic.findById(topicId).populate('authorId', 'username role');
    if (!topic) {
      return res.status(404).json({ message: 'Topic not found' });
    }

    res.json({
      ...topic.toObject(),
      viewerVote: getUserVote(topic.upvoters, topic.downvoters, req.user?.id),
      canModerate: canModerate(topic.authorId as mongoose.Types.ObjectId, req.user),
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching topic', error });
  }
});

router.patch('/topics/:topicId', verifyToken, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { topicId } = req.params;
    if (!isValidObjectId(topicId)) {
      return res.status(400).json({ message: 'Invalid topic id' });
    }

    const topic = await ForumTopic.findById(topicId);
    if (!topic) {
      return res.status(404).json({ message: 'Topic not found' });
    }

    if (!canModerate(topic.authorId as mongoose.Types.ObjectId, req.user)) {
      return res.status(403).json({ message: 'You can only edit your own topics' });
    }

    const nextTitle = typeof req.body.title === 'string' ? req.body.title.trim() : '';
    const nextBody = typeof req.body.bodyMarkdown === 'string' ? req.body.bodyMarkdown : '';

    if (!nextTitle || !nextBody.trim()) {
      return res.status(400).json({ message: 'Topic title and body are required' });
    }

    topic.title = nextTitle;
    topic.bodyMarkdown = nextBody;
    topic.editedAt = new Date();
    await topic.save();
    await topic.populate('authorId', 'username role');

    res.json({
      ...topic.toObject(),
      viewerVote: getUserVote(topic.upvoters, topic.downvoters, req.user.id),
      canModerate: true,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating topic', error });
  }
});

router.delete('/topics/:topicId', verifyToken, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { topicId } = req.params;
    if (!isValidObjectId(topicId)) {
      return res.status(400).json({ message: 'Invalid topic id' });
    }

    const topic = await ForumTopic.findById(topicId);
    if (!topic) {
      return res.status(404).json({ message: 'Topic not found' });
    }

    if (!canModerate(topic.authorId as mongoose.Types.ObjectId, req.user)) {
      return res.status(403).json({ message: 'You can only delete your own topics' });
    }

    await Promise.all([
      ForumComment.deleteMany({ topicId: topic._id }),
      ForumReport.deleteMany({ topicId: topic._id }),
      ForumTopic.findByIdAndDelete(topic._id),
    ]);

    res.json({ message: 'Topic deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting topic', error });
  }
});

router.post('/topics/:topicId/pin', verifyToken, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { topicId } = req.params;
    if (!isValidObjectId(topicId)) {
      return res.status(400).json({ message: 'Invalid topic id' });
    }

    const topic = await ForumTopic.findById(topicId);
    if (!topic) {
      return res.status(404).json({ message: 'Topic not found' });
    }

    if (!canModerate(topic.authorId as mongoose.Types.ObjectId, req.user)) {
      return res.status(403).json({ message: 'Only author or admin can pin topics' });
    }

    topic.pinned = Boolean(req.body.pinned);
    await topic.save();
    await topic.populate('authorId', 'username role');

    res.json({
      ...topic.toObject(),
      viewerVote: getUserVote(topic.upvoters, topic.downvoters, req.user.id),
      canModerate: true,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error changing pinned state', error });
  }
});

router.post('/topics/:topicId/lock', verifyToken, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { topicId } = req.params;
    if (!isValidObjectId(topicId)) {
      return res.status(400).json({ message: 'Invalid topic id' });
    }

    const topic = await ForumTopic.findById(topicId);
    if (!topic) {
      return res.status(404).json({ message: 'Topic not found' });
    }

    if (!canModerate(topic.authorId as mongoose.Types.ObjectId, req.user)) {
      return res.status(403).json({ message: 'Only author or admin can lock topics' });
    }

    topic.locked = Boolean(req.body.locked);
    await topic.save();
    await topic.populate('authorId', 'username role');

    res.json({
      ...topic.toObject(),
      viewerVote: getUserVote(topic.upvoters, topic.downvoters, req.user.id),
      canModerate: true,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error changing locked state', error });
  }
});

router.put('/topics/:topicId/vote', verifyToken, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { topicId } = req.params;
    const vote = normalizeVote(req.body.value);
    if (!isValidObjectId(topicId)) {
      return res.status(400).json({ message: 'Invalid topic id' });
    }

    if (vote === null) {
      return res.status(400).json({ message: 'Vote value must be -1, 0, or 1' });
    }

    const topic = await ForumTopic.findById(topicId).populate('authorId', 'username role');
    if (!topic) {
      return res.status(404).json({ message: 'Topic not found' });
    }

    applyVoteToDoc(topic, req.user.id, vote);
    await topic.save();

    res.json({
      ...topic.toObject(),
      viewerVote: getUserVote(topic.upvoters, topic.downvoters, req.user.id),
      canModerate: canModerate(topic.authorId as mongoose.Types.ObjectId, req.user),
    });
  } catch (error) {
    res.status(500).json({ message: 'Error voting on topic', error });
  }
});

router.get('/topics/:topicId/comments', attachOptionalUser, async (req: AuthRequest, res) => {
  try {
    const { topicId } = req.params;
    if (!isValidObjectId(topicId)) {
      return res.status(400).json({ message: 'Invalid topic id' });
    }

    const sort = typeof req.query.sort === 'string' ? req.query.sort : 'oldest';
    const sortOption: Record<string, 1 | -1> =
      sort === 'latest'
        ? { createdAt: -1 }
        : sort === 'top'
          ? { upvotes: -1, createdAt: 1 }
          : { createdAt: 1 };

    const comments = await ForumComment.find({ topicId: new mongoose.Types.ObjectId(topicId) })
      .sort(sortOption)
      .populate('authorId', 'username role');

    const mapped = comments.map((comment) => ({
      ...comment.toObject(),
      viewerVote: getUserVote(comment.upvoters, comment.downvoters, req.user?.id),
      canModerate: canModerate(comment.authorId as mongoose.Types.ObjectId, req.user),
    }));

    res.json(mapped);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching comments', error });
  }
});

router.post('/topics/:topicId/comments', verifyToken, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { topicId } = req.params;
    const { bodyMarkdown } = req.body;

    if (!isValidObjectId(topicId)) {
      return res.status(400).json({ message: 'Invalid topic id' });
    }

    if (!bodyMarkdown || !String(bodyMarkdown).trim()) {
      return res.status(400).json({ message: 'Comment body is required' });
    }

    const topic = await ForumTopic.findById(topicId);
    if (!topic) {
      return res.status(404).json({ message: 'Topic not found' });
    }

    const topicAuthorId = topic.authorId as mongoose.Types.ObjectId;
    if (topic.locked && !canModerate(topicAuthorId, req.user)) {
      return res.status(423).json({ message: 'Topic is locked' });
    }

    const comment = await ForumComment.create({
      gameId: topic.gameId,
      topicId: topic._id,
      authorId: req.user.id,
      parentCommentId: null,
      depth: 0,
      bodyMarkdown: String(bodyMarkdown),
    });

    topic.commentCount += 1;
    topic.lastActivityAt = new Date();
    await topic.save();

    await comment.populate('authorId', 'username role');
    res.status(201).json({
      ...comment.toObject(),
      viewerVote: 0,
      canModerate: true,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating comment', error });
  }
});

router.post('/comments/:commentId/replies', verifyToken, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { commentId } = req.params;
    const { bodyMarkdown } = req.body;

    if (!isValidObjectId(commentId)) {
      return res.status(400).json({ message: 'Invalid comment id' });
    }

    if (!bodyMarkdown || !String(bodyMarkdown).trim()) {
      return res.status(400).json({ message: 'Reply body is required' });
    }

    const parentComment = await ForumComment.findById(commentId);
    if (!parentComment) {
      return res.status(404).json({ message: 'Parent comment not found' });
    }

    const topic = await ForumTopic.findById(parentComment.topicId);
    if (!topic) {
      return res.status(404).json({ message: 'Topic not found' });
    }

    const topicAuthorId = topic.authorId as mongoose.Types.ObjectId;
    if (topic.locked && !canModerate(topicAuthorId, req.user)) {
      return res.status(423).json({ message: 'Topic is locked' });
    }

    const reply = await ForumComment.create({
      gameId: parentComment.gameId,
      topicId: parentComment.topicId,
      authorId: req.user.id,
      parentCommentId: parentComment._id,
      depth: parentComment.depth + 1,
      bodyMarkdown: String(bodyMarkdown),
    });

    parentComment.replyCount += 1;
    topic.commentCount += 1;
    topic.lastActivityAt = new Date();

    await Promise.all([parentComment.save(), topic.save()]);

    await reply.populate('authorId', 'username role');
    res.status(201).json({
      ...reply.toObject(),
      viewerVote: 0,
      canModerate: true,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating reply', error });
  }
});

router.patch('/comments/:commentId', verifyToken, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { commentId } = req.params;
    const { bodyMarkdown } = req.body;
    if (!isValidObjectId(commentId)) {
      return res.status(400).json({ message: 'Invalid comment id' });
    }

    if (!bodyMarkdown || !String(bodyMarkdown).trim()) {
      return res.status(400).json({ message: 'Comment body is required' });
    }

    const comment = await ForumComment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    if (!canModerate(comment.authorId as mongoose.Types.ObjectId, req.user)) {
      return res.status(403).json({ message: 'You can only edit your own comments' });
    }

    comment.bodyMarkdown = String(bodyMarkdown);
    comment.editedAt = new Date();
    await comment.save();
    await comment.populate('authorId', 'username role');

    res.json({
      ...comment.toObject(),
      viewerVote: getUserVote(comment.upvoters, comment.downvoters, req.user.id),
      canModerate: true,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating comment', error });
  }
});

router.delete('/comments/:commentId', verifyToken, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { commentId } = req.params;
    if (!isValidObjectId(commentId)) {
      return res.status(400).json({ message: 'Invalid comment id' });
    }

    const comment = await ForumComment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    if (!canModerate(comment.authorId as mongoose.Types.ObjectId, req.user)) {
      return res.status(403).json({ message: 'You can only delete your own comments' });
    }

    comment.isDeleted = true;
    comment.bodyMarkdown = '[deleted]';
    comment.editedAt = new Date();
    await comment.save();

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting comment', error });
  }
});

router.put('/comments/:commentId/vote', verifyToken, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { commentId } = req.params;
    const vote = normalizeVote(req.body.value);
    if (!isValidObjectId(commentId)) {
      return res.status(400).json({ message: 'Invalid comment id' });
    }

    if (vote === null) {
      return res.status(400).json({ message: 'Vote value must be -1, 0, or 1' });
    }

    const comment = await ForumComment.findById(commentId).populate('authorId', 'username role');
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    applyVoteToDoc(comment, req.user.id, vote);
    await comment.save();

    res.json({
      ...comment.toObject(),
      viewerVote: getUserVote(comment.upvoters, comment.downvoters, req.user.id),
      canModerate: canModerate(comment.authorId as mongoose.Types.ObjectId, req.user),
    });
  } catch (error) {
    res.status(500).json({ message: 'Error voting on comment', error });
  }
});

router.post('/topics/:topicId/report', verifyToken, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { topicId } = req.params;
    if (!isValidObjectId(topicId)) {
      return res.status(400).json({ message: 'Invalid topic id' });
    }

    const reason = typeof req.body.reason === 'string' ? req.body.reason.trim() : '';
    const details = typeof req.body.details === 'string' ? req.body.details : '';
    if (!reason) {
      return res.status(400).json({ message: 'Reason is required' });
    }

    const topic = await ForumTopic.findById(topicId);
    if (!topic) {
      return res.status(404).json({ message: 'Topic not found' });
    }

    await ForumReport.create({
      gameId: topic.gameId,
      topicId: topic._id,
      commentId: null,
      targetType: 'topic',
      reporterId: req.user.id,
      reason,
      details,
      status: 'open',
    });

    topic.reportsCount += 1;
    await topic.save();

    res.status(201).json({ message: 'Topic reported successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error reporting topic', error });
  }
});

router.post('/comments/:commentId/report', verifyToken, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { commentId } = req.params;
    if (!isValidObjectId(commentId)) {
      return res.status(400).json({ message: 'Invalid comment id' });
    }

    const reason = typeof req.body.reason === 'string' ? req.body.reason.trim() : '';
    const details = typeof req.body.details === 'string' ? req.body.details : '';
    if (!reason) {
      return res.status(400).json({ message: 'Reason is required' });
    }

    const comment = await ForumComment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    await ForumReport.create({
      gameId: comment.gameId,
      topicId: comment.topicId,
      commentId: comment._id,
      targetType: 'comment',
      reporterId: req.user.id,
      reason,
      details,
      status: 'open',
    });

    comment.reportsCount += 1;
    await comment.save();

    res.status(201).json({ message: 'Comment reported successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error reporting comment', error });
  }
});

export default router;
