// agents/personality-agent.js
// Manages the personality quiz session for each user
const { getEmbedding } = require('../utils/google-ai-service');
const { compareWithTraits, calculateResult } = require('../utils/scoring-service');
const questions = require('../data/questions.json');

// In-memory session store
const userSessions = new Map();

/**
 * Helper function to create the structured payload for an interactive question.
 * This avoids duplicating code.
 * @param {number} index - The index of the question in the questions.json array.
 * @returns {object} A structured object representing an interactive message.
 */
function getQuestionPayload(index) {
    const question = questions[index];
    return {
        type: 'interactive', // Specify the message type
        content: {
            body: `Question ${index + 1}/${questions.length}:\n${question.question}`,
            buttons: [
                { id: `${question.id}_a`, title: question.options.A },
                { id: `${question.id}_b`, title: question.options.B },
            ],
        },
    };
}

/**
 * Starts a new quiz session for the user.
 * (No changes needed here)
 */
function startQuiz(userId) {
    userSessions.set(userId, {
        questionIndex: 0,
        scores: {
            Openness: 0,
            Conscientiousness: 0,
            Extraversion: 0,
            Agreeableness: 0,
            Neuroticism: 0
        }
    });
}

/**
 * Returns the payload for Question 1.
 * CHANGE: Now returns a structured object by calling our new helper function.
 */
function getFirstQuestion() {
    return getQuestionPayload(0);
}

/**
 * Checks if the user is currently in a quiz session.
 * (No changes needed here)
 */
function isUserInQuiz(userId) {
    return userSessions.has(userId);
}

/**
 * Handles a user's answer and returns the next step as a structured object.
 * CHANGE: This function now returns objects instead of strings.
 * @param {string} userId
 * @param {string} answerText - This will be the title of the button the user clicks.
 * @returns {Promise<object>} A structured message object.
 */
async function handleAnswer(userId, answerText) {
    const session = userSessions.get(userId);
    // CHANGE: Return a structured text message for errors.
    if (!session) return { type: 'text', content: "No active quiz session. Please type 'start' to begin." };

    // Get embedding for the answer
    let answerVector;
    try {
        answerVector = await getEmbedding(answerText);
    } catch (e) {
        // CHANGE: Return a structured text message for errors.
        return { type: 'text', content: "Sorry, there was an error processing your answer. Please try again." };
    }

    // Find best matching trait and update score
    const { trait, score } = compareWithTraits(answerVector);
    session.scores[trait] += score;

    // Move to next question
    session.questionIndex++;

    if (session.questionIndex < questions.length) {
        // CHANGE: Return the next question as an interactive payload.
        return getQuestionPayload(session.questionIndex);
    } else {
        // Quiz complete
        const result = calculateResult(session.scores);
        userSessions.delete(userId); // Clean up the session

        // Format the final message
        let msg = "✨ Your Personality Profile is Ready! ✨\n\n";
        // Assuming your calculateResult returns an object like { Openness: { value: 0.8, level: 'High' } }
        for (const [trait, details] of Object.entries(result)) {
            msg += `• *${trait}*: ${details.level}\n`;
        }
        msg += "\nType 'start' to take the quiz again!";
        
        // CHANGE: Return the final result as a structured text message.
        return { type: 'text', content: msg };
    }
}

module.exports = {
    startQuiz,
    handleAnswer,
    getFirstQuestion,
    isUserInQuiz
};