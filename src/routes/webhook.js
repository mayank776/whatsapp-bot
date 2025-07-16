
const { handleIncomingMessage, handleMessageStatus } = require('../utils/whatsappHandlers');
const { getIntentAndAgent } = require('../utils/geminiRouter');
const { parseMessage } = require('../utils/messageParser');
const { sendTextMessage , sendButtonMessage } = require('../utils/whatsappApi');
const { handleRestaurantBooking } = require('../agents/restaurantBookingAgent');
const { handleWeather } = require('../agents/weatherAgent');
const { handleGeneralChat } = require('../agents/generalChatAgent');
const { handleCustomerSupport } = require('../agents/customerSupportAgent');
const { handleComprehensiveLocationInfo } = require('../agents/comprehensiveLocationAgent');
const { handleReminder } = require('../agents/reminderAgent');
const { handleMedicalAdvice } = require('../agents/medicalAdviceAgent');
const { handleCropAnalysis } = require('../agents/agricultureAgent');
const logger = require('../utils/logger');

// Import validation schemas
const {
  reminderSchema,
  restaurantBookingSchema,
  generalChatSchema,
  customerSupportSchema,
  cropAnalysisSchema
} = require('../validation/agentSchemas');

// Webhook verification handler
function handleWebhookVerification(req, res, VERIFY_TOKEN) {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            logger.info('WEBHOOK_VERIFIED');
            return res.status(200).send(challenge);
        } else {
            // Responds with '403 Forbidden' if verify tokens do not match
            return res.sendStatus(403);
        }
    }
    res.sendStatus(400); // Bad request if missing params
}

// Webhook event handler
const { webhookEventSchema } = require('../validation/webhookValidation');

async function handleWebhookEvent(req, res) {
    const body = req.body;
    logger.info('Webhook Received:');
    logger.debug(JSON.stringify(body, null, 2));

    // Input validation using zod
    const parseResult = webhookEventSchema.safeParse(body);
    if (!parseResult.success) {
        logger.warn('Invalid webhook payload:', parseResult.error);
        return res.status(400).json({ error: 'Invalid webhook payload', details: parseResult.error.errors });
    }

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
                            logger.info(`[${messageType}] From: ${senderName} (${senderWaId}), Content: "${messageContent}"`, extra);

                            // Helper to ensure message is always a string
                            function ensureString(msg) {
                                if (typeof msg === 'string') return msg;
                                if (msg === undefined || msg === null) return 'Sorry, an error occurred.';
                                if (typeof msg === 'object') return JSON.stringify(msg);
                                return String(msg);
                            }
                            try {
                                if (messageType === 'text' || messageType === 'button_reply' || messageType === 'list_reply') {
                                    // For text and interactive replies, use Gemini for intent recognition and agent routing
                                    const intentRecognitionResult = await getIntentAndAgent(messageContent);
                                    const { intent, agent } = intentRecognitionResult;
                                    
                                    logger.info(`Identified Intent: ${intent}`);
                                    logger.info(`Suggested Agent: ${agent}`);

                                    // --- Agent Routing Logic for TEXT/INTERACTIVE messages ---
                                    const { 
                                        startQuiz, 
                                        handleAnswer, 
                                        getFirstQuestion, 
                                        isUserInQuiz 
                                    } = require('../agents/personality-agent');

                                    if (agent === 'PersonalityAnalyzerAgent') {
                                        // Start or continue the quiz session
                                        if (!isUserInQuiz(senderWaId)) {
                                            startQuiz(senderWaId);
                                            let reply = getFirstQuestion();
                                            // Support both text and interactive replies
                                            if (reply && typeof reply === 'object' && reply.type) {
                                                if (reply.type === 'text') {
                                                    await sendTextMessage(senderWaId, reply.content);
                                                } else if (reply.type === 'interactive') {
                                                    await sendButtonMessage(
                                                        senderWaId,
                                                        reply.content.body,
                                                        reply.content.buttons
                                                    );
                                                }
                                            } else {
                                                await sendTextMessage(senderWaId, ensureString(reply));
                                            }
                                        } else {
                                            const reply = await handleAnswer(senderWaId, messageContent);
                                            // Support both text and interactive replies
                                            if (reply && typeof reply === 'object' && reply.type) {
                                                if (reply.type === 'text') {
                                                    await sendTextMessage(senderWaId, reply.content);
                                                } else if (reply.type === 'interactive') {
                                                    await sendButtonMessage(
                                                        senderWaId,
                                                        reply.content.body,
                                                        reply.content.buttons
                                                    );
                                                }
                                            } else {
                                                await sendTextMessage(senderWaId, ensureString(reply));
                                            }
                                        }
                                    } else if (isUserInQuiz(senderWaId)) {
                                        // If user is in quiz but intent is not PersonalityAnalyzerAgent, treat as answer
                                        const reply = await handleAnswer(senderWaId, messageContent);
                                        await sendTextMessage(senderWaId, ensureString(reply));
                                    } else {
                                        switch (agent) {
                                            case 'CropAnalysisAgent': {
                                                // Validate input for crop analysis
                                                const validation = cropAnalysisSchema.validate({
                                                  userId: senderWaId,
                                                  message: messageContent
                                                });
                                                if (validation.error) {
                                                  logger.warn('Invalid crop analysis input:', validation.error);
                                                  await sendTextMessage(senderWaId, ensureString(`Invalid crop analysis request: ${validation.error.message}`));
                                                  break;
                                                }
                                                await handleCropAnalysis(senderWaId, messageContent);
                                                break;
                                            }
                                            case 'RestaurantBookingAgent': {
                                                // Validate input for restaurant booking
                                                const validation = restaurantBookingSchema.validate({
                                                  userId: senderWaId,
                                                  restaurantName: messageContent, // Simplified, adapt as needed
                                                  bookingTime: new Date().toISOString(), // Placeholder, adapt as needed
                                                  numberOfPeople: 2 // Placeholder, adapt as needed
                                                });
                                                if (validation.error) {
                                                  logger.warn('Invalid restaurant booking input:', validation.error);
                                                  await sendTextMessage(senderWaId, ensureString(`Invalid booking request: ${validation.error.message}`));
                                                  break;
                                                }
                                                await handleRestaurantBooking(senderWaId, messageContent);
                                                break;
                                            }
                                            case 'WeatherAgent':
                                                await handleWeather(senderWaId, messageContent);
                                                break;
                                            case 'ComprehensiveLocationAgent':
                                                await handleComprehensiveLocationInfo(senderWaId, messageContent);
                                                break;
                                            case 'OrderTrackingAgent':
                                                await sendTextMessage(senderWaId, ensureString("You asked about order tracking! This agent is still under development. Please check back later."));
                                                break;
                                            case 'ReminderAgent': {
                                                // Validate input for reminder
                                                const validation = reminderSchema.validate({
                                                  userId: senderWaId,
                                                  message: messageContent,
                                                  scheduledTime: new Date().toISOString() // Placeholder, adapt as needed
                                                });
                                                if (validation.error) {
                                                  logger.warn('Invalid reminder input:', validation.error);
                                                  await sendTextMessage(senderWaId, ensureString(`Invalid reminder request: ${validation.error.message}`));
                                                  break;
                                                }
                                                await handleReminder(senderWaId, messageContent);
                                                break;
                                            }
                                            case 'CustomerSupportAgent': {
                                                // Validate input for customer support
                                                const validation = customerSupportSchema.validate({
                                                  userId: senderWaId,
                                                  message: messageContent
                                                });
                                                if (validation.error) {
                                                  logger.warn('Invalid customer support input:', validation.error);
                                                  await sendTextMessage(senderWaId, ensureString(`Invalid support request: ${validation.error.message}`));
                                                  break;
                                                }
                                                await handleCustomerSupport(senderWaId, messageContent);
                                                break;
                                            }
                                            case "MedicalAdviceAgent":
                                                await handleMedicalAdvice(senderWaId, messageContent);
                                                break;
                                            case 'GeneralChatAgent':
                                            default: {
                                                // Validate input for general chat
                                                const validation = generalChatSchema.validate({
                                                  userId: senderWaId,
                                                  message: messageContent
                                                });
                                                if (validation.error) {
                                                  logger.warn('Invalid chat input:', validation.error);
                                                  await sendTextMessage(senderWaId, ensureString(`Invalid chat request: ${validation.error.message}`));
                                                  break;
                                                }
                                                const responsePayload = await handleGeneralChat(senderWaId, messageContent);
                                                if (responsePayload && typeof responsePayload === 'object') {
                                                    if (responsePayload.type === 'text') {
                                                        await sendTextMessage(senderWaId, responsePayload.content);
                                                    } else if (responsePayload.type === 'interactive') {
                                                        await sendButtonMessage(
                                                            senderWaId,
                                                            responsePayload.content.body,
                                                            responsePayload.content.buttons
                                                        );
                                                    }
                                                }
                                                break;
                                            }
                                        }
                                    }

                                } else if (messageType === 'location') {
                                    // *** Direct Routing for Shared Location Messages (ALWAYS to ComprehensiveLocationAgent) ***
                                    const latitude = extra.latitude; // From parseMessage's 'extra'
                                    const longitude = extra.longitude; // From parseMessage's 'extra'
                                    
                                    // Pass null for messageContent as the primary input is coordinates
                                    await handleComprehensiveLocationInfo(senderWaId, null, latitude, longitude); 
                                    
                                } else {
                                    // Handle other unsupported message types (image, video, document, sticker, contacts, reaction, etc.)
                                    logger.warn(`[Unsupported Message Type] From: ${senderName} (${senderWaId}), Type: ${messageType}`);
                                    await sendTextMessage(senderWaId, ensureString("I'm sorry, I can only process text messages and shared locations at the moment. Please describe your request in text or share your location."));
                                }
                            } catch (error) {
                                logger.error('Error in message processing or agent routing:', error);
                                // Fallback to general chat or customer support in case of an unhandled error
                                await sendTextMessage(senderWaId, ensureString("I apologize, an unexpected error occurred while trying to understand your request. Our team has been notified. Please try again or contact our support directly."));
                            }
                        }
                    } else if (value.statuses) {
                        // Handle message status updates (sent, delivered, read, failed)
                        // These are typically for messages *your business* sent to users
                        for (const status of value.statuses) { // Use for...of for proper async/await handling
                            logger.info('Message Status Update:', status);
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
