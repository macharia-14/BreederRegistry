# Phase 7 — System Tightening & Realtime Readiness

## Realtime Status

The current system now supports **near-realtime UI refresh** through automatic polling on key breeder pages:

- `overview.html` refreshes every 60 seconds.
- `animal_management.html` refreshes every 60 seconds.
- `offspring_history.html` refreshes every 60 seconds.
- `reports.html` refreshes every 60 seconds.
- `breeding_events.html` refreshes every 30 seconds because pregnancy, delivery, and alerts are time-sensitive.

This means a breeder sees updated data shortly after backend changes or another user action. It is not yet true push-based realtime. True realtime would require WebSockets or Server-Sent Events.

## Frontend Improvements

### API Connection Hardening

Updated `Frontend/breeders/js/script.js`:

- `apiFetch()` now automatically attaches the breeder token.
- Handles network failures with clear messages.
- Handles `401` session expiry by redirecting to login.
- Supports `204 No Content` responses.
- Avoids unnecessary repeated authorization boilerplate.

### Page Refresh Flow

Added shared functions:

- `currentBreederPage()`
- `refreshCurrentPage()`
- `startLiveRefresh()`
- `setPageBusy()`

These keep all breeder pages connected to live backend data without forcing manual refreshes.

### Dashboard Logic Fixes

The overview page no longer guesses pregnancy and birth status from missing offspring records.

It now uses explicit reproductive states:

- Active pregnancy: `status = confirmed_pregnant` and no outcome.
- Births this year: `outcome = live_birth`.
- Success rate: calculated only from closed outcomes.

### Reports Logic Fixes

Breeding reports now calculate success using explicit outcomes instead of assuming `offspring_id` means success.

Success is now:

```text
outcome = live_birth
```

Closed failed outcomes are:

```text
failed_conception
miscarriage
stillbirth
abortion
```

## Backend Improvements

### Breeding Due Date Automation

If a breeder creates a breeding event without an expected due date, the backend now estimates the due date from the dam species gestation period.

This keeps dashboards and alerts useful even when the breeder does not manually enter a due date.

### Breeding Event Ordering

Breeding events are now returned in newest-first order:

```text
breeding_date DESC, id DESC
```

### Closed Outcome Protection

Once a breeding outcome is closed, the system prevents reopening or changing the reproductive status. This protects historical accuracy.

Allowed after closure:

```text
notes
outcome_notes
```

Not allowed after closure:

```text
changing pregnancy confirmation
changing outcome
changing reproductive status
```

## Remaining Production Upgrade Option

For true realtime, implement WebSockets or Server-Sent Events.

Recommended future architecture:

```text
Backend emits breeding/animal events
Frontend subscribes over WebSocket/SSE
Dashboard updates instantly without polling
```

For now, polling is stable, simpler, and production-safe for an MVP.
