const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true
  },
  options: [{
    text: {
      type: String,
      required: true
    },
    isCorrect: {
      type: Boolean,
      required: true
    }
  }]
});

const quizSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    required: true
  },
  timeLimit: {
    type: Number,
    required: true,
    min: 1
  },
  questions: [questionSchema],
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  totalAttempts: {
    type: Number,
    default: 0
  },
  averageScore: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Virtual for calculating total questions
quizSchema.virtual('totalQuestions').get(function() {
  return this.questions.length;
});

// Method to update quiz statistics
quizSchema.methods.updateStatistics = async function(score) {
  this.totalAttempts = (this.totalAttempts || 0) + 1;
  this.averageScore = ((this.averageScore || 0) * (this.totalAttempts - 1) + score) / this.totalAttempts;
  await this.save();
};

const Quiz = mongoose.model('Quiz', quizSchema);

module.exports = Quiz; 