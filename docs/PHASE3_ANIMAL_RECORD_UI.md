# Phase 3: Animal Record UI and Details Cleanup

## Architecture Summary

The animals table is now treated as a summary view only. It shows high-value fields needed for quick scanning: animal ID, type, breed, gender, DOB, current weight, sire, dam, and actions.

Full animal data is handled through action-based workflows:

- **View Details**: read-only full profile and measurement history.
- **Edit Details**: update mutable profile fields such as health, production, fertility, parent links, and latest profile weight.
- **Record Weight**: append a time-series weight measurement and update latest current weight.

This keeps the animal list clean while preserving detailed breeder records.

## Data Flow

1. Breeder opens Animals page.
2. Frontend calls `GET /api/breeders/{breeder_id}/animals`.
3. Table renders a compact summary row for each animal.
4. Breeder selects an action:
   - `View Details` uses the loaded animal object and calls `GET /api/breeders/{breeder_id}/animals/{animal_db_id}/measurements` for weight history.
   - `Edit Details` opens the edit form and sends `PATCH /api/breeders/{breeder_id}/animals/{animal_db_id}`.
   - `Record Weight` sends `POST /api/breeders/{breeder_id}/animals/{animal_db_id}/measurements`.
5. Backend validates ownership and data rules.
6. Frontend refreshes the table so the latest values are visible.

## Folder / File Changes

```text
Frontend/breeders/animal_management.html
Frontend/breeders/js/script.js
docs/PHASE3_ANIMAL_RECORD_UI.md
```

## Implementation Notes

### `animal_management.html`

Added missing editable/collectable fields:

- Mature Weight
- Age at First Service
- Birth Interval

Added a new full details modal:

- Identity & Pedigree
- Growth & Body Data
- Production Data
- Health Records
- Fertility & Reproduction
- Offspring Performance
- Weight History

### `script.js`

Added:

- `openAnimalDetailsModal(animalDbId)`
- `closeAnimalDetailsModal()`
- `renderAnimalMeasurementHistory(measurements)`
- reusable detail rendering helpers

Updated:

- animal table actions now include **View Details**
- create animal payload includes the missing fields
- edit animal payload includes the missing fields
- edit modal population includes the missing fields
- duplicate request header in weight recording was removed

## Edge Case Handling

- If an animal is not found in the loaded table, the UI shows an error toast.
- Missing values display as `—` instead of blank cells.
- Measurement history failure does not close the details modal; it shows a local error message.
- Empty measurement history displays a clear “No measurement history recorded yet” message.
- Current table remains compact even though the animal profile has many fields.

## Error Management

Backend errors from `apiFetch` are surfaced through toast messages. The details modal handles measurement loading errors independently so the animal profile can still be viewed even if history loading fails.

## Performance Evaluation

The table still uses one animals API call for summary rendering. Measurement history is lazy-loaded only when a breeder clicks **View Details**, avoiding unnecessary database calls for every animal row.

This is scalable for breeders with many animals because detailed data retrieval happens on demand.
