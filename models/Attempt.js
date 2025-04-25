const mongoose = require('mongoose');

const attemptSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  quiz: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true
  },
  answers: [{
    questionIndex: {
      type: Number,
      required: true
    },
    selectedOption: {
      type: Number,
      required: true
    },
    isCorrect: {
      type: Boolean,
      required: true
    }
  }],
  score: {
    type: Number,
    required: true,
    min: 0
  },
  timeSpent: {
    type: Number,
    required: true,
    min: 0
  },
  percentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  startedAt: {
    type: Date,
    required: true
  },
  completedAt: {
    type: Date,
    required: true
  }
}, {
  timestamps: true
});

// Method to update user statistics
attemptSchema.methods.updateUserStats = async function() {
  const user = await this.model('User').findById(this.user);
  if (user) {
    user.quizzesTaken = (user.quizzesTaken || 0) + 1;
    user.totalScore = (user.totalScore || 0) + this.percentage;
    user.averageScore = user.totalScore / user.quizzesTaken;
    await user.save();
  }
};

// Post-save hook to update user stats
attemptSchema.post('save', async function() {
  await this.updateUserStats();
});

const Attempt = mongoose.model('Attempt', attemptSchema);

module.exports = Attempt; 