import express from 'express';
import { BlogPost } from '../models/BlogPost.js';
import { optionalVerifyToken, verifyToken, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

const requireAdmin = (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden: Admin access required' });
  }

  next();
};

router.get('/', optionalVerifyToken, async (req: AuthRequest, res) => {
  try {
    const showAll = req.user?.role === 'admin' && req.query.includeAll === 'true';
    const filter = showAll ? {} : { published: true };

    const posts = await BlogPost.find(filter)
      .sort({ publishedAt: -1, createdAt: -1 })
      .populate('createdBy', 'username')
      .populate('updatedBy', 'username');

    res.json(posts);
  } catch (error) {
    console.error('✗ Error fetching blog posts:', error);
    res.status(500).json({ message: 'Error fetching blog posts', error });
  }
});

router.get('/:id', optionalVerifyToken, async (req: AuthRequest, res) => {
  try {
    const post = await BlogPost.findById(req.params.id)
      .populate('createdBy', 'username')
      .populate('updatedBy', 'username');

    if (!post) {
      return res.status(404).json({ message: 'Blog post not found' });
    }

    if (!post.published && req.user?.role !== 'admin') {
      return res.status(404).json({ message: 'Blog post not found' });
    }

    res.json(post);
  } catch (error) {
    console.error('✗ Error fetching blog post:', error);
    res.status(500).json({ message: 'Error fetching blog post', error });
  }
});

router.post('/', verifyToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { title, summary, content, tags, published } = req.body;

    if (!title || !content) {
      return res.status(400).json({ message: 'Title and content are required' });
    }

    const normalizedTags = Array.isArray(tags)
      ? tags
      : typeof tags === 'string'
        ? tags.split(',').map((tag: string) => tag.trim()).filter(Boolean)
        : [];

    const post = new BlogPost({
      title,
      summary: summary ?? '',
      content,
      tags: normalizedTags,
      published: published !== undefined ? Boolean(published) : true,
      publishedAt: published === false ? null : new Date(),
      createdBy: req.user.id,
      updatedBy: req.user.id,
    });

    await post.save();
    await post.populate('createdBy', 'username');
    await post.populate('updatedBy', 'username');

    res.status(201).json(post);
  } catch (error) {
    console.error('✗ Error creating blog post:', error);
    res.status(500).json({ message: 'Error creating blog post', error });
  }
});

router.patch('/:id', verifyToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const post = await BlogPost.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Blog post not found' });
    }

    const { title, summary, content, tags, published } = req.body;

    if (title !== undefined) post.title = title;
    if (summary !== undefined) post.summary = summary;
    if (content !== undefined) post.content = content;
    if (published !== undefined) {
      post.published = Boolean(published);
      if (post.published && !post.publishedAt) {
        post.publishedAt = new Date();
      }
    }

    if (tags !== undefined) {
      post.tags = Array.isArray(tags)
        ? tags
        : typeof tags === 'string'
          ? tags.split(',').map((tag: string) => tag.trim()).filter(Boolean)
          : [];
    }

    post.updatedBy = req.user.id as any;

    await post.save();
    await post.populate('createdBy', 'username');
    await post.populate('updatedBy', 'username');

    res.json(post);
  } catch (error) {
    console.error('✗ Error updating blog post:', error);
    res.status(500).json({ message: 'Error updating blog post', error });
  }
});

router.delete('/:id', verifyToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const post = await BlogPost.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Blog post not found' });
    }

    await BlogPost.findByIdAndDelete(req.params.id);
    res.json({ message: 'Blog post deleted successfully' });
  } catch (error) {
    console.error('✗ Error deleting blog post:', error);
    res.status(500).json({ message: 'Error deleting blog post', error });
  }
});

export default router;
