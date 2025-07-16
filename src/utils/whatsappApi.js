const axios = require('axios');
const logger = require('./logger');
const WHATSAPP_API_URL = 'https://graph.facebook.com/v19.0';
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
    logger.warn("WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID not found in environment variables. Messaging functionality will be limited.");
}

/**
 * Sends a text message to a WhatsApp user.
 * @param {string} recipientWaId - The WhatsApp ID (phone number) of the recipient.
 * @param {string} messageText - The text content of the message to send.
 */
async function sendTextMessage(recipientWaId, messageText) {
    if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
        logger.error("Cannot send message: WhatsApp API credentials missing.");
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
        logger.info(`Message sent to ${recipientWaId}:`, response.data);
        return response.data;
    } catch (error) {
        logger.error(`Error sending message to ${recipientWaId}:`, error.response ? error.response.data : error.message);
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
        logger.error("Cannot send template message: WhatsApp API credentials missing.");
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
        logger.info(`Template message '${templateName}' sent to ${recipientWaId}:`, response.data);
        return response.data;
    } catch (error) {
        logger.error(`Error sending template message '${templateName}' to ${recipientWaId}:`, error.response ? error.response.data : error.message);
    }
}

/**
 * Sends a message with interactive reply buttons.
 * @param {string} recipientWaId - The WhatsApp ID (phone number) of the recipient.
 * @param {string} bodyText - The main text of the message.
 * @param {Array<Object>} buttons - An array of button objects { id: 'BUTTON_ID', title: 'Button Text' }. Max 3 buttons.
 */
async function sendButtonMessage(recipientWaId, bodyText, buttons) {
    if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
        logger.error("Cannot send button message: WhatsApp API credentials missing.");
        return;
    }
    if (!Array.isArray(buttons) || buttons.length === 0 || buttons.length > 3) {
        logger.error("sendButtonMessage: 'buttons' must be an array with 1 to 3 objects.");
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
        type: 'interactive',
        interactive: {
            type: 'button',
            body: { text: bodyText },
            action: {
                buttons: buttons.map(btn => ({
                    type: 'reply',
                    reply: {
                        id: btn.id,
                        title: btn.title
                    }
                }))
            }
        }
    };

    try {
        const response = await axios.post(url, data, { headers });
        logger.info(`Button message sent to ${recipientWaId}:`, response.data);
        return response.data;
    } catch (error) {
        logger.error(`Error sending button message to ${recipientWaId}:`, error.response ? error.response.data : error.message);
    }
}

/**
 * Sends a List Message (for showing multiple options, like reminders to delete).
 * @param {string} recipientWaId - The WhatsApp ID (phone number) of the recipient.
 * @param {string} headerText - The header of the list message (optional).
 * @param {string} bodyText - The main body text of the list message.
 * @param {string} buttonText - The text displayed on the button that opens the list.
 * @param {Array<Object>} sections - Array of list sections, each with title and rows.
 * Example section: { title: "My Reminders", rows: [{id: "r1", title: "Task 1", description: "desc"}] }
 */
async function sendListMessage(recipientWaId, headerText, bodyText, buttonText, sections) {
    if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
        logger.error("Cannot send list message: WhatsApp API credentials missing.");
        return;
    }
    if (!Array.isArray(sections) || sections.length === 0) {
        logger.error("sendListMessage: 'sections' must be a non-empty array.");
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
        type: 'interactive',
        interactive: {
            type: 'list',
            header: headerText ? { type: 'text', text: headerText } : undefined,
            body: { text: bodyText },
            action: {
                button: buttonText,
                sections: sections
            }
        }
    };

    try {
        const response = await axios.post(url, data, { headers });
        logger.info(`List message sent to ${recipientWaId}:`, response.data);
        return response.data;
    } catch (error) {
        logger.error(`Error sending list message to ${recipientWaId}:`, error.response ? error.response.data : error.message);
    }
}


module.exports = {
    sendTextMessage,
    sendTemplateMessage,
    sendButtonMessage, 
    sendListMessage
};