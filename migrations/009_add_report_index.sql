CREATE INDEX idx_care_sessions_family_started
  ON care_sessions(family_id, started_at);
