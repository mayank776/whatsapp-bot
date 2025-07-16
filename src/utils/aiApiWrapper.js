/**
 * Analyze crop image using Gemini Vision API
 * @param {Object} params
 * @param {string} params.imageUrl - Publicly accessible image URL
 * @param {string} [params.cropType]
 * @param {string} [params.location]
 * @param {string} [params.growthStage]
 * @returns {Promise<Object>} Analysis result
 */
async function analyzeCropImageWithGemini({ imageUrl, cropType, location, growthStage }) {
    // TODO: Replace with your Gemini Vision API key and endpoint
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent';

    if (!GEMINI_API_KEY) {
        throw new Error('Gemini API key not set in environment variables');
    }
    if (!imageUrl) {
        throw new Error('Image URL is required for crop analysis');
    }

    // Prepare Gemini Vision API request
    const prompt = [
        { "text": `You are an expert crop disease and pest analysis agent. Analyze the attached crop image. If possible, identify the crop type, any diseases, pests, or nutrient deficiencies, and provide actionable recommendations. If the crop type is known, it is: ${cropType || 'unknown'}. Location: ${location || 'unknown'}. Growth stage: ${growthStage || 'unknown'}.` },
        { "image": { "url": imageUrl } }
    ];

    try {
        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: prompt })
            }
        );
        if (!response.ok) {
            throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        // Parse Gemini response (assume text output)
        // You may want to parse structured output if your prompt is designed for it
        let summary = (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0].text) || 'No analysis result.';
        // Try to extract structured info (very basic, for demo)
        return {
            crop_type: cropType || 'unknown',
            detected_issues: [],
            recommendations: [summary],
            processing_time: 2.0,
            timestamp: new Date().toISOString()
        };
    } catch (err) {
        throw new Error('Failed to analyze crop image with Gemini: ' + err.message);
    }
}

// aiApiWrapper.js
const Bottleneck = require('bottleneck');
const logger = require('./logger');

// Create a rate limiter: 5 requests per second, burst up to 10
const limiter = new Bottleneck({
  minTime: 200, // 5 per second
  maxConcurrent: 2,
  reservoir: 10, // initial burst
  reservoirRefreshAmount: 10,
  reservoirRefreshInterval: 1000, // every second
});

/**
 * Wraps an async AI API call with retry and rate limiting.
 * Retries on 429/5xx errors up to 3 times with exponential backoff.
 * @param {Function} fn - The AI API call (must return a Promise)
 * @param {Array} args - Arguments to pass to the function
 * @returns {Promise<any>}
 */
async function callWithRetryAndLimit(fn, args = []) {
  let attempt = 0;
  let lastError;
  while (attempt < 3) {
    try {
      return await limiter.schedule(() => fn(...args));
    } catch (err) {
      lastError = err;
      if (err.response && (err.response.status === 429 || err.response.status >= 500)) {
        const delay = Math.pow(2, attempt) * 500;
        logger.warn(`[AI API] Attempt ${attempt + 1} failed with status ${err.response.status}. Retrying in ${delay}ms.`);
        await new Promise(res => setTimeout(res, delay));
        attempt++;
      } else {
        logger.error('[AI API] Non-retryable error:', err);
        throw err;
      }
    }
  }
  logger.error('[AI API] All retry attempts failed:', lastError);
  throw lastError;
}

module.exports = { callWithRetryAndLimit , analyzeCropImageWithGemini };
