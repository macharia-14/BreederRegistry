# Phase 7 Runtime Fixes

## Fixed backend crash

The breeding-events endpoint previously failed with `ResponseValidationError` when legacy database rows contained an `expected_due_date` that was not after `breeding_date`.

The fix keeps strict validation for new create/update operations but prevents response serialization from crashing on old rows.

## Fixed frontend static asset paths

Updated breeder pages to use paths that match the FastAPI static mount:

- `/breeders/css/style.css`
- `/images/LineageX.png`

## Optional database cleanup

```sql
SELECT id, breeding_date, expected_due_date, status, outcome
FROM breeding_events
WHERE expected_due_date IS NOT NULL
  AND expected_due_date <= breeding_date;

UPDATE breeding_events
SET expected_due_date = NULL
WHERE expected_due_date IS NOT NULL
  AND expected_due_date <= breeding_date;
```
