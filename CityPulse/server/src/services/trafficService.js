'use strict';
const axios = require('axios');
const logger = require('../utils/logger');

async function getCongestionStress(lat, lng) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return 0.5; // Fallback to medium stress

  try {
    // 🛰️ We query a very short path (100m) around the signal to get local "Flow"
    // Google Distance Matrix provides 'duration_in_traffic' which we compare to 'duration'
    const destLat = parseFloat(lat) + 0.005; // ~500m ahead
    const destLng = parseFloat(lng) + 0.005;

    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${lat},${lng}&destinations=${destLat},${destLng}&departure_time=now&traffic_model=best_guess&key=${apiKey}`;
    const response = await axios.get(url);
    
    // 🛡️ SAFETY CHECK: Ensure Google returned a valid matrix
    if (!response.data || !response.data.rows || !response.data.rows[0] || !response.data.rows[0].elements || !response.data.rows[0].elements[0]) {
      logger.warn(`Google Traffic: No route found for ${lat},${lng}. Using default stress.`);
      return 0.2;
    }

    const element = response.data.rows[0].elements[0];

    // If the distance is zero or route is invalid
    if (element.status !== 'OK' || !element.duration) return 0.2; 

    const normalSecs = element.duration.value;
    const trafficSecs = element.duration_in_traffic.value;

    // 📈 STRESS RATIO: How much slower is it than usual?
    // ratio 1.0 = normal, ratio 2.0+ = heavy congestion
    const ratio = trafficSecs / normalSecs;
    
    // Normalize to a 0.0 - 1.0 score
    // Below 1.2 = 0.1 (Easy) | Above 2.5 = 1.0 (Critical jam)
    let score = (ratio - 1.0) / 1.5;
    return Math.min(Math.max(score, 0.1), 1.0);

  } catch (error) {
    logger.error(`Satellite Traffic Fetch Failed: ${error.message}`);
    return 0.3; // Safe fallback
  }
}

module.exports = { getCongestionStress };
