// utils/geminiRouter.js
// Handles Gemini AI intent recognition and agent suggestion

const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

async function getIntentAndAgent(messageContent) {
    const prompt = `Analyze the following WhatsApp message and identify the user's intent. Based on the intent, suggest the most appropriate specialized agent to handle the request.
    \nYour output must be a JSON object with the following structure:\n{\n  "intent": "IdentifiedIntentHere",\n  "agent": "SuggestedAgentName"\n}\n\nHere are the possible agents and their primary responsibilities:\n- "RestaurantBookingAgent": Handles requests related to booking tables, checking availability, or general inquiries about a restaurant.\n- "ReminderAgent": Manages setting reminders for tasks, events, or specific times.\n- "WeatherAgent": Provides weather forecasts, current conditions, or weather-related information for specific locations.\n- "OrderTrackingAgent": Deals with inquiries about existing orders, shipping status, or delivery updates.\n- "CustomerSupportAgent": For general questions, complaints, or issues that don't fit other categories, requiring human intervention.\n- "GeneralChatAgent": For casual conversation, greetings, or questions that don't require specific expertise.\n\nIf no specific agent is clearly suitable, default to "GeneralChatAgent".\n\nMessage: "${messageContent}"\nOutput:`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const geminiText = response.text();
        let intentRecognitionResult;
        try {
            intentRecognitionResult = JSON.parse(geminiText.replace(/```json\n|\n```/g, '').trim());
        } catch (parseError) {
            intentRecognitionResult = {
                intent: "ParsingError",
                agent: "CustomerSupportAgent"
            };
        }
        return intentRecognitionResult;
    } catch (error) {
        return {
            intent: "GeminiError",
            agent: "GeneralChatAgent"
        };
    }
}

module.exports = { getIntentAndAgent };
