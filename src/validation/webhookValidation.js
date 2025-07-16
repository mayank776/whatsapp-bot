// webhookValidation.js
const { z } = require('zod');

// WhatsApp webhook event schema
const webhookEventSchema = z.object({
  object: z.string(),
  entry: z.array(
    z.object({
      id: z.string(),
      changes: z.array(
        z.object({
          field: z.string(),
          value: z.object({
            messages: z.array(z.any()).optional(),
            statuses: z.array(z.any()).optional(),
          }).passthrough(),
        })
      ),
    })
  ),
});

module.exports = {
  webhookEventSchema,
};
