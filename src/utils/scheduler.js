// utils/scheduler.js
const cron = require('node-cron');
const { sendTextMessage } = require('./whatsappApi');
const db = require('./db');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment-timezone'); // Also import moment-timezone here for consistent date checks

const activeCronJobs = new Map();

const DEFAULT_TIMEZONE = process.env.DEFAULT_REMINDER_TIMEZONE || 'America/New_York';

/**
 * Schedules a single reminder. This version is robust and handles existing jobs.
 * @param {object} reminder - The reminder object { id, userId, message, scheduledTime (ISO string) }.
 * @param {string} timezone - The timezone for scheduling (e.g., 'America/New_York').
 * @param {object} [scheduledMomentObject] - Optional moment-timezone object, if already created.
 */
async function scheduleReminder(reminder, timezone = DEFAULT_TIMEZONE, scheduledMomentObject = null) {
    const reminderId = reminder.id;
    
    // Use the provided moment object, or re-create it from the ISO string
    const targetMoment = scheduledMomentObject || moment.tz(reminder.scheduledTime, timezone);

    // Convert moment object to a standard cron string: minute hour dayOfMonth month dayOfWeek
    const cronString = `${targetMoment.minutes()} ${targetMoment.hours()} ${targetMoment.date()} ${targetMoment.month() + 1} *`;
    
    console.log(`[Scheduler] Attempting to schedule reminder ID: ${reminderId} with cron string: "${cronString}"`);

    // Idempotency Check: If a job for this reminder already exists, stop it before creating a new one.
    if (activeCronJobs.has(reminderId)) {
        activeCronJobs.get(reminderId).stop();
        console.log(`[Scheduler] Stopped existing cron job for reminder ID: ${reminderId}`);
    }

    try {
        const job = cron.schedule(cronString, async () => {
            console.log(`[Scheduler] >> EXECUTING REMINDER ${reminderId}: ${reminder.message} for user ${reminder.userId}`);
            
            const notificationMessage = `*Here's the reminder you scheduled:*\n\n${reminder.message}`;
            await sendTextMessage(reminder.userId, notificationMessage);
            
            await db.updateReminderStatus(reminderId, 'completed');
            
            // Clean up the job from memory after it has run
            if (activeCronJobs.has(reminderId)) {
                activeCronJobs.get(reminderId).stop();
                activeCronJobs.delete(reminderId);
            }
        }, {
            scheduled: true,
            timezone: timezone,
        });

        // Store the new job in our map.
        activeCronJobs.set(reminderId, job);
        await db.updateReminderStatus(reminderId, 'scheduled');
        console.log(`[Scheduler] Successfully scheduled reminder ID ${reminderId} for ${targetMoment.format()}`);

    } catch (error) {
        console.error(`[Scheduler] FAILED to schedule cron job for reminder ID ${reminderId}:`, error);
        await db.updateReminderStatus(reminderId, 'error');
    }
}

/**
 * Initializes the scheduler by loading pending reminders from PostgreSQL.
 * This function is now fully asynchronous and robust.
 */
async function initializeScheduler() {
    console.log('[Scheduler] Initializing scheduler with PostgreSQL...');
    try {
        const pendingReminders = await db.getPendingReminders();

        if (pendingReminders && pendingReminders.length > 0) {
            console.log(`[Scheduler] Found ${pendingReminders.length} pending reminders. Rescheduling...`);

            // Use a for...of loop to correctly handle async operations.
            for (const reminder of pendingReminders) {
                try {
                    const scheduledMoment = moment.tz(reminder.scheduledTime, DEFAULT_TIMEZONE);
                    const nowInTimezone = moment().tz(DEFAULT_TIMEZONE);

                    // Add a small buffer (e.g., 10 seconds) to avoid race conditions on startup
                    if (scheduledMoment.isAfter(nowInTimezone.add(10, 'seconds'))) {
                        await scheduleReminder(reminder, DEFAULT_TIMEZONE, scheduledMoment);
                    } else {
                        await db.updateReminderStatus(reminder.id, 'missed');
                        console.log(`[Scheduler] Reminder ID ${reminder.id} was missed due to past time on startup.`);
                    }
                } catch (error) {
                    console.error(`[Scheduler] Failed to process reminder ID ${reminder.id}:`, error);
                    await db.updateReminderStatus(reminder.id, 'error');
                }
            }
        } else {
            console.log('[Scheduler] No pending reminders found to reschedule.');
        }
        console.log('[Scheduler] Initialization complete.');
    } catch (error) {
        console.error('[Scheduler] A critical error occurred during initialization:', error);
        process.exit(1); // Exit if we can't connect to the DB or have a critical failure
    }
}

/**
 * Cancels a scheduled reminder by its ID.
 * @param {string|number} reminderId - The ID of the reminder to cancel.
 * @returns {Promise<boolean>} True if cancelled, false otherwise.
 */
async function cancelReminderJob(reminderId) {
    if (activeCronJobs.has(reminderId)) {
        activeCronJobs.get(reminderId).stop();
        activeCronJobs.delete(reminderId);
        await db.updateReminderStatus(reminderId, 'cancelled');
        console.log(`[Scheduler] Cancelled reminder job for ID: ${reminderId}`);
        return true;
    }
    console.log(`[Scheduler] No active job found to cancel for reminder ID: ${reminderId}`);
    return false;
}


module.exports = { 
    initializeScheduler,
    scheduleReminder,
    cancelReminderJob
};

