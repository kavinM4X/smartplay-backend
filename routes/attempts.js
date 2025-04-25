const express = require('express');
const { check, validationResult } = require('express-validator');
const Attempt = require('../models/Attempt');
const Quiz = require('../models/Quiz');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

// @route   POST /api/attempts
// @desc    Submit a quiz attempt
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { quizId, answers, score, timeSpent, percentage, completedAt } = req.body;

    if (!quizId || !answers || score === undefined || !timeSpent) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Create attempt
    const attempt = await Attempt.create({
      user: req.user.id,
      quiz: quizId,
      answers,
      score,
      timeSpent,
      percentage,
      completedAt: completedAt || new Date(),
      startedAt: new Date(new Date(completedAt || Date.now()) - timeSpent * 1000)
    });

    // Update quiz statistics
    await quiz.updateStatistics(percentage);

    res.status(201).json(attempt);
  } catch (error) {
    console.error('Error submitting attempt:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/attempts/quiz/:quizId
// @desc    Get all attempts for a quiz
// @access  Private (admin or quiz creator)
router.get('/quiz/:quizId', protect, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.quizId);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Check if user is admin or quiz creator
    if (quiz.creator.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ message: 'Not authorized' });
    }

    const attempts = await Attempt.find({ quiz: req.params.quizId })
      .populate('user', 'username')
      .sort('-completedAt');

    res.json(attempts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/attempts/user
// @desc    Get all attempts by current user
// @access  Private
router.get('/user', protect, async (req, res) => {
  try {
    const attempts = await Attempt.find({ user: req.user.id })
      .populate('quiz', 'title')
      .sort('-completedAt');

    res.json(attempts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/attempts/:id
// @desc    Get attempt by ID
// @access  Private (attempt owner or admin)
router.get('/:id', protect, async (req, res) => {
  try {
    const attempt = await Attempt.findById(req.params.id)
      .populate('quiz')
      .populate('user', 'username');

    if (!attempt) {
      return res.status(404).json({ message: 'Attempt not found' });
    }

    // Check if user is attempt owner or admin
    if (attempt.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ message: 'Not authorized' });
    }

    res.json(attempt);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 