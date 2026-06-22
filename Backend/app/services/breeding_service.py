# Backend/app/services/breeding_service.py: contains backend logic for the Animal Breed Registry System.
"""Production business rules for breeding and pregnancy workflows."""

from __future__ import annotations
from datetime import date, datetime, timezone, timedelta
from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from .. import crud, models, schemas
from ..genetics import get_gestation_days

ACTIVE_STATUSES = {"planned", "served", "confirmed_pregnant"}
CLOSED_STATUSES = {"not_pregnant", "failed", "completed", "lost", "cancelled"}
PREGNANCY_LOSS_OUTCOMES = {"miscarriage", "stillbirth", "abortion"}
FAILED_OUTCOMES = {"failed_conception"}
SUCCESS_OUTCOMES = {"live_birth"}
ALL_OUTCOMES = SUCCESS_OUTCOMES | FAILED_OUTCOMES | PREGNANCY_LOSS_OUTCOMES | {"unknown"}

# Internal helper for today.
def _today() -> date:
    return date.today()

# Retrieves owned breeding event or 404 records from the database.
def get_owned_breeding_event_or_404(db: Session, *, breeder_id: int, event_id: int) -> models.BreedingEvent:
    event = (
        db.query(models.BreedingEvent)
        .filter(models.BreedingEvent.id == event_id, models.BreedingEvent.breeder_id == breeder_id)
        .first()
    )

    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Breeding event not found")
    return event

# Internal helper for get owned animal.
def _get_owned_animal(db: Session, *, breeder_id: int, animal_id: Optional[int], label: str) -> Optional[models.Animal]:
    if animal_id is None:
        return None
    animal = crud.get_animal(db, animal_id)

    if not animal or animal.breeder_id != breeder_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid {label} ID")
    return animal

# Internal helper for validate due date.
def _validate_due_date(*, breeding_date: date, expected_due_date: Optional[date]) -> None:
    if expected_due_date and expected_due_date <= breeding_date:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Expected due date must be after breeding date")

# Internal helper for validate breeding date.
def _validate_breeding_date(breeding_date: date) -> None:
    if breeding_date > _today():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Breeding date cannot be in the future")

# Internal helper for validate pair.
def _validate_pair(db: Session, *, breeder_id: int, dam_id: int, sire_id: Optional[int]) -> tuple[models.Animal, Optional[models.Animal]]:
    dam = _get_owned_animal(db, breeder_id=breeder_id, animal_id=dam_id, label="dam")

    if dam.gender != "female":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Dam must be female")

    sire = _get_owned_animal(db, breeder_id=breeder_id, animal_id=sire_id, label="sire")

    if sire:
        if sire.gender != "male":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Sire must be male")

        if sire.animal_type != dam.animal_type:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Sire and dam must be the same animal type")

        if sire.id == dam.id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Dam and sire cannot be the same animal")
    return dam, sire

# Internal helper for has open pregnancy.
def _has_open_pregnancy(db: Session, *, breeder_id: int, dam_id: int, ignore_event_id: Optional[int] = None) -> bool:
    query = db.query(models.BreedingEvent).filter(

        models.BreedingEvent.breeder_id == breeder_id,
        models.BreedingEvent.dam_id == dam_id,
        models.BreedingEvent.status.in_(["served", "confirmed_pregnant"]),
        models.BreedingEvent.outcome.is_(None),

    )

    if ignore_event_id is not None:
        query = query.filter(models.BreedingEvent.id != ignore_event_id)
    return db.query(query.exists()).scalar()

# Creates and stores a new breeding event for breeder record.
def create_breeding_event_for_breeder(db: Session, *, breeder_id: int, payload: schemas.BreedingEventCreate) -> models.BreedingEvent:
    _validate_breeding_date(payload.breeding_date)

    dam, sire = _validate_pair(db, breeder_id=breeder_id, dam_id=payload.dam_id, sire_id=payload.sire_id)
    if payload.expected_due_date is None:
        payload = payload.model_copy(update={

            "expected_due_date": payload.breeding_date + timedelta(days=get_gestation_days(dam.animal_type))

        })

    _validate_due_date(breeding_date=payload.breeding_date, expected_due_date=payload.expected_due_date)

    if _has_open_pregnancy(db, breeder_id=breeder_id, dam_id=dam.id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This dam already has an open served/confirmed pregnancy event. Close it before creating another breeding event.",
        )

    if payload.offspring_id:
        offspring = _get_owned_animal(db, breeder_id=breeder_id, animal_id=payload.offspring_id, label="offspring")

        if offspring.animal_type != dam.animal_type:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Offspring must be the same animal type as dam")
    return crud.create_breeding_event(db=db, breeding_event=payload, breeder_id=breeder_id)

# Updates an existing breeding event for breeder record with validated values.
def update_breeding_event_for_breeder(db: Session, *, breeder_id: int, event_id: int, payload: schemas.BreedingEventUpdate) -> models.BreedingEvent:
    event = get_owned_breeding_event_or_404(db, breeder_id=breeder_id, event_id=event_id)

    data = payload.model_dump(exclude_unset=True)

    if not data:
        return event

    if event.outcome and any(k in data for k in ("pregnancy_confirmed", "status", "outcome")):
        mutable_after_close = set(data.keys()) <= {"notes", "outcome_notes"}

        if not mutable_after_close:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Closed breeding outcomes cannot be reopened or changed. Create a correction note instead.")

    if "pregnancy_check_date" in data and data["pregnancy_check_date"] and data["pregnancy_check_date"] > _today():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Pregnancy check date cannot be in the future")

    if "outcome_date" in data and data["outcome_date"] and data["outcome_date"] > _today():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Outcome date cannot be in the future")

    outcome = data.get("outcome")

    if outcome:
        if outcome not in ALL_OUTCOMES:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported breeding outcome")

        data.setdefault("outcome_date", _today())

        if outcome in SUCCESS_OUTCOMES:
            if data.get("live_offspring_count") is None and data.get("offspring_count") is None:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Live birth requires offspring count")

            if data.get("live_offspring_count") is not None and data.get("offspring_count") is not None and data["live_offspring_count"] > data["offspring_count"]:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Live offspring count cannot exceed total offspring count")

            data.setdefault("status", "completed")

            data.setdefault("pregnancy_confirmed", True)

        elif outcome in FAILED_OUTCOMES:
            data.setdefault("status", "failed")

            data.setdefault("pregnancy_confirmed", False)

        elif outcome in PREGNANCY_LOSS_OUTCOMES:
            data.setdefault("status", "lost")

            data.setdefault("pregnancy_confirmed", True)

    if data.get("pregnancy_confirmed") is True:
        if event.outcome:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot confirm pregnancy after outcome is already recorded")

        if _has_open_pregnancy(db, breeder_id=breeder_id, dam_id=event.dam_id, ignore_event_id=event.id):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Dam already has another open pregnancy")

        data.setdefault("status", "confirmed_pregnant")

        data.setdefault("pregnancy_check_date", _today())

    if data.get("status") == "served" and event.outcome:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Closed outcome events cannot be returned to served")

    if data.get("offspring_id"):
        offspring = _get_owned_animal(db, breeder_id=breeder_id, animal_id=data["offspring_id"], label="offspring")

        dam = crud.get_animal(db, event.dam_id)

        if offspring.animal_type != dam.animal_type:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Offspring must be the same animal type as dam")

    updated = crud.update_breeding_event(db=db, db_event=event, payload=schemas.BreedingEventUpdate(**data))

    _sync_reproductive_records_from_event(db, updated)
    return updated

# Internal helper for sync reproductive records from event.
def _sync_reproductive_records_from_event(db: Session, event: models.BreedingEvent) -> None:
    """Create lightweight fertility/offspring evidence from closed breeding outcomes."""

    if not event.outcome:
        return

    status_map = {
        "live_birth": "proven fertile",
        "failed_conception": "failed conception recorded",
        "miscarriage": "pregnancy loss recorded",
        "stillbirth": "stillbirth recorded",
        "abortion": "abortion recorded",
        "unknown": "outcome unknown",
    }

    existing_note = f"Auto-linked from breeding event #{event.id}"

    fertility_exists = (
        db.query(models.AnimalFertilityRecord)
        .filter(models.AnimalFertilityRecord.animal_id == event.dam_id, models.AnimalFertilityRecord.notes == existing_note)
        .first()
    )

    if not fertility_exists:
        fertility = models.AnimalFertilityRecord(
            animal_id=event.dam_id,
            breeder_id=event.breeder_id,
            record_date=event.outcome_date or _today(),
            fertility_status=status_map.get(event.outcome, "recorded"),
            notes=existing_note,
        )

        db.add(fertility)

    if event.outcome == "live_birth":
        total = event.offspring_count or event.live_offspring_count or 0
        live = event.live_offspring_count if event.live_offspring_count is not None else total
        survival = round((live / total) * 100, 2) if total else None
        offspring_exists = (
            db.query(models.AnimalOffspringRecord)
            .filter(models.AnimalOffspringRecord.animal_id == event.dam_id, models.AnimalOffspringRecord.notes == existing_note)
            .first()
        )

        if not offspring_exists:
            db.add(models.AnimalOffspringRecord(
                animal_id=event.dam_id,
                breeder_id=event.breeder_id,
                record_date=event.outcome_date or _today(),
                offspring_count=total,
                offspring_survival_rate=survival,
                notes=existing_note,
            ))

    db.commit()

# Retrieves breeding alerts records from the database.
def get_breeding_alerts(db: Session, *, breeder_id: int) -> dict:
    today = _today()
    events = db.query(models.BreedingEvent).filter(models.BreedingEvent.breeder_id == breeder_id).all()
    alerts = []
    for event in events:
        if event.status not in {"served", "confirmed_pregnant"} or event.outcome:
            continue

        dam = crud.get_animal(db, event.dam_id)

        if not dam:
            continue

        gestation = get_gestation_days(dam.animal_type)
        due = event.expected_due_date or event.breeding_date + timedelta(days=gestation)
        days = (due - today).days

        if not event.pregnancy_confirmed:
            check_due = event.breeding_date + timedelta(days=30)
            check_days = (check_due - today).days

            if check_days <= 0:
                alerts.append({"type": "pregnancy_check_due", "severity": "warning", "event_id": event.id, "animal_id": dam.animal_id, "message": "Pregnancy confirmation is due", "due_date": str(check_due), "days_remaining": check_days})

        if event.pregnancy_confirmed and days <= 21:
            alerts.append({"type": "delivery_due", "severity": "danger" if days < 0 else "warning", "event_id": event.id, "animal_id": dam.animal_id, "message": "Expected delivery date is near" if days >= 0 else "Expected delivery is overdue", "due_date": str(due), "days_remaining": days})

    alerts.sort(key=lambda a: (a["days_remaining"], a["event_id"]))
    return {"total": len(alerts), "alerts": alerts}

# Retrieves breeding analytics records from the database.
def get_breeding_analytics(db: Session, *, breeder_id: int) -> dict:
    events = db.query(models.BreedingEvent).filter(models.BreedingEvent.breeder_id == breeder_id).all()
    total = len(events)
    live_births = sum(1 for e in events if e.outcome == "live_birth")
    failed = sum(1 for e in events if e.outcome == "failed_conception")
    losses = sum(1 for e in events if e.outcome in PREGNANCY_LOSS_OUTCOMES)
    pending = sum(1 for e in events if e.status in {"served", "confirmed_pregnant"} and not e.outcome)
    confirmed = sum(1 for e in events if e.pregnancy_confirmed)
    methods = {}

    for e in events:
        key = e.breeding_method or "unknown"

        if key not in methods:
            methods[key] = {"total": 0, "live_births": 0, "failures": 0, "losses": 0, "success_rate": 0}

        methods[key]["total"] += 1

        if e.outcome == "live_birth":
            methods[key]["live_births"] += 1

        if e.outcome == "failed_conception":
            methods[key]["failures"] += 1

        if e.outcome in PREGNANCY_LOSS_OUTCOMES:
            methods[key]["losses"] += 1

    for data in methods.values():
        closed = data["live_births"] + data["failures"] + data["losses"]

        data["success_rate"] = round((data["live_births"] / closed) * 100, 2) if closed else None

    closed_total = live_births + failed + losses
    return {

        "summary": {
            "total_events": total,
            "pending_events": pending,
            "confirmed_pregnancies": confirmed,
            "live_births": live_births,
            "failed_conceptions": failed,
            "pregnancy_losses": losses,
            "success_rate": round((live_births / closed_total) * 100, 2) if closed_total else None,
        },

        "by_method": methods,

    }
