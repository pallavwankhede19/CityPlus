'use strict';

const express = require('express');
const { ingestIntersectionData } = require('../controllers/intersectionController');

const router = express.Router();

router.post('/intersection-data', ingestIntersectionData);

module.exports = router;
