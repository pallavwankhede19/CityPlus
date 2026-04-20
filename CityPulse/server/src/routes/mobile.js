'use strict';

const express = require('express');
const { getRouteSignals, scoutSignalsAlongPolyline } = require('../controllers/mobileController');

const router = express.Router();

router.post('/route', getRouteSignals);
router.post('/scout-signals', scoutSignalsAlongPolyline);

module.exports = router;
