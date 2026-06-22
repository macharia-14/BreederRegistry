# Phase 7 — Page & Backend Connection Audit

## Breeder Pages

### Overview

File: `Frontend/breeders/overview.html`

Backend data used:

- `GET /api/breeders/{breeder_id}`
- `GET /api/breeders/{breeder_id}/animals`
- `GET /api/breeders/{breeder_id}/breeding-events`

Tightened:

- Pregnancy count now uses explicit confirmed pregnancy records.
- Birth count now uses live-birth outcomes.
- Success rate now uses closed reproductive outcomes only.

### Animal Management

File: `Frontend/breeders/animal_management.html`

Backend data used:

- `GET /api/breeders/{breeder_id}/animals`
- `POST /api/breeders/{breeder_id}/animals`
- `PATCH /api/breeders/{breeder_id}/animals/{animal_db_id}`
- `DELETE /api/breeders/{breeder_id}/animals/{animal_db_id}`
- `GET /api/breeders/{breeder_id}/animals/{animal_db_id}/profile`
- `POST /api/breeders/{breeder_id}/animals/{animal_db_id}/measurements`
- `GET /api/breeders/{breeder_id}/animals/{animal_db_id}/measurements`

Status:

- Summary table remains light.
- Full profile remains available through View Details.
- Weight changes remain historical through measurement records.

### Breeding Events

File: `Frontend/breeders/breeding_events.html`

Backend data used:

- `GET /api/breeders/{breeder_id}/breeding-events`
- `POST /api/breeders/{breeder_id}/breeding-events`
- `PATCH /api/breeders/{breeder_id}/breeding-events/{event_id}`
- `GET /api/breeders/{breeder_id}/breeding-analytics`
- `GET /api/breeders/{breeder_id}/breeding-alerts`
- `GET /api/genetics/pregnancy-monitor/{breeder_id}`

Status:

- Dedicated breeding event creation is supported.
- Pregnancy confirmation is supported.
- Failed conception / not pregnant is supported.
- Delivery outcome is supported.
- Pregnancy loss is supported.
- Fertility analytics are shown.
- Alerts are shown.

### Genetics

File: `Frontend/breeders/genetics.html`

Backend data used:

- `GET /api/breeders/{breeder_id}/animals`
- `GET /api/genetics/coi`
- `GET /api/genetics/animal-coi/{animal_db_id}`
- `GET /api/genetics/recommend-sires/{dam_db_id}`

Status:

- Genetics recommendations use the improved backend scoring engine.
- Results should be presented as decision support, not absolute genetic truth.

### Offspring History

File: `Frontend/breeders/offspring_history.html`

Backend data used:

- `GET /api/breeders/{breeder_id}/animals`
- `GET /api/breeders/{breeder_id}/breeding-events`

Status:

- Can reflect live-birth outcomes from breeding events.
- Can export offspring records.

### Reports

File: `Frontend/breeders/reports.html`

Backend data used:

- `GET /api/breeders/{breeder_id}/animals`
- `GET /api/breeders/{breeder_id}/breeding-events`

Tightened:

- Breeding success now uses explicit outcome values.

### Settings

File: `Frontend/breeders/setting.html`

Backend data used:

- `GET /api/breeders/{breeder_id}`

Status:

- Displays breeder profile.
- Save logic currently shows saved confirmation only; a future phase should add `PATCH /api/breeders/{breeder_id}` if breeder profile editing is required.
