# Phase 10: Overview, Header, and Offspring Register UX Fixes

## Purpose
This phase improves breeder usability after Phase 9 by making the top page header consistent, fixing the Offspring Register workflow, and turning the Overview page into an actionable farm intelligence dashboard.

## Changes

### Header alignment
- Page title, farm selector, and notification bell are now aligned in one responsive row.
- Page titles now use user-friendly names:
  - Overview
  - Animals
  - Breeding & Pregnancy
  - Offspring Register
  - Genetics & Recommendations
  - Reports
  - Settings

### Overview page
The Overview now packages farm data into practical intelligence:
- Reproductive workload
- Urgent/overdue breeding alerts
- Breeding pipeline
- Breeding success rate
- Data quality for genetics confidence
- Offspring trend
- Recommended next actions

### Offspring Register
The Offspring Register now:
- Shows summary cards for birth events, total born, live offspring, and survival rate
- Includes search
- Displays dam/sire links where animal profiles exist
- Displays live/total offspring and survival rate
- Exports the visible offspring register rows to CSV
- Handles live-birth events even when an individual offspring animal record has not yet been linked

## Database
No new migration required.

## Testing
- Python backend compile validation passed.
- Breeder frontend JavaScript syntax validation passed.
