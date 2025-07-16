// agents/agricultureAgent.js
// Crop Analysis Agent: Handles crop image analysis and recommendations

const logger = require('../utils/logger');

/**
 * Handles crop analysis requests.
 * @param {string} senderWaId - WhatsApp user ID
 * @param {string} messageContent - User message (should include image URL or description)
 * @returns {Promise<void>}
 */

// Integrate Gemini Vision API for crop image analysis
const { analyzeCropImageWithGemini } = require('../utils/aiApiWrapper');

/**
 * Handles crop analysis requests with Gemini Vision API support.
 * @param {string} senderWaId - WhatsApp user ID
 * @param {string|object} messageContent - User message (should include image URL or description)
 *        If object: { imageUrl: string, cropType?: string, location?: string, growthStage?: string }
 *        If string: fallback to text-based analysis
 * @returns {Promise<void>}
 */
async function handleCropAnalysis(senderWaId, messageContent) {
    try {
        const { sendTextMessage } = require('../utils/whatsappApi');
        let analysisResult;
        let imageUrl = null;
        let cropType = null;
        let location = null;
        let growthStage = null;
        let isImageRequest = false;

        // Support both string and object messageContent
        if (typeof messageContent === 'object' && messageContent !== null) {
            imageUrl = messageContent.imageUrl;
            cropType = messageContent.cropType;
            location = messageContent.location;
            growthStage = messageContent.growthStage;
            isImageRequest = !!imageUrl;
        } else if (typeof messageContent === 'string') {
            // Try to extract image URL from string (very basic)
            const urlMatch = messageContent.match(/https?:\/\/[\w\-./?%&=]+\.(jpg|jpeg|png|webp)/i);
            if (urlMatch) {
                imageUrl = urlMatch[0];
                isImageRequest = true;
            } else {
                cropType = messageContent;
            }
        }

        if (isImageRequest && imageUrl) {
            // Use Gemini Vision API for image analysis
            analysisResult = await analyzeCropImageWithGemini({
                imageUrl,
                cropType,
                location,
                growthStage
            });
        } else {
            // Fallback: text-based mock analysis
            if (typeof cropType === 'string' && cropType.toLowerCase().includes('tomato')) {
                analysisResult = {
                    crop_type: 'tomato',
                    detected_issues: [
                        {
                            type: 'disease',
                            name: 'late_blight',
                            confidence: 0.92,
                            severity: 'moderate',
                            affected_area: 15.5
                        }
                    ],
                    recommendations: [
                        'Remove affected leaves',
                        'Apply copper-based fungicide',
                        'Avoid overhead watering',
                        'Rotate crops next season'
                    ],
                    processing_time: 1.2,
                    timestamp: new Date().toISOString()
                };
            } else {
                analysisResult = {
                    crop_type: cropType || 'unknown',
                    detected_issues: [],
                    recommendations: [
                        'Unable to identify crop or issue. Please upload a clear image or specify the crop type.'
                    ],
                    processing_time: 0.8,
                    timestamp: new Date().toISOString()
                };
            }
        }

        // Send analysis summary to user
        let reply = `Crop Analysis Report\n`;
        reply += `Crop: ${analysisResult.crop_type}\n`;
        if (analysisResult.detected_issues && analysisResult.detected_issues.length > 0) {
            reply += `Detected Issues:\n`;
            analysisResult.detected_issues.forEach((issue, idx) => {
                reply += `  ${idx + 1}. ${issue.type} - ${issue.name} (Confidence: ${(issue.confidence * 100).toFixed(1)}%, Severity: ${issue.severity})\n`;
            });
        } else {
            reply += `No issues detected.\n`;
        }
        reply += `Recommendations:\n`;
        (analysisResult.recommendations || []).forEach((rec, idx) => {
            reply += `  ${idx + 1}. ${rec}\n`;
        });
        await sendTextMessage(senderWaId, reply);
    } catch (error) {
        logger.error('Error in handleCropAnalysis:', error);
        const { sendTextMessage } = require('../utils/whatsappApi');
        await sendTextMessage(senderWaId, 'Sorry, an error occurred while analyzing your crop. Please try again later.');
    }
}

module.exports = {
    handleCropAnalysis
};
