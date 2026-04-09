'use strict';

const express = require('express');

const { errorHandler } = require('./utils/errors');
const healthRoutes = require('./routes/healthRoutes');
const mobileRoutes = require('./routes/mobile');
const intersectionRoutes = require('./routes/intersection');

const app = express();

app.use(express.json());
app.use('/api', healthRoutes);
app.use('/api/mobile', mobileRoutes);
app.use('/api', intersectionRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use(errorHandler);

module.exports = app;
