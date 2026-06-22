-- Adds breeder-collectable traits used by the Genetics & Breeding Intelligence engine.
-- Safe to run once on PostgreSQL. For SQLite/dev, SQLAlchemy create_all will create these on new databases.

-- Updates an existing table structure safely.
ALTER TABLE animals ADD COLUMN IF NOT EXISTS birth_weight DOUBLE PRECISION;
-- Updates an existing table structure safely.
ALTER TABLE animals ADD COLUMN IF NOT EXISTS current_weight DOUBLE PRECISION;
-- Updates an existing table structure safely.
ALTER TABLE animals ADD COLUMN IF NOT EXISTS weaning_weight DOUBLE PRECISION;
-- Updates an existing table structure safely.
ALTER TABLE animals ADD COLUMN IF NOT EXISTS mature_weight DOUBLE PRECISION;
-- Updates an existing table structure safely.
ALTER TABLE animals ADD COLUMN IF NOT EXISTS body_condition_score DOUBLE PRECISION;
-- Updates an existing table structure safely.
ALTER TABLE animals ADD COLUMN IF NOT EXISTS average_daily_gain DOUBLE PRECISION;

-- Updates an existing table structure safely.
ALTER TABLE animals ADD COLUMN IF NOT EXISTS health_status VARCHAR(50);
-- Updates an existing table structure safely.
ALTER TABLE animals ADD COLUMN IF NOT EXISTS vaccination_status VARCHAR(50);
-- Updates an existing table structure safely.
ALTER TABLE animals ADD COLUMN IF NOT EXISTS disease_history TEXT;
-- Updates an existing table structure safely.
ALTER TABLE animals ADD COLUMN IF NOT EXISTS hereditary_conditions TEXT;
-- Updates an existing table structure safely.
ALTER TABLE animals ADD COLUMN IF NOT EXISTS vet_notes TEXT;

-- Updates an existing table structure safely.
ALTER TABLE animals ADD COLUMN IF NOT EXISTS fertility_status VARCHAR(50);
-- Updates an existing table structure safely.
ALTER TABLE animals ADD COLUMN IF NOT EXISTS age_at_first_service_months DOUBLE PRECISION;
-- Updates an existing table structure safely.
ALTER TABLE animals ADD COLUMN IF NOT EXISTS services_per_conception DOUBLE PRECISION;
-- Updates an existing table structure safely.
ALTER TABLE animals ADD COLUMN IF NOT EXISTS birth_interval_days DOUBLE PRECISION;

-- Updates an existing table structure safely.
ALTER TABLE animals ADD COLUMN IF NOT EXISTS offspring_count INTEGER;
-- Updates an existing table structure safely.
ALTER TABLE animals ADD COLUMN IF NOT EXISTS offspring_survival_rate DOUBLE PRECISION;
-- Updates an existing table structure safely.
ALTER TABLE animals ADD COLUMN IF NOT EXISTS offspring_quality_score DOUBLE PRECISION;

-- Updates an existing table structure safely.
ALTER TABLE animals ADD COLUMN IF NOT EXISTS production_type VARCHAR(50);
-- Updates an existing table structure safely.
ALTER TABLE animals ADD COLUMN IF NOT EXISTS daily_milk_yield DOUBLE PRECISION;
-- Updates an existing table structure safely.
ALTER TABLE animals ADD COLUMN IF NOT EXISTS milk_fat_percent DOUBLE PRECISION;
-- Updates an existing table structure safely.
ALTER TABLE animals ADD COLUMN IF NOT EXISTS egg_count_annual INTEGER;

-- Adds an index to improve lookup speed or enforce uniqueness.
CREATE INDEX IF NOT EXISTS idx_animals_type_gender ON animals(animal_type, gender);
-- Adds an index to improve lookup speed or enforce uniqueness.
CREATE INDEX IF NOT EXISTS idx_animals_breeder_type ON animals(breeder_id, animal_type);
-- Adds an index to improve lookup speed or enforce uniqueness.
CREATE INDEX IF NOT EXISTS idx_animals_sire_id ON animals(sire_id);
-- Adds an index to improve lookup speed or enforce uniqueness.
CREATE INDEX IF NOT EXISTS idx_animals_dam_id ON animals(dam_id);

-- Animal update tracking and measurement history.
ALTER TABLE animals ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;

-- Creates a database table used by the application.
CREATE TABLE IF NOT EXISTS animal_measurements (
    id SERIAL PRIMARY KEY,
    animal_id INTEGER NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
    breeder_id INTEGER NOT NULL REFERENCES breeders(id) ON DELETE CASCADE,
    measurement_type VARCHAR(50) NOT NULL DEFAULT 'weight',
    value DOUBLE PRECISION NOT NULL,
    unit VARCHAR(20) NOT NULL DEFAULT 'kg',
    measured_at DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Adds an index to improve lookup speed or enforce uniqueness.
CREATE INDEX IF NOT EXISTS idx_animal_measurements_animal_date ON animal_measurements(animal_id, measured_at DESC);
-- Adds an index to improve lookup speed or enforce uniqueness.
CREATE INDEX IF NOT EXISTS idx_animal_measurements_breeder ON animal_measurements(breeder_id);
