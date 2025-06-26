const express = require('express');
const Appointment = require('../models/Appointment');
const router = express.Router();

// POST /api/appointments - Book new appointment
router.post('/', async (req, res) => {
  console.log("📨 Appointment incoming:", req.body); // Debug log
  try {
    const newAppointment = new Appointment(req.body);
    await newAppointment.save();
    res.status(201).json({ success: true, data: newAppointment });
  } catch (err) {
    console.error("❌ Booking error:", err); // Error log
    res.status(500).json({ success: false, message: err.message });
  }
});
router.get('/patient/:email', async (req, res) => {
  console.log("🔍 Email received in request:", req.params.email); // Add this
  try {
    const appointments = await Appointment.find({ 'patientInfo.email': req.params.email });
    console.log("📦 Found appointments:", appointments);
    res.json({ success: true, data: appointments });
  } catch (err) {
    console.error("❌ Error fetching appointments:", err);
    res.status(500).json({ success: false, message: 'Failed to fetch appointments' });
  }
});



// GET /api/appointments/:id - Get appointment by ID
router.get('/:id', async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('doctorAssigned');
    
    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }

    res.json({
      success: true,
      data: appointment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch appointment'
    });
  }
});

// PUT /api/appointments/:id/status - Update appointment status
router.put('/:id/status', async (req, res) => {
  try {
    const { status, meetingLink, notes } = req.body;
    
    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      { status, meetingLink, notes },
      { new: true }
    );
    
    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }

    res.json({
      success: true,
      data: appointment,
      message: 'Appointment updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update appointment'
    });
  }
});

module.exports = router;
