
const { sendTextMessage } = require('../utils/whatsappApi');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
const logger = require('../utils/logger');

async function handleGeneralChat(senderWaId, messageContent) {
    logger.info(`[GeneralChatAgent] Handling general chat from ${senderWaId}: "${messageContent}"`);

    // Use Gemini for a general, conversational response
    const chatPrompt = `You are a friendly and helpful AI assistant. Respond to the user's message in a conversational and brief manner. Keep it concise.
    
    User message: "${messageContent}"
    
    Your response:`;

    try {
        const result = await model.generateContent(chatPrompt);
        const responseText = result.response.text();
        await sendTextMessage(senderWaId, responseText);
    } catch (error) {
        logger.error("Error generating general chat response with Gemini:", error);
        await sendTextMessage(senderWaId, "I'm sorry, I'm having trouble responding right now. Please try again in a moment.");
    }
}

module.exports = {
    handleGeneralChat
};