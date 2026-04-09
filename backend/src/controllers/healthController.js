'use strict';

function getHealth(_req, res) {
  res.status(200).json({ status: 'ok' });
}

module.exports = { getHealth };
