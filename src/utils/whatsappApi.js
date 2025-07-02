// whatsappApi.js
const axios = require('axios'); // npm install axios

// Load environment variables for the access token and phone number ID
require('dotenv').config();

const WHATSAPP_API_URL = 'https://graph.facebook.com/v19.0'; // Or the latest version
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN; // Get this from Meta App Dashboard
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID; // Get this from Meta App Dashboard

if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
    console.error("WARNING: WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID not found in environment variables. Messaging functionality will be limited.");
}

/**
 * Sends a text message to a WhatsApp user.
 * @param {string} recipientWaId - The WhatsApp ID (phone number) of the recipient.
 * @param {string} messageText - The text content of the message to send.
 */
async function sendTextMessage(recipientWaId, messageText) {
    if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
        console.error("Cannot send message: WhatsApp API credentials missing.");
        return;
    }

    const url = `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
    const headers = {
        'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
    };
    const data = {
        messaging_product: 'whatsapp',
        to: recipientWaId,
        type: 'text',
        text: {
            body: messageText
        }
    };

    try {
        const response = await axios.post(url, data, { headers });
        console.log(`Message sent to ${recipientWaId}:`, response.data);
        return response.data;
    } catch (error) {
        console.error(`Error sending message to ${recipientWaId}:`, error.response ? error.response.data : error.message);
        // You might want to implement retry logic or alert mechanisms here
    }
}

/**
 * Sends a template message to a WhatsApp user.
 * Template messages are required for business-initiated conversations outside the 24-hour window.
 * You MUST have these templates pre-approved in your WhatsApp Manager.
 * @param {string} recipientWaId - The WhatsApp ID (phone number) of the recipient.
 * @param {string} templateName - The name of the pre-approved message template.
 * @param {Array<Object>} components - An array of component objects for dynamic content.
 * Example: [{ type: "body", parameters: [{ type: "text", text: "John" }] }]
 */
async function sendTemplateMessage(recipientWaId, templateName, components = []) {
    if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
        console.error("Cannot send template message: WhatsApp API credentials missing.");
        return;
    }

    const url = `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
    const headers = {
        'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
    };

    const data = {
        messaging_product: 'whatsapp',
        to: recipientWaId,
        type: 'template',
        template: {
            name: templateName,
            language: {
                code: 'en_US' // Or your desired language
            },
            components: components
        }
    };

    try {
        const response = await axios.post(url, data, { headers });
        console.log(`Template message '${templateName}' sent to ${recipientWaId}:`, response.data);
        return response.data;
    } catch (error) {
        console.error(`Error sending template message '${templateName}' to ${recipientWaId}:`, error.response ? error.response.data : error.message);
        // Implement error handling for template messages (e.g., template not found, invalid parameters)
    }
}

module.exports = {
    sendTextMessage,
    sendTemplateMessage
};