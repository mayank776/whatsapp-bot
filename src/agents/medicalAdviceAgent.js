/**
 * MedicalAdviceAgent.js (RAG-Powered)
 *
 * This agent uses a Retrieval-Augmented Generation (RAG) architecture to handle medical inquiries.
 *
 * RAG Architecture Flow:
 * 1.  NLU (Natural Language Understanding): A Gemini LLM call extracts structured medical entities (symptoms, duration) from the user's unstructured message.
 * 2.  Retrieval: The extracted entities are used to retrieve a relevant, pre-vetted document from a curated internal `knowledgeBase`. This acts as our safe and trusted information source.
 * 3.  Generation: The retrieved document is passed as context to a second Gemini LLM call, which generates a high-quality, conversational, and empathetic response grounded in the trusted information.
 *
 * This approach ensures responses are both intelligent and safe, preventing LLM hallucinations and providing reliable information.
 */

const { sendTextMessage } = require('../utils/whatsappApi');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize the Google Generative AI client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });


class MedicalAdviceAgent {
    /**
     * The constructor initializes the agent, loading the medical knowledge base.
     */
    constructor() {
        // The knowledge base is our trusted vector for the "Retrieval" step.
        // In a larger system, this would be a dedicated vector database (e.g., Pinecone, ChromaDB).
        this.knowledgeBase = [
            {
                condition: "Common Cold",
                symptoms: ["runny nose", "sneezing", "sore throat", "congestion", "cough", "slight body aches", "watery eyes"],
                information: "The common cold is a mild viral infection of your nose and throat. It's very common and usually harmless, though it can be bothersome.",
                recommendation: "Most colds resolve on their own within a week to 10 days. Rest, hydration, and over-the-counter remedies can help manage symptoms. If your symptoms persist for more than 10 days or you develop a high fever, you should consult a doctor."
            },
            {
                condition: "Influenza (Flu)",
                symptoms: ["fever", "body aches", "fatigue", "headache", "dry cough", "sore throat", "chills"],
                information: "Influenza, or the flu, is a contagious respiratory illness caused by influenza viruses. It can cause mild to severe illness and can sometimes lead to serious complications.",
                recommendation: "It's important to rest and drink plenty of fluids. While many can recover at home, the flu can be serious. You should consult a doctor, especially if you are in a high-risk group, your fever is very high, or you have difficulty breathing."
            },
            {
                condition: "Seasonal Allergies",
                symptoms: ["itchy eyes", "watery eyes", "frequent sneezing", "runny nose", "nasal congestion", "itchy throat"],
                information: "Seasonal allergies, sometimes called hay fever, are an immune system response to airborne allergens like pollen or dust. They are not caused by a virus.",
                recommendation: "Avoiding allergens and using over-the-counter antihistamines can often manage symptoms. If your symptoms are persistent and disrupt your daily life, consulting a doctor can help you get a proper diagnosis and a more effective treatment plan."
            }
        ];

        this.disclaimer = "IMPORTANT: I am an AI assistant, not a medical professional. This information is not a substitute for professional medical advice, diagnosis, or treatment. Please consult a doctor for any health concerns. If you believe you are having a medical emergency, call your local emergency services immediately.\n\n";
    }

    /**
     * STEP 1: NLU - Extracts structured entities from the user's message using an LLM.
     * @param {string} message - The user's input message.
     * @returns {Promise<object|null>} A promise that resolves to an object with extracted symptoms, or null.
     */
    async _extractEntitiesWithLLM(message) {
        logger.info("[MedicalAdviceAgent] Step 1: Extracting entities with LLM...");
        const prompt = `Analyze the following user message and extract any medical symptoms mentioned. Return a JSON object with a single key "symptoms" which is an array of strings. If no symptoms are found, the array should be empty.
        
        Examples:
        - Message: "I have a bad headache and a fever" -> {"symptoms": ["headache", "fever"]}
        - Message: "i've been sneezing a lot and my throat hurts" -> {"symptoms": ["sneezing", "sore throat"]}
        - Message: "what time is it?" -> {"symptoms": []}

        Message: "${message}"
        JSON Output:`;

        try {
            const result = await model.generateContent(prompt);
            const text = result.response.text().replace(/```json|```/g, '').trim();
            const parsed = JSON.parse(text);
            logger.debug(`[MedicalAdviceAgent] Extracted entities:`, parsed.symptoms);
            return parsed.symptoms.length > 0 ? parsed : null;
        } catch (error) {
            logger.error("[MedicalAdviceAgent] Error in LLM entity extraction:", error);
            return null;
        }
    }

    /**
     * STEP 2: Retrieval - Finds the best matching condition from the knowledge base.
     * @param {string[]} symptoms - An array of symptoms extracted by the LLM.
     * @returns {object|null} The best matching condition object.
     */
    _findBestMatch(symptoms) {
        logger.info("[MedicalAdviceAgent] Step 2: Retrieving best match from knowledge base...");
        if (!symptoms || symptoms.length === 0) return null;

        let bestMatch = { score: 0, condition: null };

        this.knowledgeBase.forEach(condition => {
            let currentScore = 0;
            symptoms.forEach(symptom => {
                // Use a more robust check for partial matches
                if (condition.symptoms.some(kbSymptom => kbSymptom.includes(symptom) || symptom.includes(kbSymptom))) {
                    currentScore++;
                }
            });

            if (currentScore > bestMatch.score) {
                bestMatch = { score: currentScore, condition: condition };
            }
        });
        
        if (bestMatch.condition) {
            logger.debug(`[MedicalAdviceAgent] Found best match: ${bestMatch.condition.condition} with score ${bestMatch.score}`);
        }
        return bestMatch.score > 0 ? bestMatch.condition : null;
    }

    /**
     * STEP 3: Generation - Generates a final response using the LLM with retrieved context.
     * @param {object} context - The matched condition object from the knowledge base.
     * @param {string} originalMessage - The user's original message.
     * @returns {Promise<string>} A promise that resolves to the final, generated response.
     */
    async _generateResponseWithLLM(context, originalMessage) {
        logger.info("[MedicalAdviceAgent] Step 3: Generating final response with LLM...");
        const prompt = `You are a caring and empathetic AI health assistant. Your goal is to provide a helpful, conversational response based *only* on the trusted information provided. Do not add any medical advice that is not in the context.

        User's Message: "${originalMessage}"
        
        Trusted Context:
        - Condition: "${context.condition}"
        - Information: "${context.information}"
        - Recommendation: "${context.recommendation}"

        Task:
        1. Acknowledge the user's symptoms in a caring way.
        2. Explain that based on their symptoms, you have some information about a possible related condition, mentioning the condition by name.
        3. Present the "Information" and "Recommendation" from the trusted context in a natural, conversational tone.
        4. Conclude by asking if they would like help finding a local clinic or doctor.
        
        Your Response:`;

        try {
            const result = await model.generateContent(prompt);
            return result.response.text();
        } catch (error) {
            logger.error("[MedicalAdviceAgent] Error in LLM response generation:", error);
            // Fallback to a template-based response if generation fails
            return `Based on your symptoms, here is some information about ${context.condition}: ${context.information}. It is generally recommended that ${context.recommendation}. Would you like help finding a doctor?`;
        }
    }

    /**
     * Main orchestration logic for handling a user message.
     * @param {string} messageContent - The raw message from the user.
     * @returns {Promise<string>} The complete, formatted response.
     */
    async processMessage(messageContent) {
        // Step 1: Extract entities using LLM
        const entities = await this._extractEntitiesWithLLM(messageContent);
        if (!entities) {
            const fallbackResponse = "I understand you have a health concern, but I couldn't identify specific symptoms from your message. For any medical questions, it's always best to consult with a healthcare professional.\n\nWould you like me to help you find a clinic or doctor near you?";
            return this.disclaimer + fallbackResponse;
        }

        // Step 2: Retrieve the best match from our trusted knowledge base
        const matchedCondition = this._findBestMatch(entities.symptoms);

        if (matchedCondition) {
            // Step 3: Generate a high-quality response using the retrieved context
            const generatedText = await this._generateResponseWithLLM(matchedCondition, messageContent);
            return this.disclaimer + generatedText;
        } else {
            const fallbackResponse = "I see you've mentioned some symptoms, but I couldn't match them to a specific condition in my knowledge base. For an accurate diagnosis, it is essential to speak with a doctor.\n\nWould you like me to help you find a local clinic?";
            return this.disclaimer + fallbackResponse;
        }
    }
}

/**
 * Main handler function for the MedicalAdviceAgent.
 * This function is called when a message is routed to this agent.
 * @param {string} senderWaId - The WhatsApp ID of the user.
 * @param {string} messageContent - The content of the user's message.
 */
async function handleMedicalAdvice(senderWaId, messageContent) {
    logger.info(`[MedicalAdviceAgent] Handling RAG request from ${senderWaId}: "${messageContent}"`);

    try {
        const agent = new MedicalAdviceAgent();
        const responseText = await agent.processMessage(messageContent);
        await sendTextMessage(senderWaId, responseText);
    } catch (error) {
        logger.error("[MedicalAdviceAgent] Critical error in handleMedicalAdvice:", error);
        await sendTextMessage(senderWaId, "I'm sorry, I encountered an error while processing your request. Please try again later.");
    }
}

module.exports = {
    handleMedicalAdvice
};
