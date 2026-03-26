-- Add users table and update caregivers for user-based auth
-- Part of auth migration (issue #23)

-- Users table: maps Supabase auth users to our system
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supabase_user_id VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT users_supabase_user_id_unique UNIQUE (supabase_user_id)
);

CREATE INDEX idx_users_email ON users(email);

-- Auto-update updated_at for users
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add nullable user_id to caregivers (nullable during migration period)
ALTER TABLE caregivers ADD COLUMN user_id UUID REFERENCES users(id);

-- Relax device_id: allow nulls for user-based caregivers
-- First drop the existing unique index, then make column nullable and recreate index
DROP INDEX idx_caregivers_device_id;
ALTER TABLE caregivers ALTER COLUMN device_id DROP NOT NULL;
-- Unique index on device_id only for non-null values (partial index)
CREATE UNIQUE INDEX idx_caregivers_device_id ON caregivers(device_id) WHERE device_id IS NOT NULL;

-- A user can only be a caregiver once per family
CREATE UNIQUE INDEX idx_caregivers_user_family ON caregivers(user_id, family_id) WHERE user_id IS NOT NULL;

-- Index for user lookups
CREATE INDEX idx_caregivers_user_id ON caregivers(user_id);
