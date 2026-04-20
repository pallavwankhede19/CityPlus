'use strict';
const express = require('express');
const router = express.Router();
const trafficService = require('../services/trafficService');

router.get('/stress', async (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) {
    return res.status(400).json({ error: 'Latitude and Longitude are required' });
  }

  const stressScore = await trafficService.getCongestionStress(lat, lng);
  res.json({ lat, lng, stress_score: stressScore });
});

module.exports = router;
