// Helper functions for WhatsApp webhook events


const logger = require('./logger');
function handleIncomingMessage(message) {
    logger.info('Received message:', message);
    // Implement your logic here
}

function handleMessageStatus(status) {
    logger.info('Message status update:', status);
}

module.exports = {
    handleIncomingMessage,
    handleMessageStatus
};
