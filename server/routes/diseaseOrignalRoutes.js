const express = require('express');
const Disease = require('../models/Disease');
const router = express.Router();

// GET /api/diseases - Get all diseases with optional filters
router.get('/', async (req, res) => {
  try {
    const { location, category, severity, limit = 10, page = 1 } = req.query;
    
    let query = { isActive: true };
    
    // Filter by category
    if (category) {
      query.category = category;
    }
    
    // Filter by severity
    if (severity) {
      query.severity = severity;
    }
    
    let diseases;
    
    if (location) {
      // Find diseases by location (city, state, or country)
      diseases = await Disease.find({
        ...query,
        $or: [
          { 'prevalenceByLocation.location.city': new RegExp(location, 'i') },
          { 'prevalenceByLocation.location.state': new RegExp(location, 'i') },
          { 'prevalenceByLocation.location.country': new RegExp(location, 'i') }
        ]
      })
      .sort({ 'prevalenceByLocation.cases': -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    } else {
      diseases = await Disease.find(query)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));
    }

    res.json({
      success: true,
      data: diseases,
      count: diseases.length,
      page: parseInt(page)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch diseases',
      details: error.message
    });
  }
});

// GET /api/diseases/trending/:location - Get trending diseases for a location
router.get('/trending/:location', async (req, res) => {
  try {
    const { location } = req.params;
    
    const trendingDiseases = await Disease.find({
      isActive: true,
      $or: [
        { 'prevalenceByLocation.location.city': new RegExp(location, 'i') },
        { 'prevalenceByLocation.location.state': new RegExp(location, 'i') }
      ],
      'prevalenceByLocation.trend': 'Increasing'
    })
    .sort({ 'prevalenceByLocation.cases': -1 })
    .limit(5);

    res.json({
      success: true,
      data: trendingDiseases,
      location: location
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trending diseases'
    });
  }
});

// GET /api/diseases/:id - Get disease by ID
router.get('/:id', async (req, res) => {
  try {
    const disease = await Disease.findById(req.params.id);
    
    if (!disease) {
      return res.status(404).json({
        success: false,
        error: 'Disease not found'
      });
    }

    res.json({
      success: true,
      data: disease
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch disease'
    });
  }
});

// POST /api/diseases - Create new disease (Admin only)
router.post('/', async (req, res) => {
  try {
    const disease = new Disease(req.body);
    await disease.save();
    
    res.status(201).json({
      success: true,
      data: disease,
      message: 'Disease created successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: 'Failed to create disease',
      details: error.message
    });
  }
});

module.exports = router;