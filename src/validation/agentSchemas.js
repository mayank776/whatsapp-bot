// Centralized validation schemas for agent-related handlers
const Joi = require('joi');

// Reminder creation schema
const reminderSchema = Joi.object({
  userId: Joi.string().required(),
  message: Joi.string().min(1).max(255).required(),
  scheduledTime: Joi.date().iso().required(),
});

// Restaurant booking schema
const restaurantBookingSchema = Joi.object({
  userId: Joi.string().required(),
  restaurantName: Joi.string().min(1).max(255).required(),
  bookingTime: Joi.date().iso().required(),
  numberOfPeople: Joi.number().integer().min(1).required(),
});

// General chat schema (example: just a message)
const generalChatSchema = Joi.object({
  userId: Joi.string().required(),
  message: Joi.string().min(1).required(),
});

// Customer support schema (example: just a message)
const customerSupportSchema = Joi.object({
  userId: Joi.string().required(),
  message: Joi.string().min(1).required(),
});

// Add more schemas for other agents as needed

// Crop Analysis Schema (basic, for MVP)
const cropAnalysisSchema = {
  validate: ({ userId, message }) => {
    if (!userId || typeof userId !== 'string') {
      return { error: { message: 'Invalid or missing userId' } };
    }
    if (!message || typeof message !== 'string') {
      return { error: { message: 'Invalid or missing message' } };
    }
    // Optionally, check for image URL or crop keywords
    return { value: { userId, message } };
  }
};

module.exports = {
  reminderSchema,
  restaurantBookingSchema,
  generalChatSchema,
  customerSupportSchema,
  cropAnalysisSchema
};
