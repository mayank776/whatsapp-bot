// Imports and Configuration
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = process.env.PORT || 3000;
require('dotenv').config();

// Your verify token. This can be any arbitrary string.
const VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN; // IMPORTANT: Change this!

// Middleware
app.use(bodyParser.json()); // To parse JSON bodies

// =========================
// Routes
// =========================

const { handleWebhookVerification, handleWebhookEvent } = require('./routes/webhook');

app.get('/webhook', (req, res) => handleWebhookVerification(req, res, VERIFY_TOKEN));
app.post('/webhook', handleWebhookEvent);

// =========================
// Server Start
// =========================

app.listen(port, () => {
    console.log(`Webhook server listening on port ${port}`);
});