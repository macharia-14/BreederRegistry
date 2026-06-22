# Phase 9 — Breeder Usability & Standards Pass

## Goal
Make the breeder side easier to use and closer to an international-standard livestock management workflow.

## Changes

### Navigation and Naming
- Renamed **Breeding Events** to **Breeding & Pregnancy**.
- Renamed **Offspring History** to **Offspring Register**.
- Renamed **Genetics & AI** to **Genetics & Recommendations**.

### Notification Bell
A small notification bell is now injected into the top-right header area of breeder pages. It reads from:

```text
GET /api/breeders/{breeder_id}/breeding-alerts
```

It surfaces expected delivery alerts, overdue pregnancy follow-ups, and reproductive workflow items.

### Animal Profile Workflow
Added:

```text
Frontend/breeders/animal_profile.html
```

The animal table now links each Animal ID and the first action item to this full profile page.

The profile page organizes animal details into tabs:

- Summary
- Measurements
- Health
- Fertility
- Production
- Offspring
- Notes
- Data Quality

This keeps Animal Management as a clean register while moving deep record review into a dedicated profile page.

### Overview Quick Actions
The overview now receives quick action cards for the most common breeder tasks:

- Register Animal
- Breeding & Pregnancy
- Reports
- Genetics Recommendations

## No Database Migration Required
This phase uses existing APIs and existing tables from earlier migrations.

## Validation
- Python compile validation passed.
- Frontend JavaScript syntax validation passed.
