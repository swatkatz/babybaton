-- Reset database by deleting all data
-- Run this with: psql $DATABASE_URL -f reset_db.sql

-- Delete in order to respect foreign key constraints
DELETE FROM sleep_details;
DELETE FROM diaper_details;
DELETE FROM feed_details;
DELETE FROM activities;
DELETE FROM care_sessions;
DELETE FROM caregivers;
DELETE FROM families;

-- Verify tables are empty
SELECT 'families' as table_name, COUNT(*) as count FROM families
UNION ALL
SELECT 'caregivers', COUNT(*) FROM caregivers
UNION ALL
SELECT 'care_sessions', COUNT(*) FROM care_sessions
UNION ALL
SELECT 'activities', COUNT(*) FROM activities
UNION ALL
SELECT 'feed_details', COUNT(*) FROM feed_details
UNION ALL
SELECT 'diaper_details', COUNT(*) FROM diaper_details
UNION ALL
SELECT 'sleep_details', COUNT(*) FROM sleep_details;
