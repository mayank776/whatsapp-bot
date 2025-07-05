const { handleIncomingMessage, handleMessageStatus } = require('../utils/whatsappHandlers');
const { getIntentAndAgent } = require('../utils/geminiRouter');
const { parseMessage } = require('../utils/messageParser');
const { sendTextMessage } = require('../utils/whatsappApi');

const { handleRestaurantBooking } = require('../agents/restaurantBookingAgent');
const { handleWeather } = require('../agents/weatherAgent');
const { handleGeneralChat } = require('../agents/generalChatAgent');
const { handleCustomerSupport } = require('../agents/customerSupportAgent');
const { handleComprehensiveLocationInfo } = require('../agents/comprehensiveLocationAgent');
const { handleReminder } = require('../agents/reminderAgent');

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
async function handleWebhookEvent(req, res) {
    const body = req.body;
    console.log(`\nWebhook Received:`);
    console.log(JSON.stringify(body, null, 2));

    if (body.object === 'whatsapp_business_account') {
        for (const entry of body.entry) {
            // Iterate over each change within an entry
            for (const change of entry.changes) {
                // Ensure the change is a 'messages' event (covers incoming messages and status updates)
                if (change.field === 'messages') {
                    const value = change.value;

                    // Check if there are actual incoming messages (from user)
                    if (value.messages) {
                        // Process each message individually
                        // Use for...of for proper async/await handling in loops
                        for (const message of value.messages) {
                            // Parse message details using the helper function
                            const { senderWaId, messageType, messageContent, senderName, extra } = parseMessage(message, value);
                            console.log(`[${messageType}] From: ${senderName} (${senderWaId}), Content: "${messageContent}"`, extra);

                            try {
                                if (messageType === 'text' || messageType === 'button_reply' || messageType === 'list_reply') {
                                    // For text and interactive replies, use Gemini for intent recognition and agent routing
                                    const intentRecognitionResult = await getIntentAndAgent(messageContent);
                                    const { intent, agent } = intentRecognitionResult;
                                    
                                    console.log(`Identified Intent: ${intent}`);
                                    console.log(`Suggested Agent: ${agent}`);

                                    // --- Agent Routing Logic for TEXT/INTERACTIVE messages ---
                                    switch (agent) {
                                        case 'RestaurantBookingAgent':
                                            await handleRestaurantBooking(senderWaId, messageContent);
                                            break;
                                        case 'WeatherAgent': // Handles text-based weather queries
                                            await handleWeather(senderWaId, messageContent);
                                            break;
                                        case 'ComprehensiveLocationAgent': // Handles text-based broad local info, will prompt for location
                                            await handleComprehensiveLocationInfo(senderWaId, messageContent);
                                            break;
                                        case 'OrderTrackingAgent':
                                            // Placeholder for this agent
                                            await sendTextMessage(senderWaId, "You asked about order tracking! This agent is still under development. Please check back later.");
                                            break;
                                        case 'ReminderAgent':
                                            await handleReminder(senderWaId, messageContent);
                                            break;
                                        case 'CustomerSupportAgent':
                                            await handleCustomerSupport(senderWaId, messageContent);
                                            break;
                                        case 'GeneralChatAgent':
                                        default: // Fallback to general chat if agent name is unrecognized or API error
                                            await handleGeneralChat(senderWaId, messageContent);
                                            break;
                                    }

                                } else if (messageType === 'location') {
                                    // *** Direct Routing for Shared Location Messages (ALWAYS to ComprehensiveLocationAgent) ***
                                    const latitude = extra.latitude; // From parseMessage's 'extra'
                                    const longitude = extra.longitude; // From parseMessage's 'extra'
                                    
                                    // Pass null for messageContent as the primary input is coordinates
                                    await handleComprehensiveLocationInfo(senderWaId, null, latitude, longitude); 
                                    
                                } else {
                                    // Handle other unsupported message types (image, video, document, sticker, contacts, reaction, etc.)
                                    console.log(`[Unsupported Message Type] From: ${senderName} (${senderWaId}), Type: ${messageType}`);
                                    await sendTextMessage(senderWaId, "I'm sorry, I can only process text messages and shared locations at the moment. Please describe your request in text or share your location.");
                                }
                            } catch (error) {
                                console.error('Error in message processing or agent routing:', error);
                                // Fallback to general chat or customer support in case of an unhandled error
                                await sendTextMessage(senderWaId, "I apologize, an unexpected error occurred while trying to understand your request. Our team has been notified. Please try again or contact our support directly.");
                            }
                        }
                    } else if (value.statuses) {
                        // Handle message status updates (sent, delivered, read, failed)
                        // These are typically for messages *your business* sent to users
                        for (const status of value.statuses) { // Use for...of for proper async/await handling
                            console.log('Message Status Update:', status);
                            // You can use this to update the delivery status of your outbound messages
                            // in your database or CRM.
                        }
                    }
                }
            }
        }
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
