const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('./logger');
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const embeddingModel = genAI.getGenerativeModel({ model: "embedding-001" });
async function getEmbedding(text) {
    try {
        const result = await embeddingModel.embedContent({ content: text });
        if (result && result.embedding && Array.isArray(result.embedding.values)) {
            return result.embedding.values;
        } else {
            throw new Error('Invalid embedding response');
        }
    } catch (error) {
        logger.error('Error getting embedding from Google Gemini:', error);
        throw error;
    }
}
module.exports = { getEmbedding };
