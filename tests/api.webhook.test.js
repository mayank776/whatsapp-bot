const request = require('supertest');
const express = require('express');
const { handleWebhookEvent } = require('../src/routes/webhook');

const app = express();
app.use(express.json());
app.post('/webhook', handleWebhookEvent);

describe('POST /webhook', () => {
  it('returns 400 for invalid payload', async () => {
    const res = await request(app).post('/webhook').send({ foo: 'bar' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid webhook payload');
  });

  it('returns 200 for valid WhatsApp webhook payload', async () => {
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
              },
            },
          ],
        },
      ],
    };
    const res = await request(app).post('/webhook').send(valid);
    expect(res.status).toBe(200);
  });
});
