// utils/scoring-service.js
// Handles personality trait scoring logic for the Personality Analyzer agent

const { getEmbedding } = require('./google-ai-service');

// Core personality trait expressions
const traitExpressions = {
    Openness: "likes trying new things and is imaginative",
    Conscientiousness: "pays attention to detail and is organized",
    Extraversion: "enjoys being with others and is outgoing",
    Agreeableness: "is cooperative, kind, and compassionate",
    Neuroticism: "often feels anxious, moody, or emotionally unstable"
};

// Module-level variable to store trait vectors
let traitVectors = {};

/**
 * Initializes the traitVectors object by embedding each trait expression.
 * Should be called at startup.
 */
async function initializeTraitVectors() {
    for (const [trait, expression] of Object.entries(traitExpressions)) {
        traitVectors[trait] = await getEmbedding(expression);
    }
}

/**
 * Calculates cosine similarity between two vectors.
 * @param {number[]} vecA
 * @param {number[]} vecB
 * @returns {number} Cosine similarity (0 to 1)
 */
function cosineSimilarity(vecA, vecB) {
    const dot = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    if (magA === 0 || magB === 0) return 0;
    return (dot / (magA * magB) + 1) / 2; // Normalize to 0-1
}

/**
 * Compares an answer's embedding to all trait vectors and returns the best match.
 * @param {number[]} answerVector
 * @returns {{ trait: string, score: number }}
 */
function compareWithTraits(answerVector) {
    let bestTrait = null;
    let bestScore = -Infinity;
    for (const [trait, vector] of Object.entries(traitVectors)) {
        const score = cosineSimilarity(answerVector, vector);
        if (score > bestScore) {
            bestScore = score;
            bestTrait = trait;
        }
    }
    return { trait: bestTrait, score: bestScore };
}

/**
 * Normalizes and assigns levels to each trait based on aggregated scores.
 * @param {Object} scores - { trait: totalScore, ... }
 * @returns {Object} - { trait: { value, level }, ... }
 */
function calculateResult(scores) {
    // Get min and max for normalization
    const values = Object.values(scores);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const result = {};
    for (const [trait, value] of Object.entries(scores)) {
        // Normalize to 0-1
        let norm = (max === min) ? 0.5 : (value - min) / (max - min);
        let level =
            norm <= 0.33 ? "Low" :
            norm <= 0.66 ? "Medium" :
            "High";
        result[trait] = { value: norm, level };
    }
    return result;
}

module.exports = {
    traitExpressions,
    traitVectors,
    initializeTraitVectors,
    cosineSimilarity,
    compareWithTraits,
    calculateResult
};
