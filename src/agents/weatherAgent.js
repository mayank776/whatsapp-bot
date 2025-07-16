

const { sendTextMessage } = require('../utils/whatsappApi');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { callWithRetryAndLimit } = require('../utils/aiApiWrapper');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
const { fetchWeatherByCity } = require('../utils/apiCallers');
const logger = require('../utils/logger');

async function handleWeather(senderWaId, messageContent) {
    logger.info(`[WeatherAgent] Handling request from ${senderWaId}: "${messageContent}"`);
    let locationQuery = '';
    const locationPrompt = `Extract the most specific location (city and/or country) from the user's weather inquiry. If no specific location is mentioned or if the user asks for "my current location", return "no_location_specified".
    Your output must be a JSON object with the key "location".

    Example:
    Message: "What's the weather like in London?"
    Output: {"location": "London"}

    Message: "Is it raining where I am?"
    Output: {"location": "no_location_specified"}

    Message: "Weather in Tokyo, Japan"
    Output: {"location": "Tokyo, Japan"}

    Message: "${messageContent}"
    Output:`;
    try {
        const aiCall = async () => {
            const result = await model.generateContent(locationPrompt);
            return result.response.text();
        };
        const responseText = await callWithRetryAndLimit(aiCall);
        logger.debug("Gemini Location Extraction Raw Response:", responseText);
        const parsedResult = JSON.parse(responseText.replace(/```json\n|\n```/g, '').trim());
        locationQuery = parsedResult.location;
    } catch (error) {
        logger.error("Error extracting location with Gemini:", error);
        await sendTextMessage(senderWaId, "I had trouble figuring out the location for your weather request. Could you please specify a city?");
        return;
    }
    if (locationQuery === "no_location_specified") {
        await sendTextMessage(senderWaId, "I can tell you the weather, but I need a specific city! Please tell me which city you're interested in.");
        return;
    }
    const weatherResponse = await fetchWeatherByCity(locationQuery);
    if (weatherResponse === "API_KEY_MISSING_WEATHER") {
        await sendTextMessage(senderWaId, "I'm sorry, the weather service is currently unavailable due to a configuration issue. Please try again later.");
    } else {
        await sendTextMessage(senderWaId, weatherResponse);
    }
}

module.exports = {
    handleWeather
};