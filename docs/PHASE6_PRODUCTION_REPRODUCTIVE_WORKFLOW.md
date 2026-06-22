# Phase 6: Production Reproductive Workflow

## Architecture Summary

The reproductive workflow is now handled as a complete lifecycle instead of assuming that every breeding event succeeds.

Workflow states:

1. `planned` — breeding is scheduled but not yet performed.
2. `served` — dam has been served/mated/inseminated, but pregnancy is not confirmed.
3. `confirmed_pregnant` — pregnancy has been confirmed by breeder/vet.
4. `failed` / `not_pregnant` — breeding did not result in pregnancy.
5. `lost` — pregnancy was confirmed but ended in miscarriage, stillbirth, or abortion.
6. `completed` — delivery happened and outcome was recorded.
7. `cancelled` — event was cancelled.

Supported outcomes:

- `live_birth`
- `failed_conception`
- `miscarriage`
- `stillbirth`
- `abortion`
- `unknown`

## Folder Structure

```text
Backend/app/services/breeding_service.py
Backend/app/routes/breeders.py
Backend/app/schemas.py
Backend/app/models.py
Backend/app/crud.py
Backend/migrations/003_production_reproductive_workflow.sql
Frontend/breeders/breeding_events.html
Frontend/breeders/js/script.js
docs/PHASE6_PRODUCTION_REPRODUCTIVE_WORKFLOW.md
```

## Data Flow

```text
Breeder creates breeding event
        ↓
Backend validates dam/sire ownership, gender, animal type, due date, active pregnancy conflicts
        ↓
Event is stored as planned or served
        ↓
Pregnancy Monitor shows served events awaiting confirmation
        ↓
Breeder confirms pregnancy or records failed conception
        ↓
If confirmed, delivery/loss workflow becomes available
        ↓
Outcome is recorded
        ↓
Fertility and offspring evidence records are automatically synced
        ↓
Fertility analytics and Genetics scoring can use real reproductive evidence
```

## Complete Implementation Notes

### Backend

Added `breeding_service.py` to separate reproductive business rules from routes.

The service validates:

- breeder ownership
- dam must be female
- sire must be male
- sire and dam must be same animal type
- sire and dam cannot be the same animal
- breeding date cannot be in the future
- expected due date must be after breeding date
- one dam cannot have two open active pregnancies
- live birth must include offspring count
- live offspring count cannot exceed total offspring count
- closed outcome events cannot be treated as active again

New endpoints added:

```text
GET /api/breeders/{breeder_id}/breeding-events/{event_id}
GET /api/breeders/{breeder_id}/breeding-analytics
GET /api/breeders/{breeder_id}/breeding-alerts
```

Existing endpoints hardened:

```text
POST /api/breeders/{breeder_id}/breeding-events
PATCH /api/breeders/{breeder_id}/breeding-events/{event_id}
```

### Frontend

The existing `breeding_events.html` page was upgraded instead of creating a separate page.

Added:

- dedicated breeding event register
- pregnancy confirmation modal
- failed conception / not pregnant workflow
- delivery outcome workflow
- pregnancy loss workflow
- fertility analytics dashboard
- automatic breeding alerts section
- full breeding event table with status/action buttons

## Edge Case Handling

| Edge Case | Handling |
|---|---|
| Breeding date in future | Rejected |
| Due date before breeding date | Rejected |
| Dam is male | Rejected |
| Sire is female | Rejected |
| Sire and dam different animal types | Rejected |
| Dam already has active pregnancy | Rejected with conflict |
| Live birth without offspring count | Rejected |
| Live offspring count > total offspring count | Rejected |
| Pregnancy confirmation after outcome | Rejected |
| Outcome date in future | Rejected |
| Breeder accessing another breeder's event | Rejected |

## Error Management

Backend errors use HTTP status codes:

- `400` invalid reproductive data
- `403` access denied
- `404` event/animal not found
- `409` reproductive conflict such as duplicate active pregnancy

Frontend displays errors using toast messages.

## Performance Evaluation

Added indexes for:

- breeder/status/outcome filtering
- open pregnancy lookups
- due date reminders
- breeding date ordering

Pregnancy monitor, analytics, and alerts are read-heavy and use indexed columns to avoid expensive scans as data grows.

## Production Claim Supported

The system can now accurately claim that it supports the full reproductive workflow:

- breeding event creation
- pregnancy confirmation
- failed conception handling
- pregnancy loss handling
- delivery outcome handling
- fertility analytics
- automatic due date/check reminders
- evidence syncing into fertility and offspring records

The system should still be described as a breeding decision-support platform, not a genomic prediction engine unless genomic lab data is added later.
