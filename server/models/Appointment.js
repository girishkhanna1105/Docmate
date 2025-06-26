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
  preferredDate: String,
  preferredTime: String,
  consultationType: {
    type: String,
    enum: [
      'General Physician',
      'Cardiologist',
      'Dermatologist',
      'ENT',
      'Pediatrics',
      'Neurology',
      'Psychiatry',
      'Orthopedics',
      'Surgery',
      'Gynecology'
    ]
  },
  videoCallLink: String
}
,
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