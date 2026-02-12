-- Migration: Add ON DELETE CASCADE to care_sessions.caregiver_id
-- When a caregiver leaves the family, their care sessions (and cascading
-- activities/details) are deleted.

ALTER TABLE care_sessions
    DROP CONSTRAINT care_sessions_caregiver_id_fkey,
    ADD CONSTRAINT care_sessions_caregiver_id_fkey
        FOREIGN KEY (caregiver_id) REFERENCES caregivers(id) ON DELETE CASCADE;
