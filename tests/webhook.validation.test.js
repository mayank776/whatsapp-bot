const { webhookEventSchema } = require('../src/validation/webhookValidation');

describe('Webhook Event Validation', () => {
  it('accepts a valid WhatsApp webhook payload', () => {
    const valid = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'entry-id',
          changes: [
            {
              field: 'messages',
              value: {
                messages: [{ id: 'msg1' }],
                statuses: [{ id: 'status1' }],
              },
            },
          ],
        },
      ],
    };
    const result = webhookEventSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('rejects an invalid payload', () => {
    const invalid = { foo: 'bar' };
    const result = webhookEventSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});
