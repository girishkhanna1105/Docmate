const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  patientInfo: {
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true
    },
    age: {
      type: Number,
      required: true
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other'],
      required: true
    }
  },
  appointmentDetails: {
    preferredDate: {
      type: Date,
      required: true
    },
    preferredTime: {
      type: String,
      required: true
    },
    consultationType: {
      type: String,
      enum: ['Video Call'],
      default: 'Video Call'
    },
    duration: {
      type: Number, // in minutes
      default: 30
    }
  },
  medicalInfo: {
    symptoms: [String],
    urgency: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Emergency'],
      default: 'Medium'
    },
    previousConditions: [String],
    medications: [String],
    allergies: [String]
  },
  doctorAssigned: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor'
  },
  status: {
    type: String,
    enum: ['Pending', 'Confirmed', 'Completed', 'Cancelled', 'Rescheduled'],
    default: 'Pending'
  },
  meetingLink: String,
  notes: String,
  prescription: String
}, {
  timestamps: true
});

module.exports = mongoose.model('Appointment', appointmentSchema);