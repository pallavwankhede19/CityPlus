'use strict';

const express = require('express');
const { ingestIntersectionData, getAllSignals, bulkIngestData } = require('../controllers/intersectionController');

const router = express.Router();

router.post('/intersection-data', ingestIntersectionData);
router.post('/bulk-ingest', bulkIngestData);
router.get('/all-signals', getAllSignals);

module.exports = router;
