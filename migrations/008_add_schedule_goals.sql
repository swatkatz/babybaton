CREATE TABLE schedule_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  target_wake_window_minutes INT,
  target_feed_interval_minutes INT,
  target_nap_count INT,
  max_daytime_nap_minutes INT,
  target_bedtime VARCHAR(5),       -- "HH:MM" format
  target_wake_time VARCHAR(5),     -- "HH:MM" format
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(family_id)
);
