// middlewares/errorHandler.js
const logger = require('../utils/logger');

module.exports = (err, req, res, next) => {
  logger.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
};
