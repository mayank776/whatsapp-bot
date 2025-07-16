const logger = require('../utils/logger');
const chrono = require('chrono-node');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment-timezone');
const { sendTextMessage , sendButtonMessage , sendListMessage } = require('../utils/whatsappApi');
const { addReminder, getRemindersByUserId, updateReminderStatus, deleteReminder, withTransaction } = require('../utils/db');
const { scheduleReminder, cancelReminderJob } = require('../utils/scheduler');

const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const DEFAULT_TIMEZONE = process.env.DEFAULT_REMINDER_TIMEZONE || 'UTC';

async function handleReminder(senderWaId, messageContent) {
    logger.info(`[ReminderAgent] Handling request from ${senderWaId}: "${messageContent}"`);


    if (messageContent.startsWith('DELETE_REMINDER_')) {
        const reminderIdToDelete = messageContent.replace('DELETE_REMINDER_', '');
        await deleteUserReminder(senderWaId, reminderIdToDelete);
        return; // Important: handle interactive reply and exit
    }
    if (messageContent === 'MANAGE_REMINDERS_BTN') {
        // User tapped the "Delete Task" button from the confirmation
        await sendManageRemindersList(senderWaId);
        return; // Important: handle interactive reply and exit
    }

    // Commands for listing/deleting reminders
    if (messageContent.toLowerCase().startsWith('list reminders')) {
        await listReminders(senderWaId);
        return;
    }
    if (messageContent.toLowerCase().startsWith('delete reminder')) {
        const parts = messageContent.split(' ');
        const reminderId = parts[2];
        if (reminderId) {
            await deleteUserReminder(senderWaId, reminderId);
        } else {
            await sendTextMessage(senderWaId, "Please provide the ID of the reminder you want to delete. E.g., 'delete reminder 123'");
        }
        return;
    }

    const parsed = chrono.parse(messageContent);

    if (parsed && parsed.length > 0) {
        const firstResult = parsed[0];
        let rawReminderText = messageContent.replace(firstResult.text, '').trim();

        // Use Gemini to extract the crux of the reminder (e.g., "call Vaibhav")
        // This is crucial for the notification message format.
        if (!rawReminderText) {
            await sendTextMessage(senderWaId, "What should I remind you about? Please provide the text for the reminder. E.g., 'Remind me to buy milk tomorrow at 8 AM'");
            return;
        }

        let reminderCrux = rawReminderText;
        try {
            const extractPrompt = `Extract the core task or item the user wants to be reminded about from the following text. Remove any leading phrases like "Remind me to", "Can you remind me to", "I need to be reminded about". Just provide the concise task itself.

            Example:
            Text: "Remind me to call Vaibhav at 5 pm"
            Crux: "call Vaibhav"

            Text: "I need to be reminded about buying groceries"
            Crux: "buying groceries"

            Text: "meeting with John"
            Crux: "meeting with John"

            Text: "${rawReminderText}"
            Crux:`;
            
            const result = await model.generateContent(extractPrompt);
            const response = await result.response;
            reminderCrux = response.text().trim();
            // Clean up potential markdown formatting from Gemini
            reminderCrux = reminderCrux.replace(/```\n*|\n*```/g, '').trim();

            if (!reminderCrux) { // Fallback if Gemini somehow returns empty
                 reminderCrux = rawReminderText;
            }

        } catch (geminiError) {
            logger.error("Error using Gemini for reminder text extraction:", geminiError);
            // Fallback to raw text if Gemini fails
            reminderCrux = rawReminderText;
        }

        // Use moment-timezone to construct a Date object correctly aware of the timezone
        let scheduledMoment = moment.tz(firstResult.start.date(), DEFAULT_TIMEZONE);

        // IMPORTANT: Validate if parsed date is in the future relative to the current time IN THAT TIMEZONE
        // We'll add a small buffer (e.g., 10 seconds) to ensure it's truly in the future for scheduling
        const nowInTimezone = moment().tz(DEFAULT_TIMEZONE); // Current time in the default timezone

        // Check if the scheduled time is in the past or too soon (within 10 seconds)
        if (scheduledMoment.isSameOrBefore(nowInTimezone.add(10, 'seconds'))) {
            await sendTextMessage(senderWaId, `I can only set reminders for future times. The time you provided seems to be in the past or too soon relative to your timezone (${DEFAULT_TIMEZONE}). Please specify a future time.`);
            return;
        }

        const reminder = {
            id: uuidv4(),
            userId: senderWaId,
            message: reminderCrux, // Use 'message' for DB
            originalText: rawReminderText, // Store original for context if needed
            scheduledTime: scheduledMoment.toISOString(),
            status: 'pending' // Initial status
        };

        // Save to DB and schedule in a transaction
        try {
            await withTransaction(async (client) => {
                // Save reminder
                await addReminder(reminder);
                // Schedule reminder (external, but if it throws, transaction rolls back)
                await scheduleReminder(reminder, DEFAULT_TIMEZONE, scheduledMoment);
            });
            const confirmationTimeFormatted = scheduledMoment.format('h:mm A z');
            const bodyText = `📌 I’ve scheduled the following tasks for you:\n\n • ${reminder.message} at ${confirmationTimeFormatted}\n\nIf you’d like to make changes or remove a task, just tap below or ask anytime.`;
            const buttons = [
                { id: 'MANAGE_REMINDERS_BTN', title: 'Delete Task' }
            ];
            await sendButtonMessage(senderWaId, bodyText, buttons);
        } catch (err) {
            try {
                await updateReminderStatus(reminder.id, 'failed_to_schedule');
            } catch (updateErr) {
                logger.error(`[ReminderAgent] Failed to update reminder status after scheduling error:`, updateErr);
            }
            await sendTextMessage(senderWaId, `Sorry, I couldn't schedule your reminder due to an internal error. Please try again later.`);
            logger.error(`[ReminderAgent] Failed to schedule reminder:`, err);
        }

    } else {
        await sendTextMessage(senderWaId, "I couldn't understand the reminder you're trying to set. Please be more specific with the time and what you want to be reminded about. E.g., 'Remind me to call mom at 3 PM tomorrow' or 'Remind me to submit report in 2 hours'.");
    }
}

async function sendManageRemindersList(senderWaId) {
    const userReminders = await getRemindersByUserId(senderWaId);

    if (userReminders.length === 0) {
        await sendTextMessage(senderWaId, "You don't have any active reminders set.");
        return;
    }

    const sections = [{
        title: "Your Upcoming Tasks",
        rows: userReminders.map(r => {
            const scheduledMoment = moment.tz(r.scheduledTime, DEFAULT_TIMEZONE);
            const timeDisplay = scheduledMoment.format('MMMM Do, h:mm A z');
            return {
                id: `DELETE_REMINDER_${r.id}`,
                title: r.message, // Use 'message' for display
                description: `Scheduled for: ${timeDisplay} (Status: ${r.status})`
            };
        })
    }];

    await sendListMessage(
        senderWaId,
        "Manage Reminders", // Header text (optional)
        "Select a reminder below to delete it:", // Body text
        "View & Delete Tasks", // Button text that opens the list
        sections
    );
}

// Helper to list reminders (no changes needed here, it uses moment-timezone correctly)
async function listReminders(senderWaId) {
    const userReminders = await getRemindersByUserId(senderWaId);

    if (userReminders.length === 0) {
        await sendTextMessage(senderWaId, "You don't have any active reminders set.");
        return;
    }

    let response = "Your upcoming reminders:\n";
    userReminders.forEach((r) => {
        const scheduledMoment = moment.tz(r.scheduledTime, DEFAULT_TIMEZONE);
        const confirmationTime = scheduledMoment.format('MMMM Do,YYYY [at] h:mm A z');
        response += `\nID: ${r.id.substring(0, 8)}...\n  Task: "${r.message}"\n  Time: ${confirmationTime}\n  Status: ${r.status}`;
    });
    response += "\n\nTo delete a reminder, use 'delete reminder [ID]' (e.g., 'delete reminder " + userReminders[0].id.substring(0, 8) + "...').";
    await sendTextMessage(senderWaId, response);
}

// Helper to delete a reminder (no changes needed here)
async function deleteUserReminder(senderWaId, reminderIdPartial) {
    const reminders = await getRemindersByUserId(senderWaId);
    const reminderToDelete = reminders.find(r => r.id.startsWith(reminderIdPartial));

    if (reminderToDelete) {
        cancelReminderJob(reminderToDelete.id); // Stop the cron job
        await deleteReminder(reminderToDelete.id); // Delete from DB (awaited)
        await sendTextMessage(senderWaId, `Reminder "${reminderToDelete.message}" (ID: ${reminderToDelete.id.substring(0, 8)}...) has been deleted.`);
        // After deletion, show the updated list if it was deleted via interactive list
        if (reminderIdPartial.startsWith('DELETE_REMINDER_')) { // Check if it came from the list button
             await sendManageRemindersList(senderWaId); // Show updated list
        }
    } else {
        await sendTextMessage(senderWaId, `No reminder found with ID starting with '${reminderIdPartial}' for your account. Please check the ID from 'list reminders'.`);
    }
}

module.exports = {
    handleReminder
};