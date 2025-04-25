const express = require('express');
const { check, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const QuizAttempt = require('../models/QuizAttempt');
const Quiz = require('../models/Quiz');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

// @route   POST /api/attempts
// @desc    Submit a quiz attempt
// @access  Private
router.post(
  '/',
  [
    protect,
    [
      check('answers', 'Answers are required').isArray(),
      check('score', 'Score is required').isNumeric(),
      check('timeSpent', 'Time spent is required').isNumeric(),
      check('percentage', 'Percentage is required').isNumeric(),
      check('quizId', 'Quiz ID is required').notEmpty(),
    ],
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('Validation errors:', errors.array());
        return res.status(400).json({ errors: errors.array() });
      }

      const { answers, score, timeSpent, percentage, quizId } = req.body;
      console.log('Received attempt data:', { quizId, score, timeSpent, percentage });

      // Validate MongoDB ObjectId
      if (!mongoose.Types.ObjectId.isValid(quizId)) {
        console.log('Invalid Quiz ID format:', quizId);
        return res.status(400).json({ 
          message: 'Invalid Quiz ID format',
          details: 'Quiz ID must be a valid MongoDB ObjectId'
        });
      }

      // Get quiz to validate
      const quiz = await Quiz.findById(quizId);
      if (!quiz) {
        console.log('Quiz not found:', quizId);
        return res.status(404).json({ message: 'Quiz not found' });
      }

      console.log('Found quiz:', quiz.title);

      // Create attempt
      const attempt = await QuizAttempt.create({
        user: req.user.id,
        quiz: quizId,
        answers,
        score,
        timeSpent,
        percentage
      });

      console.log('Created attempt:', attempt._id);

      // Update quiz statistics
      await Quiz.findByIdAndUpdate(quizId, {
        $inc: { totalAttempts: 1 },
        $set: {
          averageScore: ((quiz.averageScore || 0) * (quiz.totalAttempts || 0) + percentage) / ((quiz.totalAttempts || 0) + 1)
        }
      });

      console.log('Updated quiz statistics');
      res.status(201).json(attempt);
    } catch (error) {
      console.error('Quiz attempt submission error:', error);
      res.status(500).json({ 
        message: 'Server error', 
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
);

// @route   GET /api/attempts/user
// @desc    Get all attempts for current user
// @access  Private
router.get('/user', protect, async (req, res) => {
  try {
    const attempts = await QuizAttempt.find({ user: req.user.id })
      .populate('quiz', 'title description difficulty')
      .sort({ completedAt: -1 });

    res.json(attempts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/attempts/:id
// @desc    Get attempt by ID
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const attempt = await QuizAttempt.findById(req.params.id)
      .populate('quiz', 'title description difficulty')
      .populate('user', 'username');

    if (!attempt) {
      return res.status(404).json({ message: 'Attempt not found' });
    }

    // Only allow users to view their own attempts
    if (attempt.user._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json(attempt);
  } catch (error) {
    console.error(error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Attempt not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 