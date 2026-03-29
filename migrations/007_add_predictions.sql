CREATE TABLE predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    care_session_id UUID REFERENCES care_sessions(id) ON DELETE SET NULL,
    activity_type VARCHAR(20) NOT NULL,
    prediction_type VARCHAR(20) NOT NULL,
    predicted_time TIMESTAMP NOT NULL,
    status VARCHAR(20) NOT NULL,
    confidence VARCHAR(20),
    reasoning TEXT,
    predicted_amount_ml INTEGER,
    predicted_duration_minutes INTEGER,
    dismissed_at TIMESTAMP,
    computed_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_predictions_family ON predictions(family_id);
CREATE INDEX idx_predictions_family_status ON predictions(family_id, status) WHERE dismissed_at IS NULL;
CREATE INDEX idx_predictions_cleanup ON predictions(created_at);
