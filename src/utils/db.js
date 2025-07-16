// db.js
// dotenv loaded only in index.js
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const logger = require('./logger');

// --- FIX FOR SSL CONNECTION ERROR ---
// This new logic automatically detects if the connection is to a local database
// and disables SSL, which is the common setting for local development.
// For cloud databases (on Heroku, Render, etc.), SSL will be enabled.
const connectionString = process.env.NODE_ENV === 'test'
    ? process.env.TEST_DATABASE_URL
    : process.env.DATABASE_URL;


const isLocalConnection = connectionString && (
    connectionString.includes('localhost') ||
    connectionString.includes('127.0.0.1') ||
    connectionString.includes('0.0.0.0') ||
    connectionString.includes('::1')
);


// Allow override via PGSSLMODE=disable in .env
const disableSSL = process.env.PGSSLMODE === 'disable' || isLocalConnection;
logger.info('SSL disabled: %s | PGSSLMODE: %s | isLocalConnection: %s', disableSSL, process.env.PGSSLMODE, isLocalConnection);

const pool = new Pool({
    connectionString: connectionString,
    ssl: !disableSSL ? { rejectUnauthorized: false } : false,
});


// A helper function to query the database, handling client checkout and release.
async function query(text, params) {
    const start = Date.now();
    const client = await pool.connect();
    try {
        const res = await client.query(text, params);
        const duration = Date.now() - start;
        logger.debug('[DB] Executed query', { text: text.substring(0, 100).replace(/\s+/g, ' '), duration, rows: res.rowCount });
        return res;
    } finally {
        client.release();
    }
}

// Transaction helper for multi-step DB operations
async function withTransaction(callback) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (err) {
        await client.query('ROLLBACK');
        logger.error('[DB] Transaction rolled back due to error:', err);
        throw err;
    } finally {
        client.release();
    }
}

// --- Reminder-specific Database Functions (Async/PostgreSQL with UUIDs) ---

/**
 * Adds a new reminder to the database with a generated UUID.
 * @param {object} reminder - The reminder object { userId, message, scheduledTime }
 * @returns {Promise<object>} The newly created reminder object from the database.
 */
async function addReminder(reminder) {
    // *** CHANGE: Generate UUID here and include it in the insert statement ***
    const newId = reminder.id || uuidv4(); 
    const sql = `
        INSERT INTO reminders (id, user_id, message, scheduled_time, status) 
        VALUES ($1, $2, $3, $4, 'pending') 
        RETURNING *
    `;
    const { rows } = await query(sql, [newId, reminder.userId, reminder.message, reminder.scheduledTime]);
    return rows[0];
}

async function getRemindersByUserId(userId) {
    const sql = `SELECT * FROM reminders WHERE user_id = $1 ORDER BY scheduled_time DESC`;
    const { rows } = await query(sql, [userId]);
    return rows;
}

/**
 * Gets a reminder by its UUID.
 * @param {string} id - The reminder UUID.
 * @returns {Promise<object|undefined>} The reminder object or undefined if not found.
 */
async function getReminderById(id) {
    const sql = `SELECT * FROM reminders WHERE id = $1`;
    const { rows } = await query(sql, [id]);
    return rows[0];
}

/**
 * Updates a reminder's status using its UUID.
 * @param {string} id - The reminder UUID.
 * @param {string} newStatus - The new status.
 */
async function updateReminderStatus(id, newStatus) {
    const sql = `UPDATE reminders SET status = $1, updated_at = NOW() WHERE id = $2`;
    await query(sql, [newStatus, id]);
}

async function getPendingReminders() {
    const sql = `
        SELECT id, user_id AS "userId", scheduled_time AS "scheduledTime", message, status
        FROM reminders 
        WHERE status = 'pending' OR status = 'scheduled'
    `;
    const { rows } = await query(sql);
    return rows;
}

async function deleteReminder(id) {
    const sql = `DELETE FROM reminders WHERE id = $1`;
    await query(sql, [id]);
}

async function clearAllReminders() {
    const sql = `TRUNCATE TABLE reminders RESTART IDENTITY`;
    await query(sql);
    console.log("[DB] All reminders cleared from the database.");
}

/**
 * A function to initialize the database schema with a UUID primary key.
 */
async function initializeDbSchema() {
    // *** CHANGE: Enable the uuid-ossp extension if it doesn't exist ***
    await query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // *** CHANGE: Set the 'id' column to be a UUID with a default value ***
    const sql = `
        CREATE TABLE IF NOT EXISTS reminders (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            scheduled_time TIMESTAMPTZ NOT NULL,
            status VARCHAR(20) DEFAULT 'pending',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    `;
    await query(sql);
    console.log('[DB] "reminders" table checked/initialized successfully with UUID primary key.');
}

module.exports = {
    query,
    pool,
    withTransaction,
    initializeDbSchema,
    addReminder,
    getRemindersByUserId,
    getReminderById,
    updateReminderStatus,
    getPendingReminders,
    deleteReminder,
    clearAllReminders
};
