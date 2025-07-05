// utils/messageParser.js
// Extracts message type, content, sender info, etc. from WhatsApp webhook payload

function parseMessage(message, value) {
    const senderWaId = message.from;
    const senderName = value.contacts && value.contacts[0] ? value.contacts[0].profile.name : 'Unknown User';
    let messageType = message.type;
    let messageContent = '';
    let extra = {}; // For additional data like coordinates

    switch (messageType) {
        case 'text':
            messageContent = message.text.body.trim();
            break;
        case 'image':
            messageContent = message.image.id;
            extra.caption = message.image.caption || '';
            break;
        case 'video':
            messageContent = message.video.id;
            extra.caption = message.video.caption || '';
            break;
        case 'audio':
            messageContent = message.audio.id;
            break;
        case 'document':
            messageContent = message.document.id;
            extra.filename = message.document.filename || '';
            break;
        case 'sticker':
            messageContent = message.sticker.id;
            break;
        case 'location':
            messageContent = `Latitude: ${message.location.latitude}, Longitude: ${message.location.longitude}`;
            extra.latitude = message.location.latitude;
            extra.longitude = message.location.longitude;
            extra.name = message.location.name || ''; // Optional: name of the location
            extra.address = message.location.address || ''; // Optional: address of the location
            break;
        case 'contacts':
            messageContent = 'Shared contact(s)';
            extra.contacts = message.contacts; // Array of contact objects
            break;
        case 'interactive':
            if (message.interactive.type === 'button_reply') {
                messageType = 'button_reply'; // Refine type for easier handling
                messageContent = message.interactive.button_reply.title;
                extra.buttonId = message.interactive.button_reply.id;
            } else if (message.interactive.type === 'list_reply') {
                messageType = 'list_reply'; // Refine type
                messageContent = message.interactive.list_reply.title;
                extra.listRowId = message.interactive.list_reply.id;
            }
            break;
        case 'reaction':
            messageContent = message.reaction.emoji;
            extra.reactedToMessageId = message.reaction.wa_id;
            break;
        default:
            messageContent = `Unsupported message type: ${messageType}`;
            break;
    }

    return { senderWaId, messageType, messageContent, senderName, extra };
}

module.exports = { parseMessage };
