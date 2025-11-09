-- Baby Baton Database Schema - Initial Migration with Family Support

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Families table (NEW)
CREATE TABLE families (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    baby_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT families_name_unique UNIQUE (name)
);

-- Case-insensitive lookup for family names
CREATE UNIQUE INDEX idx_families_name_lower ON families(LOWER(name));

-- Caregivers table (UPDATED - now includes family_id)
CREATE TABLE caregivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    device_id VARCHAR(255) NOT NULL,
    device_name VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Device can only belong to one family at a time
CREATE UNIQUE INDEX idx_caregivers_device_id ON caregivers(device_id);

-- Index for family lookups
CREATE INDEX idx_caregivers_family_id ON caregivers(family_id);

-- Care sessions table (UPDATED - now includes family_id)
CREATE TABLE care_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    caregiver_id UUID NOT NULL REFERENCES caregivers(id),
    family_id UUID NOT NULL REFERENCES families(id),
    status VARCHAR(20) NOT NULL CHECK (status IN ('in_progress', 'completed')),
    started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_care_sessions_status ON care_sessions(status);
CREATE INDEX idx_care_sessions_caregiver ON care_sessions(caregiver_id);
CREATE INDEX idx_care_sessions_family ON care_sessions(family_id);
CREATE INDEX idx_care_sessions_started_at ON care_sessions(started_at DESC);
CREATE INDEX idx_care_sessions_family_status ON care_sessions(family_id, status);

-- Activities table
CREATE TABLE activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    care_session_id UUID NOT NULL REFERENCES care_sessions(id) ON DELETE CASCADE,
    activity_type VARCHAR(20) NOT NULL CHECK (activity_type IN ('feed', 'diaper', 'sleep')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activities_session ON activities(care_session_id);
CREATE INDEX idx_activities_type ON activities(activity_type);
CREATE INDEX idx_activities_created_at ON activities(created_at DESC);

-- Feed details table
CREATE TABLE feed_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    amount_ml INTEGER CHECK (amount_ml > 0),
    feed_type VARCHAR(20) CHECK (feed_type IN ('breast_milk', 'formula')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_feed_details_activity ON feed_details(activity_id);
CREATE INDEX idx_feed_details_start_time ON feed_details(start_time DESC);

-- Diaper details table
CREATE TABLE diaper_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    changed_at TIMESTAMP NOT NULL,
    had_poop BOOLEAN NOT NULL DEFAULT false,
    had_pee BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_diaper_details_activity ON diaper_details(activity_id);
CREATE INDEX idx_diaper_details_changed_at ON diaper_details(changed_at DESC);

-- Sleep details table
CREATE TABLE sleep_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    duration_minutes INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sleep_details_activity ON sleep_details(activity_id);
CREATE INDEX idx_sleep_details_start_time ON sleep_details(start_time DESC);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers to auto-update updated_at
CREATE TRIGGER update_families_updated_at BEFORE UPDATE ON families
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_caregivers_updated_at BEFORE UPDATE ON caregivers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_care_sessions_updated_at BEFORE UPDATE ON care_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_activities_updated_at BEFORE UPDATE ON activities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feed_details_updated_at BEFORE UPDATE ON feed_details
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_diaper_details_updated_at BEFORE UPDATE ON diaper_details
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sleep_details_updated_at BEFORE UPDATE ON sleep_details
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();