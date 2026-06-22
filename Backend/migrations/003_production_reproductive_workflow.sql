-- Phase 6: production reproductive workflow hardening
-- Run after 001 and 002.

-- Updates an existing table structure safely.
ALTER TABLE breeding_events
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NULL;

-- Status/outcome safety documentation is enforced at API level for compatibility.
-- Recommended statuses:
-- planned, served, confirmed_pregnant, not_pregnant, failed, completed, lost, cancelled
-- Recommended outcomes:
-- live_birth, failed_conception, miscarriage, stillbirth, abortion, unknown

-- Adds an index to improve lookup speed or enforce uniqueness.
CREATE INDEX IF NOT EXISTS idx_breeding_events_breeder_status_outcome
    ON breeding_events (breeder_id, status, outcome);

-- Adds an index to improve lookup speed or enforce uniqueness.
CREATE INDEX IF NOT EXISTS idx_breeding_events_dam_open
    ON breeding_events (breeder_id, dam_id, status, outcome);

-- Adds an index to improve lookup speed or enforce uniqueness.
CREATE INDEX IF NOT EXISTS idx_breeding_events_due_date
    ON breeding_events (breeder_id, expected_due_date);

-- Adds an index to improve lookup speed or enforce uniqueness.
CREATE INDEX IF NOT EXISTS idx_breeding_events_breeding_date
    ON breeding_events (breeder_id, breeding_date);
