// Helper functions for WhatsApp webhook events

function handleIncomingMessage(message) {
    // Handle incoming messages
    console.log('Received message:', message);
    // Implement your logic here:
    // - Parse message type (text, image, button, etc.)
    // - Extract sender ID
    // - Process the message (e.g., respond, save to DB, trigger action)
}

function handleMessageStatus(status) {
    // Handle message status updates (sent, delivered, read, failed)
    console.log('Message status update:', status);
}

module.exports = {
    handleIncomingMessage,
    handleMessageStatus
};
