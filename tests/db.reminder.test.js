const { addReminder, getRemindersByUserId, deleteReminder, clearAllReminders, initializeDbSchema } = require('../src/utils/db');

describe('Reminder DB Integration', () => {
  beforeAll(async () => {
    await initializeDbSchema();
    await clearAllReminders();
  });

  it('adds and fetches a reminder', async () => {
    const reminder = { userId: 'user-123', message: 'Test reminder', scheduledTime: new Date().toISOString() };
    const created = await addReminder(reminder);
    expect(created).toHaveProperty('id');
    const reminders = await getRemindersByUserId('user-123');
    expect(reminders.length).toBeGreaterThan(0);
    expect(reminders[0].message).toBe('Test reminder');
  });

  it('deletes a reminder', async () => {
    const reminders = await getRemindersByUserId('user-123');
    expect(reminders.length).toBeGreaterThan(0);
    await deleteReminder(reminders[0].id);
    const afterDelete = await getRemindersByUserId('user-123');
    expect(afterDelete.length).toBe(0);
  });
});
