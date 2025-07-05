// utils/geminiRouter.js
// Handles Gemini AI intent recognition and agent suggestion

const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

async function getIntentAndAgent(messageContent) {
    const prompt = `Analyze the following WhatsApp message and identify the user's intent. Based on the intent, suggest the most appropriate specialized agent to handle the request.
    
    Your output must be a JSON object with the following structure:
    {
      "intent": "IdentifiedIntentHere",
      "agent": "SuggestedAgentName"
    }
    
    Here are the possible agents and their primary responsibilities for TEXT MESSAGES:
    - "RestaurantBookingAgent": Handles requests related to booking tables, checking availability, or general inquiries about a restaurant.
    - "ReminderAgent": Manages setting reminders for tasks, events, or specific times.
    - "GeneralChatAgent": For casual conversation, greetings, or questions that don't require specific expertise.
    - "CustomerSupportAgent": For general questions, complaints, or issues that don't fit other categories, requiring human intervention.
    
    Specialized for location-related TEXT inquiries:
    - "WeatherAgent": ONLY handles requests for weather forecasts and conditions (e.g., "What's the weather in London?", "Is it raining?"). It will ask for a city if not provided in the text.
    - "ComprehensiveLocationAgent": Handles requests for a broader summary of information about an area (e.g., "What's happening in New York?", "Give me local info about Tokyo"). If the user asks for a summary of "this area" or "my current location" via text, this agent will respond by prompting the user to *share their WhatsApp location* explicitly.
    
    If no specific agent is clearly suitable, default to "GeneralChatAgent".

    Example:
    Message: "What's the weather like in London?"
    Output: {"intent": "GetWeather", "agent": "WeatherAgent"}

    Example:
    Message: "Is it raining where I am?"
    Output: {"intent": "GetWeather", "agent": "WeatherAgent"}

    Example:
    Message: "What's happening in Tokyo?"
    Output: {"intent": "GetLocalInfo", "agent": "ComprehensiveLocationAgent"}

    Example:
    Message: "Give me local info about this area."
    Output: {"intent": "GetLocalInfo", "agent": "ComprehensiveLocationAgent"}
    
    Example:
    Message: "Tell me a joke."
    Output: {"intent": "CasualChat", "agent": "GeneralChatAgent"}

    Message: "${messageContent}"
    Output:`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const geminiText = response.text();

        console.log('Gemini Raw Response for Routing:', geminiText);

        let intentRecognitionResult;
        try {
            intentRecognitionResult = JSON.parse(geminiText.replace(/```json\n|\n```/g, '').trim());
        } catch (parseError) {
            console.error('Error parsing Gemini JSON response for routing:', parseError);
            intentRecognitionResult = {
                intent: "ParsingError",
                agent: "CustomerSupportAgent"
            };
        }
        return intentRecognitionResult;
    } catch (error) {
        console.error('Error calling Gemini API for intent recognition:', error);
        return { intent: "APIError", agent: "CustomerSupportAgent" }; // Fallback on API error
    }
}

module.exports = { getIntentAndAgent };
