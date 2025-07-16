// worker.js

// This process's only job is to run the scheduler.
// It connects to the database and then starts the scheduler.

const { initializeScheduler } = require('./utils/scheduler');
const { pool, initializeDbSchema } = require('./utils/db');
const logger = require('./utils/logger');

logger.info('[Worker] Starting worker process...');

initializeDbSchema()
    .then(() => initializeScheduler())
    .then(() => {
        logger.info('[Worker] Worker has started and scheduler is running.');
    })
    .catch(error => {
        logger.error('[Worker] Failed to start worker:', error);
        process.exit(1);
    });

process.on('SIGTERM', async () => {
    logger.info('[Worker] SIGTERM signal received. Shutting down gracefully.');
    await pool.end();
    logger.info('[Worker] Database pool closed. Exiting.');
    process.exit(0);
});

process.on('SIGINT', async () => {
    logger.info('[Worker] SIGINT signal received. Shutting down gracefully.');
    await pool.end();
    logger.info('[Worker] Database pool closed. Exiting.');
    process.exit(0);
});
