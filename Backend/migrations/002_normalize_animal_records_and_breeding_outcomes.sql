-- Phase 4: normalized animal records and production-ready breeding outcomes.

-- Updates an existing table structure safely.
ALTER TABLE breeding_events
    ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'served',
    ADD COLUMN IF NOT EXISTS pregnancy_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS pregnancy_check_date DATE,
    ADD COLUMN IF NOT EXISTS outcome VARCHAR(50),
    ADD COLUMN IF NOT EXISTS outcome_date DATE,
    ADD COLUMN IF NOT EXISTS offspring_count INTEGER,
    ADD COLUMN IF NOT EXISTS live_offspring_count INTEGER,
    ADD COLUMN IF NOT EXISTS outcome_notes TEXT;

UPDATE breeding_events
SET status = 'completed', pregnancy_confirmed = TRUE, outcome = COALESCE(outcome, 'live_birth')
WHERE offspring_id IS NOT NULL AND (status IS NULL OR status = 'served');

-- Creates a database table used by the application.
CREATE TABLE IF NOT EXISTS animal_health_records (
    id SERIAL PRIMARY KEY,
    animal_id INTEGER NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
    breeder_id INTEGER NOT NULL REFERENCES breeders(id) ON DELETE CASCADE,
    record_date DATE NOT NULL,
    health_status VARCHAR(50),
    vaccination_status VARCHAR(50),
    disease_history TEXT,
    hereditary_conditions TEXT,
    vet_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Creates a database table used by the application.
CREATE TABLE IF NOT EXISTS animal_fertility_records (
    id SERIAL PRIMARY KEY,
    animal_id INTEGER NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
    breeder_id INTEGER NOT NULL REFERENCES breeders(id) ON DELETE CASCADE,
    record_date DATE NOT NULL,
    fertility_status VARCHAR(50),
    age_at_first_service_months FLOAT,
    services_per_conception FLOAT,
    birth_interval_days FLOAT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Creates a database table used by the application.
CREATE TABLE IF NOT EXISTS animal_production_records (
    id SERIAL PRIMARY KEY,
    animal_id INTEGER NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
    breeder_id INTEGER NOT NULL REFERENCES breeders(id) ON DELETE CASCADE,
    record_date DATE NOT NULL,
    production_type VARCHAR(50),
    daily_milk_yield FLOAT,
    milk_fat_percent FLOAT,
    egg_count_annual INTEGER,
    average_daily_gain FLOAT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Creates a database table used by the application.
CREATE TABLE IF NOT EXISTS animal_offspring_records (
    id SERIAL PRIMARY KEY,
    animal_id INTEGER NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
    breeder_id INTEGER NOT NULL REFERENCES breeders(id) ON DELETE CASCADE,
    record_date DATE NOT NULL,
    offspring_count INTEGER,
    offspring_survival_rate FLOAT,
    offspring_quality_score FLOAT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Creates a database table used by the application.
CREATE TABLE IF NOT EXISTS animal_notes (
    id SERIAL PRIMARY KEY,
    animal_id INTEGER NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
    breeder_id INTEGER NOT NULL REFERENCES breeders(id) ON DELETE CASCADE,
    note_type VARCHAR(50) NOT NULL DEFAULT 'general',
    note TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Adds an index to improve lookup speed or enforce uniqueness.
CREATE INDEX IF NOT EXISTS idx_breeding_events_status ON breeding_events (breeder_id, status, outcome);
-- Adds an index to improve lookup speed or enforce uniqueness.
CREATE INDEX IF NOT EXISTS idx_health_records_animal_date ON animal_health_records (animal_id, record_date DESC);
-- Adds an index to improve lookup speed or enforce uniqueness.
CREATE INDEX IF NOT EXISTS idx_fertility_records_animal_date ON animal_fertility_records (animal_id, record_date DESC);
-- Adds an index to improve lookup speed or enforce uniqueness.
CREATE INDEX IF NOT EXISTS idx_production_records_animal_date ON animal_production_records (animal_id, record_date DESC);
-- Adds an index to improve lookup speed or enforce uniqueness.
CREATE INDEX IF NOT EXISTS idx_offspring_records_animal_date ON animal_offspring_records (animal_id, record_date DESC);
