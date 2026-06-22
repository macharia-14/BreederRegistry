# Phase 8 — Breeder Side Stabilization

## Scope
This phase tightens the breeder-facing system before moving to the admin side.

## Pages Improved

### overview.html
- Dashboard stats now use the normalized report summary endpoint.
- Active pregnancy logic uses explicit reproductive status/outcome values.
- Added operational alerts for due dates and pregnancy checks.
- Recent animals now include more useful inventory context.

### animal_management.html
- Export CSV now includes production, health, fertility, parent IDs, and current weight.
- Export logic uses the same normalized animal response used by the backend.
- Existing full profile/view/edit/weight flows remain intact.

### offspring_history.html
- Offspring history now reads live-birth outcomes and linked offspring records.
- Handles cases where a live birth was recorded with counts but no offspring animal record yet.
- Export now includes event ID, dam, sire, counts, method, and outcome.

### reports.html
- Added live report summary from `/api/breeders/{id}/report-summary`.
- Reports now organize herd inventory, breeding outcomes, pregnancy state, and alerts.
- CSV exports use reproductive workflow fields instead of guessing status.

### setting.html
- Profile fields now save to backend through `PATCH /api/breeders/{id}/profile`.
- Added recent breeder activity/security logs panel.
- Removed fake "saved" behavior that did not persist changes.

## Backend Improvements
- Added `report_service.py` for centralized breeder report calculations.
- Added `audit_service.py` for safe audit logging.
- Added breeder profile update endpoint.
- Added breeder change-password endpoint.
- Added password reset request and reset endpoints.
- Added security headers middleware.
- Added password reset token table migration.

## Security Notes
- Password reset tokens are stored as SHA-256 hashes, not raw tokens.
- Forgot-password endpoint avoids account enumeration by always returning a generic success response.
- Audit logs are written for breeder login, profile updates, password changes, animal actions, and breeding workflow actions.
- Audit logging is non-blocking: logging failure does not crash business operations.

## Database Migration
Run:

```sql
Backend/migrations/004_security_password_reset_and_reports.sql
```

## Email Setup
Password reset emails require SMTP environment variables:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
SMTP_FROM="BreedRegistry <your_email@gmail.com>"
APP_BASE_URL=http://127.0.0.1:8000
```

Without SMTP, the API still creates reset tokens but email delivery is skipped and logged as a warning.
