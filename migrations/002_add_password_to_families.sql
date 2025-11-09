-- Migration: Add password column to families table
-- This allows users to share the plain text password with family members

-- Add password column to families table
ALTER TABLE families ADD COLUMN password VARCHAR(100);

-- For existing families, we can't recover the original password from bcrypt hash
-- So we'll set a default placeholder password that users can update
-- In production, you might want to handle this differently (e.g., send reset emails)
UPDATE families SET password = 'changeme' WHERE password IS NULL;

-- Make password NOT NULL after setting defaults
ALTER TABLE families ALTER COLUMN password SET NOT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN families.password IS 'Plain text password for sharing with family members (encrypted in transit via HTTPS)';
COMMENT ON COLUMN families.password_hash IS 'Bcrypt hash of password used for authentication';
