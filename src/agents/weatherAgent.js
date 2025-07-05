// agents/weatherAgent.js
const { sendTextMessage } = require('../utils/whatsappApi'); // Ensure path is correct
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
// NEW IMPORT
const { fetchWeatherByCity } = require('../utils/apiCallers');


async function handleWeather(senderWaId, messageContent) {
    console.log(`[WeatherAgent] Handling request from ${senderWaId}: "${messageContent}"`);

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
        const result = await model.generateContent(locationPrompt);
        const responseText = result.response.text();
        console.log("Gemini Location Extraction Raw Response:", responseText);
        const parsedResult = JSON.parse(responseText.replace(/```json\n|\n```/g, '').trim());
        locationQuery = parsedResult.location;

    } catch (error) {
        console.error("Error extracting location with Gemini:", error);
        await sendTextMessage(senderWaId, "I had trouble figuring out the location for your weather request. Could you please specify a city?");
        return;
    }

    if (locationQuery === "no_location_specified") {
        await sendTextMessage(senderWaId, "I can tell you the weather, but I need a specific city! Please tell me which city you're interested in.");
        return;
    }

    // Call the shared utility function
    const weatherResponse = await fetchWeatherByCity(locationQuery);

    // Check if the utility function returned an API key missing error
    if (weatherResponse === "API_KEY_MISSING_WEATHER") {
        await sendTextMessage(senderWaId, "I'm sorry, the weather service is currently unavailable due to a configuration issue. Please try again later.");
    } else {
        await sendTextMessage(senderWaId, weatherResponse);
    }
}

module.exports = {
    handleWeather
};