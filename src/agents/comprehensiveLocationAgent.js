
const { sendTextMessage } = require('../utils/whatsappApi');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
const {
    fetchWeatherByCoords,
    fetchLocalNews,
    fetchFamousPlaces,
    fetchCityFromCoordinates
} = require('../utils/apiCallers');
const logger = require('../utils/logger');


// Main handler for ComprehensiveLocationAgent
async function handleComprehensiveLocationInfo(senderWaId, messageContent = null, latitude = null, longitude = null) {
    logger.info(`[ComprehensiveLocationAgent] Handling request from ${senderWaId}. Lat: ${latitude}, Lon: ${longitude}, Message: "${messageContent}"`);

    let locationCity = null;
    let initialMessage = '';

    // Determine location based on input type
    if (latitude && longitude) {
        // Use the shared utility function to get city from coords
        locationCity = await fetchCityFromCoordinates(latitude, longitude);
        if (!locationCity) {
            await sendTextMessage(senderWaId, "I received your location, but I couldn't figure out the city name. Could you please specify a city?");
            return;
        }
        initialMessage = `Gathering information for ${locationCity}...`;
        logger.debug(`Detected city from coordinates: ${locationCity}`);
    } else {
        // If triggered by text without coordinates, prompt for location
        initialMessage = "To give you a comprehensive summary of everything happening, I need your location. Please share your live location via WhatsApp, or tell me a specific city!";
        await sendTextMessage(senderWaId, initialMessage);
        return; // Exit as we need location
    }

    if (!locationCity) {
        await sendTextMessage(senderWaId, "I couldn't determine the location. Please try again with a clear city name or by sharing your location.");
        return;
    }

    // Send initial gathering message
    await sendTextMessage(senderWaId, initialMessage);

    let weatherSummary = '';
    let newsSummary = '';
    let placesSummary = '';
    let eventsSummary = 'No specific local events found.'; // Placeholder for future events API

    // Fetch information concurrently using shared utility functions
    try {
        const [weather, news, places] = await Promise.all([
            fetchWeatherByCoords(latitude, longitude), // Use fetchWeatherByCoords from apiCallers
            fetchLocalNews(locationCity),
            fetchFamousPlaces(locationCity, latitude, longitude) // Use fetchFamousPlaces from apiCallers
            // If you add an events API, uncomment: getLocalEvents(locationCity)
        ]);

        weatherSummary = weather;
        newsSummary = news;
        placesSummary = places;

    } catch (error) {
        logger.error("Error fetching concurrent data for comprehensive location info:", error);
    }

    // --- Conditional Content for Summary Prompt ---
    let weatherSection = '';
    if (weatherSummary === "API_KEY_MISSING_WEATHER") {
        weatherSection = "Weather information is currently unavailable.";
    } else if (weatherSummary) {
        weatherSection = `Weather: ${weatherSummary}`;
    }

    let newsSection = '';
    if (newsSummary === "API_KEY_MISSING_NEWS") {
        newsSection = "Local news updates are currently unavailable.";
    } else if (newsSummary) {
        newsSection = `Local News:\n${newsSummary}`;
    }

    let placesSection = '';
    if (placesSummary === "API_KEY_MISSING_PLACES") {
        placesSection = "Information on famous places is currently unavailable.";
    } else if (placesSummary) {
        placesSection = `${placesSummary}`;
    }

    let eventsSection = '';
    if (eventsSummary && eventsSummary !== 'No specific local events found.') { // Adjust if events API is added
        eventsSection = `Local Events:\n${eventsSummary}`;
    } else {
        eventsSection = `Local Events: ${eventsSummary}`; // Keep the "No specific local events found." message
    }


    // Synthesize the response using Gemini with more detail and a summary section
    const summaryPrompt = `You are an AI assistant providing a comprehensive summary of a location.
    Combine the following pieces of information into a detailed, friendly, and well-structured response for the user about ${locationCity}.

    Structure your response using clear **headings** and **bullet points** under each section. Present all provided information, even if it's a "not found" message.

    - **Current Overview**: A brief opening statement about ${locationCity}.
    - **Weather**: Present weather information using bullet points.
    - **Local Highlights**: List famous places and notable features as bullet points.
    - **Local News**: Summarize key news items using bullet points.
    - **Local Events**: Present local event details in bullet points.
    - **Summary**: End with a concise, friendly summary encouraging exploration.

    Location: ${locationCity}
    
    ${weatherSection}
    
    ${newsSection}
    
    ${placesSection}

    ${eventsSection}
    
    Generate the complete summary:`;

    try {
        const result = await model.generateContent(summaryPrompt);
        const finalResponse = result.response.text();
        await sendTextMessage(senderWaId, finalResponse);
    } catch (error) {
        logger.error("Error synthesizing response with Gemini:", error);
        await sendTextMessage(senderWaId, "I fetched some information, but I'm having trouble summarizing it right now. Please try again shortly.");
    }
}

module.exports = {
    handleComprehensiveLocationInfo
};