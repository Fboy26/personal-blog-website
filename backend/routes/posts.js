const express = require('express');
const router = express.Router();
const Post = require('../models/post');
const NodeCache = require('node-cache');

const cache = new NodeCache({ stdTTL: 300, checkperiod: 320 });

const validatePost = (req, res, next) => {
  const { title, content } = req.body;
  if (!title || !content || typeof title !== 'string' || typeof content !== 'string') {
    return res.status(400).json({ message: 'Title and content are required and must be strings' });
  }
  next();
};

router.get('/', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 6;
  const skip = (page - 1) * limit;
  const cacheKey = `posts_page_${page}_limit_${limit}`;
  const cachedPosts = cache.get(cacheKey);

  if (cachedPosts) {
    return res.json(cachedPosts);
  }

  try {
    const posts = await Post.find()
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    cache.set(cacheKey, posts);
    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST and DELETE routes unchanged
router.post('/', validatePost, async (req, res) => {
  const { title, content } = req.body;
  const newPost = new Post({ title, content });

  try {
    const savedPost = await newPost.save();
    cache.flushAll(); // Clear all cache on new post
    res.status(201).json(savedPost);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deletedPost = await Post.findByIdAndDelete(req.params.id).lean();
    if (!deletedPost) {
      return res.status(404).json({ message: 'Post not found' });
    }
    cache.flushAll(); // Clear all cache on delete
    res.json({ message: 'Post deleted successfully', deletedPost });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;



