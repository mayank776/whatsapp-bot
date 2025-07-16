// utils/geminiRouter.js
// Handles Gemini AI intent recognition and agent suggestion

const { GoogleGenerativeAI } = require('@google/generative-ai');
// dotenv loaded only in index.js

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

async function getIntentAndAgent(messageContent) {
        const prompt = `
You are an expert AI routing system. Your task is to analyze the following WhatsApp message, identify the user's primary intent, and select the most appropriate specialized agent to handle the request. Your output must be a single JSON object with the following structure: {"intent": "IdentifiedIntentHere", "agent": "SuggestedAgentNameHere"}.

### Available Agents and Their Intents:
1. Agent: \`MedicalAdviceAgent\` - Intent: \`SeekMedicalAdvice\` - Responsibilities: Handles any health-related inquiries. Triggered by mentions of symptoms (e.g., "headache," "fever"), questions about medical conditions, or requests for medical guidance (e.g., "should I see a doctor?"). Note: This agent provides general information and strongly recommends consulting a professional. It does not give diagnoses.
2. Agent: \`RestaurantBookingAgent\` - Intent: \`BookRestaurant\` - Responsibilities: Handles requests related to booking tables, checking restaurant availability, or inquiries about a specific restaurant.
3. Agent: \`ReminderAgent\` - Intent: \`SetReminder\` - Responsibilities: Manages setting reminders for tasks, events, or specific times (e.g., "remind me to call mom at 5 pm").
4. Agent: \`WeatherAgent\` - Intent: \`GetWeather\` - Responsibilities: ONLY handles requests for weather forecasts and conditions (e.g., "What's the weather in London?", "Is it raining?"). It will ask for a city if not provided.
5. Agent: \`ComprehensiveLocationAgent\` - Intent: \`GetLocalInfo\` - Responsibilities: Handles requests for a broader summary of information about an area (e.g., "What's happening in New York?", "Give me local info about Tokyo"). If the user asks for a summary of "this area" or "my current location," this agent will prompt the user to *share their WhatsApp location* explicitly.
6. Agent: \`CustomerSupportAgent\` - Intent: \`RequestSupport\` - Responsibilities: For general service questions, complaints, order issues, or problems that require human intervention.
7. Agent: \`GeneralChatAgent\` - Intent: \`CasualChat\` - Responsibilities: The default agent for casual conversation, greetings, jokes, or any question that does not fit one of the specialized categories above.
8. Agent: \`PersonalityAnalyzerAgent\` - Intent: \`TakePersonalityQuiz\` - Responsibilities: Handles requests to take a personality or psychological quiz, analyze personality, or similar. This agent will guide the user through a series of 20 questions and provide a personality profile at the end.
9. Agent: \`CropAnalysisAgent\` - Intent: \`AnalyzeCrop\` - Responsibilities: Handles requests to analyze crop health, diagnose diseases, pests, or nutrient deficiencies from images or descriptions, provide actionable recommendations for farmers and gardeners, and offer detailed, conversational cultivation tips for any crop (e.g., best practices, seasonal advice, soil, watering, fertilization, pest prevention, and harvesting). Triggered by messages about crop problems, uploading crop images, asking for plant health analysis, or seeking cultivation guidance. Always respond in a friendly, expert, and conversational style, giving the most helpful and comprehensive answer possible.

### Examples:
Example 1: Message: "I have a bad headache and a fever, what could it be?"
Output: {"intent": "SeekMedicalAdvice", "agent": "MedicalAdviceAgent"}.
Example 2: Message: "What's the weather like in London?"
Output: {"intent": "GetWeather", "agent": "WeatherAgent"}.
Example 3: Message: "What's happening in Tokyo?"
Output: {"intent": "GetLocalInfo", "agent": "ComprehensiveLocationAgent"}.
Example 4: Message: "Give me local info about this area."
Output: {"intent": "GetLocalInfo", "agent": "ComprehensiveLocationAgent"}.
Example 5: Message: "Hey can you remind me to pick up groceries tomorrow morning"
Output: {"intent": "SetReminder", "agent": "ReminderAgent"}.
Example 6: Message: "Tell me a joke."
Output: {"intent": "CasualChat", "agent": "GeneralChatAgent"}.
Example 7: Message: "I want to take a personality quiz"
Output: {"intent": "TakePersonalityQuiz", "agent": "PersonalityAnalyzerAgent"}.
Example 8: Message: "Can you analyze my personality?"
Output: {"intent": "TakePersonalityQuiz", "agent": "PersonalityAnalyzerAgent"}.
Example 9: Message: "My tomato plant leaves have brown spots, can you tell what's wrong?"
Output: {"intent": "AnalyzeCrop", "agent": "CropAnalysisAgent"}.
Example 10: Message: "Here's a photo of my wheat crop, is it healthy?"
Output: {"intent": "AnalyzeCrop", "agent": "CropAnalysisAgent"}.
Example 11: Message: "How do I grow the best cucumbers in summer?"
Output: {"intent": "AnalyzeCrop", "agent": "CropAnalysisAgent"}.
Example 12: Message: "Share some tips for organic tomato cultivation."
Output: {"intent": "AnalyzeCrop", "agent": "CropAnalysisAgent"}.

### Message: "${messageContent}"
Output:
`;

    const { callWithRetryAndLimit } = require('./aiApiWrapper');
    const logger = require('./logger');
    try {
        const aiCall = async () => {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            return response.text();
        };
        const geminiText = await callWithRetryAndLimit(aiCall);
        logger.debug('Gemini Raw Response for Routing:', geminiText);
        let intentRecognitionResult;
        try {
            intentRecognitionResult = JSON.parse(geminiText.replace(/```json\n|\n```/g, '').trim());
        } catch (parseError) {
            logger.error('Error parsing Gemini JSON response for routing:', parseError);
            intentRecognitionResult = {
                intent: "ParsingError",
                agent: "CustomerSupportAgent"
            };
        }
        return intentRecognitionResult;
    } catch (error) {
        logger.error('Error calling Gemini API for intent recognition:', error);
        return { intent: "APIError", agent: "CustomerSupportAgent" }; // Fallback on API error
    }
}

module.exports = { getIntentAndAgent };
