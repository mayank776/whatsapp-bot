const { handleIncomingMessage, handleMessageStatus } = require('../utils/whatsappHandlers');
const { getIntentAndAgent } = require('../utils/geminiRouter');
const { parseMessage } = require('../utils/messageParser');

const { handleRestaurantBooking } = require('../agents/restaurantBookingAgent');
const { handleWeather } = require('../agents/weatherAgent');
const { handleGeneralChat } = require('../agents/generalChatAgent');
const { handleCustomerSupport } = require('../agents/customerSupportAgent');

// Webhook verification handler
function handleWebhookVerification(req, res, VERIFY_TOKEN) {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('WEBHOOK_VERIFIED');
            return res.status(200).send(challenge);
        } else {
            // Responds with '403 Forbidden' if verify tokens do not match
            return res.sendStatus(403);
        }
    }
    res.sendStatus(400); // Bad request if missing params
}

// Webhook event handler
function handleWebhookEvent(req, res) {
    const body = req.body;
    console.log(`\nWebhook Received:`);
    console.log(JSON.stringify(body, null, 2));

    if (body.object === 'whatsapp_business_account') {
        body.entry.forEach(entry => {
            // Iterate over each change within an entry
            entry.changes.forEach(change => {
                // Ensure the change is a 'message' event
                if (change.field === 'messages') {
                    let value = change.value;

                    // Check if there are messages in the 'value' object
                    if (value.messages) {
                        value.messages.forEach(async message => {
                            // --- This is where the core message processing begins ---
                            console.log('Incoming WhatsApp Message Payload:', JSON.stringify(message, null, 2));
                            // Parse message and sender info
                            const senderWaId = message.from;
                            const messageId = message.id;
                            const timestamp = message.timestamp;
                            const { messageType, messageContent, senderName, extra } = parseMessage(message, value);
                            console.log(`[${messageType}] From: ${senderName} (${senderWaId}), Content: "${messageContent}"`, extra);

                            // Intent recognition and agent routing
                            try {
                                const intentRecognitionResult = await getIntentAndAgent(messageContent);
                                const { intent, agent } = intentRecognitionResult;
                                console.log(`Identified Intent: ${intent}`);
                                console.log(`Suggested Agent: ${agent}`);
                                // --- Here you would implement the actual routing logic ---
                                switch (agent) {
                                        case 'RestaurantBookingAgent':
                                            await handleRestaurantBooking(senderWaId, messageContent);
                                            break;
                                        case 'WeatherAgent':
                                            await handleWeather(senderWaId, messageContent);
                                            break;
                                        case 'OrderTrackingAgent': // Placeholder for this agent
                                            await sendTextMessage(senderWaId, "You asked about order tracking! This agent is still under development. Please check back later.");
                                            // In a real scenario, you'd call a function like `handleOrderTracking(senderWaId, messageContent);`
                                            break;
                                        case 'ReminderAgent': // Placeholder for this agent
                                            await sendTextMessage(senderWaId, "You want to set a reminder! This agent is still under development. Please check back later.");
                                            // In a real scenario, you'd call a function like `handleReminder(senderWaId, messageContent);`
                                            break;
                                        case 'CustomerSupportAgent':
                                            await handleCustomerSupport(senderWaId, messageContent);
                                            break;
                                        case 'GeneralChatAgent':
                                        default: // Fallback to general chat if agent name is unrecognized
                                            await handleGeneralChat(senderWaId, messageContent);
                                            break;
                                    }
                            } catch (error) {
                                console.error('Error in intent recognition:', error);
                                console.log(`Fallback: Routing to GeneralChatAgent for message: "${messageContent}"`);
                            }
                        });
                    } else if (value.statuses) {
                        // Handle message status updates (sent, delivered, read, failed)
                        // These are typically for messages *your business* sent to users
                        value.statuses.forEach(status => {
                            console.log('Message Status Update:', status);
                            // You can use this to update the delivery status of your outbound messages
                            // in your database or CRM.
                        });
                    }
                }
            });
        });
        return res.sendStatus(200); // Always respond with 200 OK
    } else {
        // Not a WhatsApp webhook event
        return res.sendStatus(404);
    }
}

module.exports = {
    handleWebhookVerification,
    handleWebhookEvent
};
