# Animal Editing & Measurement History

## Architecture Summary

Animal profile data is now split into two categories:

1. **Current animal profile fields** stored on `animals`.
   - Used for fast table display and Genetics & Breeding Decision Support scoring.
   - Example: `current_weight`, `health_status`, `fertility_status`.

2. **Time-series measurement records** stored on `animal_measurements`.
   - Used for values that naturally change over time.
   - Current implementation supports weight records in kilograms.
   - Example: an animal may weigh 200 kg today and 300 kg later; both records can be kept.

## Data Flow

### Edit Details
Frontend animal table → Actions → Edit Details → PATCH `/api/breeders/{breeder_id}/animals/{animal_db_id}` → updates `animals`.

### Record Weight
Frontend animal table → Actions → Record Weight → POST `/api/breeders/{breeder_id}/animals/{animal_db_id}/measurements` → inserts into `animal_measurements` and updates `animals.current_weight` with the latest value.

## New Backend Endpoints

- `PATCH /api/breeders/{breeder_id}/animals/{animal_db_id}`
- `POST /api/breeders/{breeder_id}/animals/{animal_db_id}/measurements`
- `GET /api/breeders/{breeder_id}/animals/{animal_db_id}/measurements`

## Database Changes

- Added `animals.updated_at`
- Added `animal_measurements` table
- Added indexes for measurement lookup by animal/date and breeder

## Edge Case Handling

- Breeders cannot edit animals outside their account.
- Sire must be male, accessible, and not the same animal.
- Dam must be female, accessible, and not the same animal.
- Weight records must be positive values.
- Measurement unit is restricted to kilograms for now to avoid conversion mistakes.
- Latest weight is cached on the animal record for performance.

## Performance Notes

- The animals table keeps the latest `current_weight` to avoid scanning measurement history during recommendation scoring.
- Measurement history is indexed by `animal_id` and `measured_at DESC` for fast history retrieval.
