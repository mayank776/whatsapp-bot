// utils/messageParser.js
// Extracts message type, content, sender info, etc. from WhatsApp webhook payload

function parseMessage(message, value) {
    let messageContent = '';
    let messageType = message.type;
    let senderName = value.contacts && value.contacts[0] ? value.contacts[0].profile.name : 'Unknown User';
    let extra = {};

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
            break;
        case 'contacts':
            const contactsInfo = message.contacts.map(contact => ({
                name: contact.name.formatted_name,
                phone: contact.phones[0].wa_id
            }));
            messageContent = `Shared Contacts: ${JSON.stringify(contactsInfo)}`;
            break;
        case 'interactive':
            if (message.interactive.type === 'button_reply') {
                messageContent = message.interactive.button_reply.title;
                extra.buttonId = message.interactive.button_reply.id;
            } else if (message.interactive.type === 'list_reply') {
                messageContent = message.interactive.list_reply.title;
                extra.listRowId = message.interactive.list_reply.id;
            }
            break;
        case 'reaction':
            messageContent = message.reaction.emoji;
            extra.reactionMessageId = message.reaction.wa_id;
            break;
        default:
            messageContent = `Unsupported message type: ${messageType}`;
            break;
    }
    return { messageType, messageContent, senderName, extra };
}

module.exports = { parseMessage };
