const express = require('express');
const Appointment = require('../models/Appointment');
const router = express.Router();

// POST /api/appointments - Book new appointment
router.post('/', async (req, res) => {
  try {
    const appointment = new Appointment(req.body);
    await appointment.save();
    
    // Here you would typically send confirmation email
    // await sendConfirmationEmail(appointment);
    
    res.status(201).json({
      success: true,
      data: appointment,
      message: 'Appointment booked successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: 'Failed to book appointment',
      details: error.message
    });
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
