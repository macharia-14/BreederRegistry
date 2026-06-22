# Phase 5: Genetics Engine Integration with Normalized Animal Records

## Purpose

This phase connects the Genetics & Breeding Decision Support page to the normalized animal history tables created in Phase 4.

The genetics engine should no longer depend only on static columns inside the `animals` table. It now builds a scoring profile using the latest available records from the related animal-history tables.

## Updated Data Flow

```text
Frontend Genetics Page
        ↓
GET /api/genetics/recommend-sires/{dam_id}
        ↓
Backend/app/routes/genetics.py
        ↓
Backend/app/genetics.py
        ↓
build_animal_breeding_profile()
        ↓
animals + latest normalized records
        ↓
scoring engine
        ↓
recommendation response with score, confidence, risks, and explanation
```

## Tables Used by Genetics Scoring

```text
animals
animal_measurements
animal_health_records
animal_fertility_records
animal_production_records
animal_offspring_records
breeding_events
```

## Read Priority

For mutable animal data, the engine reads in this order:

1. Latest normalized record.
2. Legacy value still stored on `animals`.
3. Missing value, which lowers confidence but does not break scoring.

This allows the system to work during migration while still supporting the cleaner database design.

## New Helper

File:

```text
Backend/app/genetics.py
```

New production read-model:

```text
AnimalBreedingProfile
```

New builder function:

```text
build_animal_breeding_profile(animal, db)
```

This function gathers the latest records from:

```text
animal_measurements
animal_health_records
animal_fertility_records
animal_production_records
animal_offspring_records
breeding_events
```

## Breeding Outcome Logic

Breeding outcomes now affect fertility/risk evaluation.

Repeated failed outcomes reduce fertility confidence and can trigger risk flags.

Failure examples:

```text
failed_conception
miscarriage
stillbirth
abortion
failed
```

Success examples:

```text
live_birth
successful
delivered
```

## Recommendation Response Additions

Sire recommendation responses now include extra context:

```text
data_sources
last_breeding_status
last_breeding_outcome
```

These help explain whether the score came from real normalized records or only old animal-table values.

## Production Note

The system is now more logically correct because genetics scoring uses recorded animal history, not only static registration data. However, recommendations remain decision-support outputs, not laboratory genetic predictions.
