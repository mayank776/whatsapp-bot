// worker.js

// This process's only job is to run the scheduler.
// It connects to the database and then starts the scheduler.

const { initializeScheduler } = require('./utils/scheduler');
const { pool, initializeDbSchema } = require('./utils/db');

console.log('[Worker] Starting worker process...');

// It's a good practice to run schema initialization from the worker
// on startup, though in production you might use a separate migration script.
initializeDbSchema()
    .then(() => {
        // Now that the DB is confirmed to be ready, start the scheduler.
        return initializeScheduler();
    })
    .then(() => {
        console.log('[Worker] Worker has started and scheduler is running.');
    })
    .catch(error => {
        console.error('[Worker] Failed to start worker:', error);
        process.exit(1);
    });

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('[Worker] SIGTERM signal received. Shutting down gracefully.');
    await pool.end(); // Close the database connection pool
    console.log('[Worker] Database pool closed. Exiting.');
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('[Worker] SIGINT signal received. Shutting down gracefully.');
    await pool.end();
    console.log('[Worker] Database pool closed. Exiting.');
    process.exit(0);
});
