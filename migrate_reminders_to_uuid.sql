-- Migration script: convert reminders.id to UUID
-- WARNING: This will drop and recreate the reminders table, deleting all data!

DROP TABLE IF EXISTS reminders;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE TABLE reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    scheduled_time TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
