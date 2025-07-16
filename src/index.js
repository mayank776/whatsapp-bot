// index.js

// --- Imports and Configuration ---
require('dotenv').config(); // Load environment variables from .env file (only here)
const express = require('express');
const helmet = require('helmet');
const { pool } = require('./utils/db');
const logger = require('./utils/logger');

const requestLogger = require('./middlewares/requestLogger');
const errorHandler = require('./middlewares/errorHandler');

const app = express();
const port = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN;

// --- Middleware ---
app.use(helmet());
app.use(express.json());
app.use(requestLogger);

// --- Routes ---
const { handleWebhookVerification, handleWebhookEvent } = require('./routes/webhook');
app.get('/webhook', (req, res) => handleWebhookVerification(req, res, VERIFY_TOKEN));
app.post('/webhook', handleWebhookEvent);
app.get('/', (req, res) => {
    res.status(200).send('Webhook server is running and ready.');
});

// --- Error Handler ---
app.use(errorHandler);

// --- Server Start ---
app.listen(port, () => {
    logger.info(`[Web Server] Listening for requests on port ${port}`);
    // The scheduler is correctly managed by the separate worker.js process.
});

// --- Graceful Shutdown ---
async function shutdown() {
    logger.info('[Web Server] Shutting down gracefully...');
    try {
        await pool.end();
        logger.info('[Web Server] Database pool closed.');
        process.exit(0);
    } catch (error) {
        logger.error('[Web Server] Error during shutdown:', error);
        process.exit(1);
    }
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
