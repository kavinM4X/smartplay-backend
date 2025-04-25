const express = require('express');
const { check, validationResult } = require('express-validator');
const Quiz = require('../models/Quiz');
const { protect, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();

// @route   GET /api/quizzes
// @desc    Get all published quizzes
// @access  Public
router.get('/', async (req, res) => {
  try {
    console.log('Fetching all quizzes');
    const quizzes = await Quiz.find()
      .populate('creator', 'username')
      .select('title description timeLimit difficulty questions category creator createdAt')
      .sort({ createdAt: -1 });

    console.log(`Found ${quizzes.length} quizzes:`, quizzes);
    res.json(quizzes);
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/quizzes
// @desc    Create a new quiz
// @access  Private
router.post(
  '/',
  [
    protect,
    [
      check('title', 'Title is required').notEmpty(),
      check('description', 'Description is required').notEmpty(),
      check('timeLimit', 'Time limit must be between 1 and 180 minutes').isInt({
        min: 1,
        max: 180,
      }),
      check('questions', 'At least one question is required').isArray({ min: 1 }),
      check('category', 'Category is required').notEmpty(),
      check('difficulty', 'Difficulty is required').notEmpty(),
    ],
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const quiz = await Quiz.create({
        ...req.body,
        creator: req.user.id,
      });

      res.status(201).json(quiz);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   GET /api/quizzes/:id
// @desc    Get quiz by ID
// @access  Public (but hide correct answers)
router.get('/:id', async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id)
      .select('-questions.correctAnswer')
      .populate('creator', 'username');

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    res.json(quiz);
  } catch (error) {
    console.error(error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Quiz not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/quizzes/:id
// @desc    Update quiz
// @access  Private (creator only)
router.put('/:id', protect, async (req, res) => {
  try {
    let quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Make sure user is quiz creator or admin
    if (quiz.creator.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ message: 'Not authorized' });
    }

    quiz = await Quiz.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );

    res.json(quiz);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/quizzes/:id
// @desc    Delete quiz
// @access  Private (creator or admin only)
router.delete('/:id', protect, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Make sure user is quiz creator or admin
    if (quiz.creator.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ message: 'Not authorized' });
    }

    await quiz.remove();

    res.json({ message: 'Quiz removed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/quizzes/user/:userId
// @desc    Get all quizzes created by a user
// @access  Public
router.get('/user/:userId', async (req, res) => {
  try {
    const quizzes = await Quiz.find({
      creator: req.params.userId,
      isPublished: true,
    })
      .select('-questions.correctAnswer')
      .populate('creator', 'username');
    res.json(quizzes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/quizzes/user
// @desc    Get all quizzes created by current user
// @access  Private
router.get('/user', protect, async (req, res) => {
  try {
    const quizzes = await Quiz.find({ creator: req.user.id })
      .populate('creator', 'username');
    res.json(quizzes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 