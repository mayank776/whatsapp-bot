// agents/weatherAgent.js
const { sendTextMessage } = require('../utils/whatsappApi');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Use the same or another model
const axios = require('axios'); // For external weather API call (if you use one)

// You'd typically use a real weather API here like OpenWeatherMap, AccuWeather, etc.
// For this example, we'll simulate or use Gemini directly.
// const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY; // If you use OpenWeatherMap

async function handleWeather(senderWaId, messageContent) {
    console.log(`[WeatherAgent] Handling request from ${senderWaId}: "${messageContent}"`);

    let location = 'your current location'; // Default location

    // Use Gemini to extract location
    const locationPrompt = `Extract the location from the following message for a weather inquiry. If no specific location is mentioned, assume "current location".
    Your output must be a JSON object with the key "location".

    Example:
    Message: "What's the weather like in London?"
    Output: {"location": "London"}

    Message: "Is it raining?"
    Output: {"location": "current location"}

    Message: "${messageContent}"
    Output:`;

    try {
        const result = await model.generateContent(locationPrompt);
        const responseText = result.response.text();
        console.log("Gemini Location Extraction Raw Response:", responseText);
        const parsedResult = JSON.parse(responseText.replace(/```json\n|\n```/g, '').trim());
        location = parsedResult.location || location;

    } catch (error) {
        console.error("Error extracting location with Gemini:", error);
        // Fallback to a default location or ask user to clarify
        await sendTextMessage(senderWaId, "I had trouble figuring out the location for your weather request. Could you please specify which city?");
        return;
    }

    let weatherResponse = '';
    try {
        // Option 1: Use a real weather API (recommended for production)
        // const weatherApiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&appid=${OPENWEATHER_API_KEY}&units=metric`;
        // const apiResponse = await axios.get(weatherApiUrl);
        // const temp = apiResponse.data.main.temp;
        // const description = apiResponse.data.weather[0].description;
        // weatherResponse = `The weather in ${location} is ${description} with a temperature of ${temp}°C.`;

        // Option 2: Use Gemini to generate a weather response (simulated, less accurate than real API)
        const geminiWeatherPrompt = `Generate a concise weather report for "${location}". Mention temperature, conditions, and if it's likely to rain. Invent realistic but brief details if no external data is available.`;
        const geminiResult = await model.generateContent(geminiWeatherPrompt);
        weatherResponse = geminiResult.response.text();

    } catch (error) {
        console.error("Error fetching/generating weather info:", error);
        weatherResponse = "I'm sorry, I couldn't fetch the weather information right now. Please try again later.";
    }

    await sendTextMessage(senderWaId, weatherResponse);
}

module.exports = {
    handleWeather
};