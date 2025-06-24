const mongoose = require('mongoose');

const chatSessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true
  },
  userInfo: {
    name: String,
    age: Number,
    gender: String
  },
  messages: [{
    sender: {
      type: String,
      enum: ['user', 'bot'],
      required: true
    },
    message: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    messageType: {
      type: String,
      enum: ['text', 'symptom_check', 'recommendation'],
      default: 'text'
    }
  }],
  symptoms: [{
    symptom: String,
    severity: {
      type: String,
      enum: ['Mild', 'Moderate', 'Severe']
    },
    duration: String
  }],
  assessment: {
    possibleConditions: [String],
    recommendations: [String],
    urgencyLevel: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Emergency']
    },
    shouldSeeDoctor: Boolean
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ChatSession', chatSessionSchema);