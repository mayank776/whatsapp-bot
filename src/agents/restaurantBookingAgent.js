
const { sendTextMessage } = require('../utils/whatsappApi');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
const logger = require('../utils/logger');


async function handleRestaurantBooking(senderWaId, messageContent) {
    logger.info(`[RestaurantBookingAgent] Handling request from ${senderWaId}: "${messageContent}"`);
    const extractionPrompt = `Extract the following entities from the user's message related to a restaurant booking request:
    - date (e.g., "today", "tomorrow", "July 5th")
    - time (e.g., "7 PM", "19:00")
    - guests (number of people, e.g., "2", "four")
    - restaurant_name (the name of the restaurant, if mentioned)

    Your output must be a JSON object. If an entity is not found, use an empty string or null.

    Example:
    Message: "Book a table for 4 at 8 PM at Italian Bistro tomorrow"
    Output: {"date": "tomorrow", "time": "8 PM", "guests": "4", "restaurant_name": "Italian Bistro"}

    Message: "I want to reserve for two people on Friday at 7:30pm"
    Output: {"date": "Friday", "time": "7:30pm", "guests": "2", "restaurant_name": null}

    Message: "${messageContent}"
    Output:`;
    let bookingDetails = {};
    try {
        const result = await model.generateContent(extractionPrompt);
        const responseText = result.response.text();
        logger.debug("Gemini Extraction Raw Response:", responseText);
        bookingDetails = JSON.parse(responseText.replace(/```json\n|\n```/g, '').trim());
        bookingDetails.date = bookingDetails.date || 'today';
        bookingDetails.time = bookingDetails.time || 'unknown';
        bookingDetails.guests = bookingDetails.guests || 'unknown';
        bookingDetails.restaurant_name = bookingDetails.restaurant_name || 'your restaurant';
    } catch (error) {
        logger.error("Error extracting booking details with Gemini:", error);
        await sendTextMessage(senderWaId, "I apologize, I had trouble understanding the booking details. Could you please rephrase your request, including the date, time, and number of guests?");
        return;
    }
    logger.info(`Attempting to book: ${JSON.stringify(bookingDetails)}`);
    const success = Math.random() > 0.3;
    if (success) {
        const confirmationMessage = `Great! I'm attempting to book a table for ${bookingDetails.guests} at ${bookingDetails.restaurant_name} on ${bookingDetails.date} at ${bookingDetails.time}. Please wait for a final confirmation.`;
        await sendTextMessage(senderWaId, confirmationMessage);
    } else {
        await sendTextMessage(senderWaId, "I'm sorry, I couldn't process your booking at this moment. The restaurant might be fully booked or there was an issue with the system. Please try again later or call us directly.");
    }
}

module.exports = {
    handleRestaurantBooking
};