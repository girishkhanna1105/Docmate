const express = require('express');
const Disease = require('../models/Disease');
const router = express.Router();

// GET /api/symptoms/common - Get common symptoms
router.get('/common', async (req, res) => {
  try {
    // Aggregate common symptoms from diseases
    const result = await Disease.aggregate([
      { $unwind: '$symptoms' },
      { $group: { _id: '$symptoms', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 50 }
    ]);
    
    const commonSymptoms = result.map(item => ({
      symptom: item._id,
      frequency: item.count
    }));
    
    res.json({
      success: true,
      data: commonSymptoms
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch common symptoms'
    });
  }
});

// POST /api/symptoms/check - Check symptoms against diseases
router.post('/check', async (req, res) => {
  try {
    const { symptoms } = req.body;
    
    if (!symptoms || !Array.isArray(symptoms)) {
      return res.status(400).json({
        success: false,
        error: 'Symptoms array is required'
      });
    }
    
    // Find diseases matching the symptoms
    const matchingDiseases = await Disease.find({
      symptoms: { $in: symptoms.map(s => new RegExp(s, 'i')) }
    });
    
    // Calculate match scores
    const diseasesWithScores = matchingDiseases.map(disease => {
      const matchedSymptoms = disease.symptoms.filter(symptom =>
        symptoms.some(userSymptom => 
          symptom.toLowerCase().includes(userSymptom.toLowerCase()) ||
          userSymptom.toLowerCase().includes(symptom.toLowerCase())
        )
      );
      
      const score = (matchedSymptoms.length / disease.symptoms.length) * 100;
      
      return {
        disease: disease.name,
        description: disease.description,
        matchedSymptoms,
        score: Math.round(score),
        severity: disease.severity,
        category: disease.category
      };
    });
    
    // Sort by score
    diseasesWithScores.sort((a, b) => b.score - a.score);
    
    res.json({
      success: true,
      data: diseasesWithScores.slice(0, 5), // Top 5 matches
      inputSymptoms: symptoms
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to check symptoms'
    });
  }
});

module.exports = router;