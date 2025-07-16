const { getIntentAndAgent } = require('../src/utils/geminiRouter');

describe('Gemini Router AI Integration', () => {
  it('routes weather intent', async () => {
    const result = await getIntentAndAgent("What's the weather in Paris?");
    expect(result.intent).toBe('GetWeather');
    expect(result.agent).toBe('WeatherAgent');
  }, 15000);

  it('routes reminder intent', async () => {
    const result = await getIntentAndAgent("Remind me to call mom at 5pm");
    expect(result.intent).toBe('SetReminder');
    expect(result.agent).toBe('ReminderAgent');
  }, 15000);

  it('handles AI error gracefully', async () => {
    // Simulate by passing nonsense or disconnecting API key
    const result = await getIntentAndAgent("");
    expect(result.agent).toBeDefined();
  }, 15000);
});
