// index.js

// --- Imports and Configuration ---
require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const { pool } = require('./utils/db'); // Import the pool for graceful shutdown and queries

const app = express();
const port = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN;

// --- Middleware ---
// Use express.json() for parsing JSON bodies. It's the modern replacement for bodyParser.json().
app.use(express.json());

// --- Routes ---

// Import route handlers. In a real app, these handlers would use the async db functions.
// For example, handleWebhookEvent might call db.addReminder().
const { handleWebhookVerification, handleWebhookEvent } = require('./routes/webhook');

// Webhook routes provided by the user
app.get('/webhook', (req, res) => handleWebhookVerification(req, res, VERIFY_TOKEN));
app.post('/webhook', handleWebhookEvent);

// A simple health check endpoint
app.get('/', (req, res) => {
    res.status(200).send('Webhook server is running and ready.');
});


// --- Server Start ---
app.listen(port, () => {
    console.log(`[Web Server] Listening for requests on port ${port}`);
    // The scheduler is correctly managed by the separate worker.js process.
});

// --- Graceful Shutdown ---
// This is crucial for ensuring database connections are closed properly when the server stops.
async function shutdown() {
    console.log('[Web Server] Shutting down gracefully...');
    try {
        await pool.end(); // Close the database connection pool
        console.log('[Web Server] Database pool closed.');
        process.exit(0);
    } catch (error) {
        console.error('[Web Server] Error during shutdown:', error);
        process.exit(1);
    }
}

process.on('SIGTERM', shutdown); // For platforms like Heroku, Render
process.on('SIGINT', shutdown);  // For local development (Ctrl+C)
