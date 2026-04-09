'use strict';

const express = require('express');
const { getRouteSignals } = require('../controllers/mobileController');

const router = express.Router();

router.post('/route', getRouteSignals);

module.exports = router;
