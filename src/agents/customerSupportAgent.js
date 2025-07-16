
const { sendTextMessage, sendTemplateMessage } = require('../utils/whatsappApi');
const logger = require('../utils/logger');

async function handleCustomerSupport(senderWaId, messageContent) {
    logger.info(`[CustomerSupportAgent] Routing to human support for ${senderWaId}: "${messageContent}"`);

    // In a real system, you would:
    // 1. Log the conversation and user details to a CRM or ticketing system.
    // 2. Notify a human agent (e.g., via Slack, email, or a live chat dashboard).
    // 3. Potentially transfer the conversation in a live chat tool.

    const initialResponseMessage = "Thank you for contacting customer support. I'm connecting you with a human agent who will assist you shortly. Please bear with us.";
    await sendTextMessage(senderWaId, initialResponseMessage);

    // Optional: Send a pre-approved template message for more formal communication
    // Example: You would need a template named "human_agent_transfer_notification" with a variable for customer name
    /*
    await sendTemplateMessage(senderWaId, "human_agent_transfer_notification", [
        { type: "body", parameters: [{ type: "text", text: senderWaId }] }
    ]);
    */

    // Simulate sending an internal notification
    logger.info(`--- INTERNAL NOTIFICATION ---`);
    logger.info(`New support request from ${senderWaId}: "${messageContent}"`);
    logger.info(`Please assign to a human agent.`);
    logger.info(`-----------------------------`);
}

module.exports = {
    handleCustomerSupport
};