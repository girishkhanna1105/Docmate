const express = require('express');
const Disease = require('../models/Disease');
const router = express.Router();

// GET /api/locations/search - Search for locations
router.get('/search', async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }
    
    // Get unique locations from disease data
    const diseases = await Disease.find({
      $or: [
        { 'prevalenceByLocation.location.city': new RegExp(query, 'i') },
        { 'prevalenceByLocation.location.state': new RegExp(query, 'i') },
        { 'prevalenceByLocation.location.country': new RegExp(query, 'i') }
      ]
    });
    
    const locations = [];
    diseases.forEach(disease => {
      disease.prevalenceByLocation.forEach(loc => {
        const location = loc.location;
        const locationString = `${location.city}, ${location.state}, ${location.country}`;
        if (!locations.some(l => l.full === locationString)) {
          locations.push({
            city: location.city,
            state: location.state,
            country: location.country,
            full: locationString,
            coordinates: location.coordinates
          });
        }
      });
    });
    
    res.json({
      success: true,
      data: locations.slice(0, 10) // Limit to 10 results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to search locations'
    });
  }
});

module.exports = router;
