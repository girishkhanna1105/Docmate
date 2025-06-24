const express = require('express');
const Disease = require('../models/Disease');
const router = express.Router();

// GET /api/diseases - Get all diseases with optional filters
router.get('/', async (req, res) => {
  try {
    const { location, category, severity, limit = 3, page = 1, viewMore = false } = req.query;
    
    let query = { isActive: true };
    
    // Filter by category
    if (category) {
      query.category = category;
    }
    
    // Filter by severity
    if (severity) {
      query.severity = severity;
    }

    // Set limit based on viewMore parameter
    const actualLimit = viewMore === 'true' ? parseInt(limit) : 3;
    
    let diseases;
    let totalCount = 0;
    
    if (location) {
      // Get total count for pagination info
      const totalLocationDiseases = await Disease.countDocuments({
        ...query,
        $or: [
          { 'prevalenceByLocation.location.city': new RegExp(location, 'i') },
          { 'prevalenceByLocation.location.state': new RegExp(location, 'i') },
          { 'prevalenceByLocation.location.country': new RegExp(location, 'i') }
        ]
      });

      // First, try to find diseases that have exact location match
      let exactLocationDiseases = await Disease.find({
        ...query,
        $or: [
          { 'prevalenceByLocation.location.city': new RegExp(location, 'i') },
          { 'prevalenceByLocation.location.state': new RegExp(location, 'i') },
          { 'prevalenceByLocation.location.country': new RegExp(location, 'i') }
        ]
      })
      .sort({ 'prevalenceByLocation.cases': -1 })
      .skip((parseInt(page) - 1) * actualLimit)
      .limit(actualLimit);

      // If we don't have enough diseases for the location and it's the first page
      if (exactLocationDiseases.length < actualLimit && parseInt(page) === 1) {
        const remainingLimit = actualLimit - exactLocationDiseases.length;
        
        // Get diseases that don't have this location but are still relevant
        const generalDiseases = await Disease.find({
          ...query,
          _id: { $nin: exactLocationDiseases.map(d => d._id) } // Exclude already found diseases
        })
        .sort({ createdAt: -1 })
        .limit(remainingLimit);

        // Combine exact location diseases with general diseases
        diseases = [...exactLocationDiseases, ...generalDiseases];
        totalCount = totalLocationDiseases + await Disease.countDocuments({
          ...query,
          _id: { $nin: exactLocationDiseases.map(d => d._id) }
        });
      } else {
        diseases = exactLocationDiseases;
        totalCount = totalLocationDiseases;
      }
    } else {
      // Get total count for pagination
      totalCount = await Disease.countDocuments(query);
      
      diseases = await Disease.find(query)
        .sort({ createdAt: -1 })
        .limit(actualLimit)
        .skip((parseInt(page) - 1) * actualLimit);
    }

    // Calculate if there are more diseases available
    const hasMore = totalCount > (parseInt(page) * actualLimit);
    const remainingCount = Math.max(0, totalCount - (parseInt(page) * actualLimit));

    res.json({
      success: true,
      data: diseases,
      count: diseases.length,
      totalCount: totalCount,
      page: parseInt(page),
      limit: actualLimit,
      hasMore: hasMore,
      remainingCount: remainingCount,
      isViewMore: viewMore === 'true'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch diseases',
      details: error.message
    });
  }
});

// GET /api/diseases/top/:location - Get top 3 diseases for a specific location
router.get('/top/:location', async (req, res) => {
  try {
    const { location } = req.params;
    
    const topDiseases = await Disease.find({
      isActive: true,
      $or: [
        { 'prevalenceByLocation.location.city': new RegExp(location, 'i') },
        { 'prevalenceByLocation.location.state': new RegExp(location, 'i') },
        { 'prevalenceByLocation.location.country': new RegExp(location, 'i') }
      ]
    })
    .sort({ 'prevalenceByLocation.cases': -1 })
    .limit(3);

    // Get total count to check if there are more diseases
    const totalCount = await Disease.countDocuments({
      isActive: true,
      $or: [
        { 'prevalenceByLocation.location.city': new RegExp(location, 'i') },
        { 'prevalenceByLocation.location.state': new RegExp(location, 'i') },
        { 'prevalenceByLocation.location.country': new RegExp(location, 'i') }
      ]
    });

    res.json({
      success: true,
      data: topDiseases,
      location: location,
      count: topDiseases.length,
      totalCount: totalCount,
      hasMore: totalCount > 3
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch top diseases'
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