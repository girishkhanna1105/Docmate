const mongoose = require('mongoose');

const diseaseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  symptoms: [{
    type: String,
    required: true
  }],
  causes: [{
    type: String
  }],
  prevention: [{
    type: String
  }],
  treatment: {
    type: String
  },
  severity: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium'
  },
  category: {
    type: String,
    required: true,
    enum: ['Infectious', 'Chronic', 'Genetic', 'Environmental', 'Other']
  },
  prevalenceByLocation: [{
    location: {
      city: String,
      state: String,
      country: String,
      coordinates: {
        lat: Number,
        lng: Number
      }
    },
    cases: Number,
    trend: {
      type: String,
      enum: ['Increasing', 'Decreasing', 'Stable'],
      default: 'Stable'
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for location-based queries
diseaseSchema.index({ 'prevalenceByLocation.location.city': 1 });
diseaseSchema.index({ 'prevalenceByLocation.location.state': 1 });
diseaseSchema.index({ category: 1, severity: 1 });

module.exports = mongoose.model('Disease', diseaseSchema);