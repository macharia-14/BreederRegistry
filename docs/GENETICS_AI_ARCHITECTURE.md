# Genetics & Breeding Intelligence Architecture

## Architecture summary

The Genetics & AI page has been refactored from a static breed-score ranking into a breeding decision-support engine. The new engine does not claim to genetically prove the best animal from breed name alone. It ranks candidate sires using measurable breeder records, projected inbreeding risk, relationship-risk flags, and a data-confidence score.

## Folder structure

```text
Backend/
  app/
    genetics.py                 # scoring engine, COI, risk flags, recommendation ranking
    models.py                   # Animal data model with breeding intelligence fields
    schemas.py                  # request/response validation for optional trait fields
    crud.py                     # persistence for new animal trait fields
    routes/
      genetics.py               # recommendation API endpoints
      breeders.py               # animal registration API
  migrations/
    001_add_breeding_intelligence_fields.sql
Frontend/
  breeders/
    animal_management.html      # optional breeder data collection form
    genetics.html               # recommendation UI and explanation panel/table
    js/script.js                # POST payload includes optional trait records
docs/
  GENETICS_AI_ARCHITECTURE.md
```

## Data flow

1. Breeder registers an animal and optionally adds performance, health, fertility, production and offspring records.
2. `Frontend/breeders/js/script.js` sends the expanded `AnimalCreate` payload to `POST /api/breeders/{breeder_id}/animals`.
3. `Backend/app/schemas.py` validates optional numerical ranges.
4. `Backend/app/crud.py` persists the animal and trait records.
5. On the Genetics page, breeder selects a dam.
6. `GET /api/genetics/recommend-sires/{dam_db_id}` loads compatible male animals of the same animal type.
7. `Backend/app/genetics.py` computes projected COI and scores each sire across six categories:
   - genetic diversity / COI
   - performance
   - health
   - fertility
   - offspring evidence
   - data confidence
8. Risk penalties are applied for high COI, close relationships, hereditary conditions, poor health and poor fertility.
9. Frontend renders score, confidence, recommendation level, risks and explanation.

## Scoring model

```text
Final Score =
  25% genetic diversity
+ 25% performance
+ 20% health
+ 15% fertility
+ 10% offspring evidence
+  5% data confidence
- risk penalties
```

## Edge case handling

- Missing records do not crash scoring. They reduce confidence and default uncertain dimensions to neutral values.
- Very high COI produces strong penalties and an avoid/review recommendation.
- Parent-child, sibling and half-sibling pairings are explicitly flagged.
- Known hereditary-condition language such as `carrier`, `affected`, `positive` or `defect` is penalized.
- Breeders can still register basic animals without complete records.
- Numeric API validation prevents invalid negative weights and out-of-range scores.

## Error management

- Invalid dam IDs return `404`.
- Non-female dam selections return `400`.
- Unauthorized breeder access remains protected by existing auth dependencies.
- Frontend displays API error messages through existing toast handling.

## Performance evaluation

- Candidate search is filtered by `animal_type` and `gender`.
- New database indexes improve common recommendation queries.
- COI uses bounded-depth pedigree traversal to prevent unbounded recursion.
- Candidate ranking is currently in-memory after query; suitable for small to medium registries. For very large registries, add pagination, precomputed trait scores, and materialized pedigree paths.

## APA references for documentation

Food and Agriculture Organization of the United Nations. (2015). *Breeding strategies for sustainable management of animal genetic resources*. FAO. https://www.fao.org/4/i4787e/i4787e014.pdf

International Committee for Animal Recording. (2024). *ICAR recording guidelines*. ICAR. https://www.icar.org/guidelines/

Bourdon, R. M. (2000). *Understanding animal breeding* (2nd ed.). Prentice Hall.

Falconer, D. S., & Mackay, T. F. C. (1996). *Introduction to quantitative genetics* (4th ed.). Longman.

VanRaden, P. M. (2008). Efficient methods to compute genomic predictions. *Journal of Dairy Science, 91*(11), 4414–4423. https://doi.org/10.3168/jds.2007-0980
