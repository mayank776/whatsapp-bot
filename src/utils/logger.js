
// utils/logger.js
const { createLogger, format, transports } = require('winston');
const moment = require('moment-timezone');

// Custom timestamp format for IST
const istTimestamp = format((info) => {
  info.timestamp = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
  return info;
});

const logger = createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: format.combine(
    istTimestamp(),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.simple()
      )
    })
  ]
});

module.exports = logger;
