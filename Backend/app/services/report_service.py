# Backend/app/services/report_service.py: contains backend logic for the Animal Breed Registry System.
"""Breeder reporting read models.

This service turns raw animal, breeding, health, production and fertility records
into management-ready report data. The frontend uses this endpoint for PDF/CSV
exports and for the Reports page intelligence cards.
"""

from __future__ import annotations
from collections import Counter, defaultdict
from datetime import date, timedelta
from statistics import mean
from typing import Iterable
from sqlalchemy.orm import Session
from .. import models
from . import breeding_service

POSITIVE_HEALTH = {"healthy", "good", "excellent", "normal", "stable", "vaccinated"}
NEGATIVE_HEALTH = {"sick", "ill", "critical", "poor", "injured", "lame", "diseased"}
FAILED_OUTCOMES = {"failed_conception", "miscarriage", "stillbirth", "abortion"}
SUCCESS_OUTCOMES = {"live_birth"}
CLOSED_OUTCOMES = SUCCESS_OUTCOMES | FAILED_OUTCOMES | {"unknown"}

# Internal helper for safe date.
def _safe_date(value):
    return value if isinstance(value, date) else None

# Internal helper for str date.
def _str_date(value):
    return value.isoformat() if isinstance(value, date) else (str(value) if value else None)

# Internal helper for animal label.
def _animal_label(animal: models.Animal | None) -> str:
    return animal.animal_id if animal else "—"

# Internal helper for title.
def _title(value: str | None, fallback: str = "Unknown") -> str:
    if not value:
        return fallback
    return str(value).replace("_", " ").title()

# Internal helper for pct.
def _pct(numerator: int | float, denominator: int | float) -> float:
    if not denominator:
        return 0.0
    return round((float(numerator) / float(denominator)) * 100, 1)

# Internal helper for latest by animal.
def _latest_by_animal(records: Iterable, date_attr: str) -> dict[int, object]:
    latest: dict[int, object] = {}

    for rec in records:
        animal_id = getattr(rec, "animal_id", None)

        rec_date = getattr(rec, date_attr, None)

        if animal_id is None:
            continue

        current = latest.get(animal_id)

        current_date = getattr(current, date_attr, None) if current else None

        if current is None or (rec_date and (not current_date or rec_date > current_date)):
            latest[animal_id] = rec
    return latest

# Internal helper for animal age months.
def _animal_age_months(animal: models.Animal, today: date) -> int | None:
    if not animal.date_of_birth:
        return None
    return max(0, (today.year - animal.date_of_birth.year) * 12 + (today.month - animal.date_of_birth.month))

# Retrieves breeder report summary records from the database.
def get_breeder_report_summary(db: Session, *, breeder_id: int) -> dict:
    today = date.today()
    one_year_ago = today - timedelta(days=365)
    next_30_days = today + timedelta(days=30)
    breeder = db.query(models.Breeder).filter(models.Breeder.id == breeder_id).first()
    animals = db.query(models.Animal).filter(models.Animal.breeder_id == breeder_id).all()
    events = db.query(models.BreedingEvent).filter(models.BreedingEvent.breeder_id == breeder_id).all()
    health_records = db.query(models.AnimalHealthRecord).filter(models.AnimalHealthRecord.breeder_id == breeder_id).all()
    fertility_records = db.query(models.AnimalFertilityRecord).filter(models.AnimalFertilityRecord.breeder_id == breeder_id).all()
    production_records = db.query(models.AnimalProductionRecord).filter(models.AnimalProductionRecord.breeder_id == breeder_id).all()
    measurements = db.query(models.AnimalMeasurement).filter(models.AnimalMeasurement.breeder_id == breeder_id).all()
    offspring_records = db.query(models.AnimalOffspringRecord).filter(models.AnimalOffspringRecord.breeder_id == breeder_id).all()
    animal_by_id = {a.id: a for a in animals}
    gender_counts = Counter((a.gender or "unknown").lower() for a in animals)
    breed_counts = Counter(a.breed or "Unknown" for a in animals)
    type_counts = Counter(a.animal_type or "Unknown" for a in animals)
    live_birth_events = [e for e in events if e.outcome == "live_birth"]
    failed_events = [e for e in events if e.outcome in FAILED_OUTCOMES]
    closed_events = [e for e in events if e.outcome in CLOSED_OUTCOMES or e.status in {"completed", "failed", "lost", "cancelled"}]
    open_events = [e for e in events if e not in closed_events]
    active_pregnancies = [e for e in events if e.status == "confirmed_pregnant" and not e.outcome]
    pending_checks = [e for e in events if e.status == "served" and not e.pregnancy_confirmed and not e.outcome]
    due_soon = [e for e in active_pregnancies if e.expected_due_date and today <= e.expected_due_date <= next_30_days]
    overdue = [e for e in active_pregnancies if e.expected_due_date and e.expected_due_date < today]

    births_this_year = sum(
        1 for e in live_birth_events
        if (e.outcome_date or e.expected_due_date or e.breeding_date) and (e.outcome_date or e.expected_due_date or e.breeding_date).year == today.year
    )

    live_offspring_total = sum(int(e.live_offspring_count or e.offspring_count or (1 if e.offspring_id else 0)) for e in live_birth_events)
    total_offspring_recorded = sum(int(e.offspring_count or e.live_offspring_count or (1 if e.offspring_id else 0)) for e in live_birth_events)
    survival_rate = _pct(live_offspring_total, total_offspring_recorded)
    latest_health = _latest_by_animal(health_records, "record_date")
    latest_fertility = _latest_by_animal(fertility_records, "record_date")
    latest_production = _latest_by_animal(production_records, "record_date")
    latest_measurements = _latest_by_animal(measurements, "measured_at")
    animals_with_weight = sum(1 for a in animals if a.current_weight is not None or a.id in latest_measurements)
    animals_with_health = sum(1 for a in animals if a.health_status or a.id in latest_health)
    animals_with_fertility = sum(1 for a in animals if a.fertility_status or a.id in latest_fertility)
    animals_with_production = sum(1 for a in animals if a.production_type or a.id in latest_production)
    animals_with_pedigree = sum(1 for a in animals if a.sire_id or a.dam_id)

    data_quality_items = [
        {"label": "Weight records", "complete": animals_with_weight, "total": len(animals), "rate": _pct(animals_with_weight, len(animals)), "why": "Improves growth, nutrition and genetics confidence."},
        {"label": "Health records", "complete": animals_with_health, "total": len(animals), "rate": _pct(animals_with_health, len(animals)), "why": "Supports disease risk and breeding suitability decisions."},
        {"label": "Fertility records", "complete": animals_with_fertility, "total": len(animals), "rate": _pct(animals_with_fertility, len(animals)), "why": "Supports conception, pregnancy and dam/sire performance reporting."},
        {"label": "Production records", "complete": animals_with_production, "total": len(animals), "rate": _pct(animals_with_production, len(animals)), "why": "Supports milk, meat, egg or growth performance evaluation."},
        {"label": "Pedigree links", "complete": animals_with_pedigree, "total": len(animals), "rate": _pct(animals_with_pedigree, len(animals)), "why": "Supports COI and lineage quality calculations."},
    ]

    overall_data_quality = round(mean([item["rate"] for item in data_quality_items]) if data_quality_items else 0, 1)
    health_status_counter = Counter()
    health_watchlist = []

    for animal in animals:
        rec = latest_health.get(animal.id)
        status = (getattr(rec, "health_status", None) or animal.health_status or "unknown").lower()
        health_status_counter[_title(status)] += 1
        disease = getattr(rec, "disease_history", None) or animal.disease_history
        hereditary = getattr(rec, "hereditary_conditions", None) or animal.hereditary_conditions

        if status in NEGATIVE_HEALTH or disease or hereditary:
            health_watchlist.append({
                "animal_id": animal.animal_id,
                "breed": animal.breed,
                "status": _title(status),
                "issue": hereditary or disease or "Health status requires review",
            })

    method_stats = defaultdict(lambda: {"attempts": 0, "successes": 0, "failures": 0, "live_offspring": 0})
    sire_stats = defaultdict(lambda: {"animal_id": "Unknown", "attempts": 0, "successes": 0, "failures": 0, "live_offspring": 0})
    dam_stats = defaultdict(lambda: {"animal_id": "Unknown", "attempts": 0, "successes": 0, "failures": 0, "live_offspring": 0})
    outcome_counts = Counter()
    month_counts = defaultdict(int)

    for event in events:
        method = _title(event.breeding_method, "Unknown")

        method_stats[method]["attempts"] += 1

        if event.outcome in SUCCESS_OUTCOMES:
            method_stats[method]["successes"] += 1

        if event.outcome in FAILED_OUTCOMES:
            method_stats[method]["failures"] += 1

        method_stats[method]["live_offspring"] += int(event.live_offspring_count or event.offspring_count or (1 if event.offspring_id else 0)) if event.outcome == "live_birth" else 0

        if event.outcome:
            outcome_counts[_title(event.outcome)] += 1

        else:
            outcome_counts[_title(event.status, "Open")] += 1

        sire = animal_by_id.get(event.sire_id) if event.sire_id else None
        dam = animal_by_id.get(event.dam_id) if event.dam_id else None

        if sire:
            sire_stats[sire.id]["animal_id"] = sire.animal_id
            sire_stats[sire.id]["attempts"] += 1

            if event.outcome in SUCCESS_OUTCOMES:
                sire_stats[sire.id]["successes"] += 1
                sire_stats[sire.id]["live_offspring"] += int(event.live_offspring_count or event.offspring_count or 1)

            if event.outcome in FAILED_OUTCOMES:
                sire_stats[sire.id]["failures"] += 1

        if dam:
            dam_stats[dam.id]["animal_id"] = dam.animal_id
            dam_stats[dam.id]["attempts"] += 1

            if event.outcome in SUCCESS_OUTCOMES:
                dam_stats[dam.id]["successes"] += 1
                dam_stats[dam.id]["live_offspring"] += int(event.live_offspring_count or event.offspring_count or 1)

            if event.outcome in FAILED_OUTCOMES:
                dam_stats[dam.id]["failures"] += 1

        if event.outcome == "live_birth":
            event_date = event.outcome_date or event.expected_due_date or event.breeding_date

            if event_date:
                month_counts[event_date.strftime("%Y-%m")] += int(event.live_offspring_count or event.offspring_count or 1)

    method_performance = []

    for method, stats in method_stats.items():
        method_performance.append({

            "method": method,
            **stats,
            "success_rate": _pct(stats["successes"], stats["successes"] + stats["failures"]),

        })

    method_performance.sort(key=lambda x: (x["success_rate"], x["attempts"]), reverse=True)

    sire_performance = []

    for stats in sire_stats.values():
        sire_performance.append({**stats, "success_rate": _pct(stats["successes"], stats["successes"] + stats["failures"])})

    sire_performance.sort(key=lambda x: (x["success_rate"], x["live_offspring"], x["attempts"]), reverse=True)

    dam_watchlist = []

    for stats in dam_stats.values():
        if stats["failures"] >= 1 or stats["attempts"] >= 2:
            dam_watchlist.append({**stats, "success_rate": _pct(stats["successes"], stats["successes"] + stats["failures"])})

    dam_watchlist.sort(key=lambda x: (x["failures"], -x["success_rate"]), reverse=True)

    herd_age_groups = Counter()

    for animal in animals:
        months = _animal_age_months(animal, today)

        if months is None:
            herd_age_groups["Unknown"] += 1

        elif months < 6:
            herd_age_groups["0–6 months"] += 1

        elif months < 12:
            herd_age_groups["6–12 months"] += 1

        elif months < 24:
            herd_age_groups["12–24 months"] += 1

        else:
            herd_age_groups["24+ months"] += 1

    daily_milk_values = [r.daily_milk_yield for r in production_records if r.daily_milk_yield is not None]
    adg_values = [r.average_daily_gain for r in production_records if r.average_daily_gain is not None]
    egg_values = [r.egg_count_annual for r in production_records if r.egg_count_annual is not None]
    recommended_actions = []

    if overdue:
        recommended_actions.append({"priority": "urgent", "title": "Update overdue pregnancies", "description": f"{len(overdue)} pregnancy record(s) are past expected delivery date and need an outcome."})

    if pending_checks:
        recommended_actions.append({"priority": "high", "title": "Confirm pregnancy status", "description": f"{len(pending_checks)} served breeding event(s) still need confirmation or failure recording."})

    weakest_data = min(data_quality_items, key=lambda x: x["rate"], default=None)

    if weakest_data and weakest_data["rate"] < 70:
        recommended_actions.append({"priority": "medium", "title": f"Improve {weakest_data['label'].lower()}", "description": f"Only {weakest_data['rate']}% complete. {weakest_data['why']}"})

    if failed_events:
        recommended_actions.append({"priority": "medium", "title": "Review failed reproductive outcomes", "description": f"{len(failed_events)} failed/lost outcome(s) should be reviewed for fertility, health or pairing issues."})

    if not recommended_actions:
        recommended_actions.append({"priority": "normal", "title": "Records look stable", "description": "No urgent reproductive or data-quality issues were detected from current records."})

    recent_animals = sorted(animals, key=lambda a: a.created_at or date.min, reverse=True)[:10]
    recent_events = sorted(events, key=lambda e: e.breeding_date or date.min, reverse=True)[:10]
    analytics = breeding_service.get_breeding_analytics(db=db, breeder_id=breeder_id)
    alerts = breeding_service.get_breeding_alerts(db=db, breeder_id=breeder_id)
    return {

        "farm_profile": {
            "farm_name": breeder.farm_name if breeder else None,
            "breeder_name": breeder.full_name if breeder else None,
            "location": breeder.farm_location if breeder else None,
            "county": breeder.county if breeder else None,
            "primary_animal_type": breeder.animal_type if breeder else None,
            "generated_on": today.isoformat(),
        },

        "summary": {
            "total_animals": len(animals),
            "males": gender_counts.get("male", 0),
            "females": gender_counts.get("female", 0),
            "breeding_events": len(events),
            "open_breeding_events": len(open_events),
            "active_pregnancies": len(active_pregnancies),
            "pending_pregnancy_checks": len(pending_checks),
            "due_soon": len(due_soon),
            "overdue_pregnancies": len(overdue),
            "births_this_year": births_this_year,
            "live_offspring_total": live_offspring_total,
            "offspring_survival_rate": survival_rate,
            "closed_success_rate": _pct(len(live_birth_events), len(live_birth_events) + len(failed_events)),
            "overall_data_quality": overall_data_quality,
            "open_alerts": alerts.get("total", 0),
        },

        "animal_breakdown": {
            "by_gender": dict(gender_counts),
            "by_breed": dict(breed_counts.most_common(12)),
            "by_type": dict(type_counts),
            "age_groups": dict(herd_age_groups),
        },

        "breeding_analytics": analytics,
        "alerts": alerts,

        "data_quality": {
            "overall_score": overall_data_quality,
            "items": data_quality_items,
        },

        "reproductive_report": {
            "outcome_breakdown": dict(outcome_counts),
            "method_performance": method_performance[:8],
            "sire_performance": sire_performance[:10],
            "dam_watchlist": dam_watchlist[:10],
            
            "pregnancy_workload": {
                "active": len(active_pregnancies),
                "due_soon": len(due_soon),
                "overdue": len(overdue),
                "pending_confirmation": len(pending_checks),
            },
        },

        "health_report": {
            "status_breakdown": dict(health_status_counter),
            "watchlist": health_watchlist[:10],
            "latest_record_count": len(latest_health),
        },

        "production_report": {
            "animals_with_production_records": animals_with_production,
            "average_daily_milk_yield": round(mean(daily_milk_values), 2) if daily_milk_values else None,
            "average_daily_gain": round(mean(adg_values), 2) if adg_values else None,
            "average_annual_egg_count": round(mean(egg_values), 2) if egg_values else None,
        },

        "recommended_actions": recommended_actions,

        "recent_animals": [
            {
                "id": a.id,
                "animal_id": a.animal_id,
                "animal_type": a.animal_type,
                "breed": a.breed,
                "gender": a.gender,
                "date_of_birth": _str_date(a.date_of_birth),
                "current_weight": a.current_weight,
                "health_status": a.health_status,
                "fertility_status": a.fertility_status,
                "created_at": str(a.created_at) if a.created_at else None,
            }

            for a in recent_animals

        ],

        "recent_breeding_events": [
            {
                "id": e.id,
                "breeding_method": e.breeding_method,
                "dam_id": e.dam_id,
                "dam_animal_id": _animal_label(animal_by_id.get(e.dam_id)),
                "sire_id": e.sire_id,
                "sire_animal_id": _animal_label(animal_by_id.get(e.sire_id)) if e.sire_id else "—",
                "breeding_date": _str_date(e.breeding_date),
                "expected_due_date": _str_date(e.expected_due_date),
                "status": e.status,
                "outcome": e.outcome,
                "offspring_count": e.offspring_count,
                "live_offspring_count": e.live_offspring_count,
            }

            for e in recent_events

        ],
       "birth_trends": dict(sorted(month_counts.items())),

    }
