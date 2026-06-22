# Phase 4: Database Normalization and Breeding Outcome Readiness

## Architecture Summary

The animal table is now treated as the fast summary table for identity and latest values needed by dashboards and genetics scoring. Long-running or repeatable animal data is moved into normalized history tables.

### Core tables

- `animals`: identity, ownership, parent references, and latest cached scoring fields.
- `animal_measurements`: weight and future measurement history.
- `animal_health_records`: dated health, vaccination, disease, hereditary, and vet records.
- `animal_fertility_records`: dated fertility status and conception indicators.
- `animal_production_records`: dated milk, egg, growth, and production indicators.
- `animal_offspring_records`: dated offspring count, survival, and quality evidence.
- `animal_notes`: general breeder/vet notes.
- `breeding_events`: breeding attempt lifecycle and outcome tracking.

## Folder Structure

```text
Backend/app/models.py                      SQLAlchemy data models
Backend/app/schemas.py                     Pydantic request/response schemas
Backend/app/crud.py                        Persistence helpers
Backend/app/services/animal_service.py     Ownership and business rules
Backend/app/routes/breeders.py             Protected breeder APIs
Backend/app/routes/genetics.py             COI, recommendations, pregnancy monitor
Backend/migrations/002_normalize_animal_records_and_breeding_outcomes.sql
Frontend/breeders/js/script.js             Breeder dashboard interactions
```

## Data Flow

### Animal profile

```text
Frontend View Details
→ GET /api/breeders/{breeder_id}/animals/{animal_db_id}/profile
→ animal_service ownership check
→ crud.get_animal_full_profile()
→ animal + all normalized record groups
```

### New animal record

```text
Frontend form/action
→ POST /health-records, /fertility-records, /production-records, /offspring-records, or /notes
→ ownership validation
→ insert dated record
→ update latest cached animal fields when applicable
→ genetics scoring can use latest animal summary quickly
```

### Breeding outcome

```text
Breeding event created
→ status = served
→ outcome = null
→ pregnancy_confirmed = false

Pregnancy check confirms success
→ status = confirmed_pregnant
→ pregnancy_confirmed = true

Breeding fails
→ outcome = failed_conception
→ status = failed

Pregnancy is lost
→ outcome = miscarriage/stillbirth/abortion
→ status = lost

Live birth happens
→ outcome = live_birth
→ status = completed
```

## Edge Cases Covered

- A breeding event is no longer assumed successful just because it exists.
- Events without offspring are no longer automatically treated as successful pregnancy outcomes.
- Failed conception, miscarriage, stillbirth, abortion, live birth, and cancelled events can be represented.
- Pregnancy monitor only shows active `served` and `confirmed_pregnant` events without outcomes.
- Historical animal records do not overwrite the entire animal identity record.
- Latest values are cached on `animals` for fast listing and scoring.
- Breeder ownership is checked before every profile/update action.

## Error Management

- Invalid breeder access returns `403`.
- Missing animal or breeding event returns `404`.
- Invalid offspring ownership returns `400`.
- Delete is blocked when animal is part of parentage or breeding history.

## Performance Evaluation

- Summary pages use the `animals` table for fast reads.
- Full details are loaded only when the user clicks View Details.
- Migration adds indexes on record date and breeding status.
- Genetics scoring continues using cached latest animal fields rather than scanning all history records every time.

## Required Database Update

Run this after the previous migration:

```text
Backend/migrations/002_normalize_animal_records_and_breeding_outcomes.sql
```
