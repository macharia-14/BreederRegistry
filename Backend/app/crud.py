# Backend/app/crud.py: contains backend logic for the Animal Breed Registry System.
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime, timezone
from . import models, schemas
from .utils.core import generate_animal_id

MEASUREMENT_FIELDS = {
    "birth_weight": "birth_weight",
    "current_weight": "current_weight",
    "weaning_weight": "weaning_weight",
    "mature_weight": "mature_weight",
    "body_condition_score": "body_condition_score",
}

HEALTH_FIELDS = ["health_status", "vaccination_status", "disease_history", "hereditary_conditions", "vet_notes"]
FERTILITY_FIELDS = ["fertility_status", "age_at_first_service_months", "services_per_conception", "birth_interval_days"]
PRODUCTION_FIELDS = ["production_type", "daily_milk_yield", "milk_fat_percent", "egg_count_annual", "average_daily_gain"]
OFFSPRING_FIELDS = ["offspring_count", "offspring_survival_rate", "offspring_quality_score"]
ANIMAL_CORE_FIELDS = {"animal_type", "breed", "gender", "date_of_birth"}
SNAPSHOT_FIELDS = set(MEASUREMENT_FIELDS) | set(HEALTH_FIELDS) | set(FERTILITY_FIELDS) | set(PRODUCTION_FIELDS) | set(OFFSPRING_FIELDS)

# Internal helper for has any value.
def _has_any_value(payload, fields):
    return any(getattr(payload, field, None) is not None for field in fields)

# Internal helper for create initial snapshot records.
def _create_initial_snapshot_records(db: Session, db_animal: models.Animal, payload, record_date=None):
    record_date = record_date or getattr(payload, "date_of_birth", None) or datetime.now(timezone.utc).date()

    for field, measurement_type in MEASUREMENT_FIELDS.items():
        value = getattr(payload, field, None)
        if value is not None:
            db.add(models.AnimalMeasurement(
                animal_id=db_animal.id,
                breeder_id=db_animal.breeder_id,
                measurement_type=measurement_type,
                value=value,
                unit="score" if field == "body_condition_score" else "kg",
                measured_at=record_date,
                notes="Initial animal registration value",
            ))

    if _has_any_value(payload, HEALTH_FIELDS):
        db.add(models.AnimalHealthRecord(
            animal_id=db_animal.id,
            breeder_id=db_animal.breeder_id,
            record_date=record_date,
            **{field: getattr(payload, field, None) for field in HEALTH_FIELDS},
        ))

    if _has_any_value(payload, FERTILITY_FIELDS):
        db.add(models.AnimalFertilityRecord(
            animal_id=db_animal.id,
            breeder_id=db_animal.breeder_id,
            record_date=record_date,
            **{field: getattr(payload, field, None) for field in FERTILITY_FIELDS},
            notes="Initial animal registration value",
        ))

    if _has_any_value(payload, PRODUCTION_FIELDS):
        db.add(models.AnimalProductionRecord(
            animal_id=db_animal.id,
            breeder_id=db_animal.breeder_id,
            record_date=record_date,
            **{field: getattr(payload, field, None) for field in PRODUCTION_FIELDS},
            notes="Initial animal registration value",
        ))

    if _has_any_value(payload, OFFSPRING_FIELDS):
        db.add(models.AnimalOffspringRecord(
            animal_id=db_animal.id,
            breeder_id=db_animal.breeder_id,
            record_date=record_date,
            **{field: getattr(payload, field, None) for field in OFFSPRING_FIELDS},
            notes="Initial animal registration value",
        ))

# Retrieves animal records from the database.
def get_animal(db: Session, animal_id: int):
    return db.query(models.Animal).filter(models.Animal.id == animal_id).first()

# Retrieves animal by animal id records from the database.
def get_animal_by_animal_id(db: Session, animal_id: str):
    return db.query(models.Animal).filter(models.Animal.animal_id == animal_id).first()

# Retrieves animals by breeder records from the database.
def get_animals_by_breeder(db: Session, breeder_id: int, skip: int = 0, limit: int = 100):
    return db.query(models.Animal).filter(models.Animal.breeder_id == breeder_id).offset(skip).limit(limit).all()

# Creates and stores a new animal record.
def create_animal(db: Session, animal: schemas.AnimalCreate, breeder_id: int):
    breeder = db.query(models.Breeder).filter(models.Breeder.id == breeder_id).first()
    if not breeder:
        raise ValueError(f"Breeder with ID {breeder_id} not found")

    farm_prefix = breeder.farm_prefix or "FAR"
    animal_id = generate_animal_id(db, farm_prefix)

    sire_db_id = None
    if animal.sire_id:
        sire = get_animal_by_animal_id(db, animal.sire_id)
        if sire:
            sire_db_id = sire.id

    dam_db_id = None
    if animal.dam_id:
        dam = get_animal_by_animal_id(db, animal.dam_id)
        if dam:
            dam_db_id = dam.id

    db_animal = models.Animal(
        animal_id=animal_id,
        animal_type=animal.animal_type,
        breed=animal.breed,
        gender=animal.gender,
        date_of_birth=animal.date_of_birth,
        sire_id=sire_db_id,
        dam_id=dam_db_id,
        breeder_id=breeder_id,
    )

    db.add(db_animal)
    db.flush()
    _create_initial_snapshot_records(db, db_animal, animal)
    db.commit()
    db.refresh(db_animal)
    return db_animal

# Updates an existing animal record with validated values.
def update_animal(db: Session, db_animal: models.Animal, animal: schemas.AnimalUpdate):
    update_data = animal.model_dump(exclude_unset=True)

    if "sire_id" in update_data:
        sire_public_id = update_data.pop("sire_id")
        db_animal.sire_id = get_animal_by_animal_id(db, sire_public_id).id if sire_public_id else None

    if "dam_id" in update_data:
        dam_public_id = update_data.pop("dam_id")
        db_animal.dam_id = get_animal_by_animal_id(db, dam_public_id).id if dam_public_id else None

    snapshot_data = {field: update_data.pop(field) for field in list(update_data.keys()) if field in SNAPSHOT_FIELDS}

    for field, value in update_data.items():
        if field in ANIMAL_CORE_FIELDS:
            setattr(db_animal, field, value)

    db_animal.updated_at = datetime.now(timezone.utc)
    db.add(db_animal)
    db.flush()

    if snapshot_data:
        snapshot_payload = type("SnapshotPayload", (), snapshot_data | {"date_of_birth": datetime.now(timezone.utc).date()})()
        _create_initial_snapshot_records(db, db_animal, snapshot_payload, record_date=datetime.now(timezone.utc).date())

    db.commit()
    db.refresh(db_animal)
    return db_animal

# Creates and stores a new animal measurement record.
def create_animal_measurement(db: Session, db_animal: models.Animal, measurement: schemas.AnimalMeasurementCreate):
    db_measurement = models.AnimalMeasurement(
        animal_id=db_animal.id,
        breeder_id=db_animal.breeder_id,
        measurement_type=measurement.measurement_type,
        value=measurement.value,
        unit=measurement.unit,
        measured_at=measurement.measured_at,
        notes=measurement.notes,
    )
    db_animal.updated_at = datetime.now(timezone.utc)
    db.add(db_measurement)
    db.add(db_animal)
    db.commit()
    db.refresh(db_measurement)
    db.refresh(db_animal)
    return db_measurement

# Retrieves animal measurements records from the database.
def get_animal_measurements(db: Session, db_animal: models.Animal, limit: int = 50):
    return (
        db.query(models.AnimalMeasurement)
        .filter(models.AnimalMeasurement.animal_id == db_animal.id)
        .order_by(models.AnimalMeasurement.measured_at.desc(), models.AnimalMeasurement.id.desc())
        .limit(limit)
        .all()
    )

# Retrieves breeding event records from the database.
def get_breeding_event(db: Session, event_id: int):
    return db.query(models.BreedingEvent).filter(models.BreedingEvent.id == event_id).first()

# Retrieves breeding events by breeder records from the database.
def get_breeding_events_by_breeder(db: Session, breeder_id: int, skip: int = 0, limit: int = 100):
    return (db.query(models.BreedingEvent)
        .filter(models.BreedingEvent.breeder_id == breeder_id)
        .order_by(models.BreedingEvent.breeding_date.desc(), models.BreedingEvent.id.desc())
        .offset(skip).limit(limit).all())

# Creates and stores a new breeding event record.
def create_breeding_event(db: Session, breeding_event: schemas.BreedingEventCreate, breeder_id: int):
    db_event = models.BreedingEvent(
        breeding_method=breeding_event.breeding_method,
        dam_id=breeding_event.dam_id,
        sire_id=breeding_event.sire_id,
        breeding_date=breeding_event.breeding_date,
        expected_due_date=breeding_event.expected_due_date,
        offspring_id=breeding_event.offspring_id,
        semen_source=breeding_event.semen_source,
        ai_technician=breeding_event.ai_technician,
        batch_number=breeding_event.batch_number,
        donor_dam=breeding_event.donor_dam,
        embryo_id=breeding_event.embryo_id,
        notes=breeding_event.notes,
        status=breeding_event.status or ("completed" if breeding_event.offspring_id else "served"),
        pregnancy_confirmed=breeding_event.pregnancy_confirmed or bool(breeding_event.offspring_id),
        pregnancy_check_date=breeding_event.pregnancy_check_date,
        outcome=breeding_event.outcome or ("live_birth" if breeding_event.offspring_id else None),
        outcome_date=breeding_event.outcome_date,
        offspring_count=breeding_event.offspring_count,
        live_offspring_count=breeding_event.live_offspring_count,
        outcome_notes=breeding_event.outcome_notes,
        breeder_id=breeder_id
    )

    db.add(db_event)

    db.commit()

    db.refresh(db_event)
    return db_event

# Internal helper for latest first.
def _latest_first(query):
    return query.order_by(text('record_date DESC'), text('id DESC')).limit(100).all()

# Creates and stores a new health record record.
def create_health_record(db: Session, db_animal: models.Animal, payload: schemas.AnimalHealthRecordCreate):
    rec = models.AnimalHealthRecord(animal_id=db_animal.id, breeder_id=db_animal.breeder_id, **payload.model_dump())
    db_animal.updated_at = datetime.now(timezone.utc)
    db.add(rec)
    db.add(db_animal)
    db.commit()
    db.refresh(rec)
    return rec

# Creates and stores a new fertility record record.
def create_fertility_record(db: Session, db_animal: models.Animal, payload: schemas.AnimalFertilityRecordCreate):
    rec = models.AnimalFertilityRecord(animal_id=db_animal.id, breeder_id=db_animal.breeder_id, **payload.model_dump())
    db_animal.updated_at = datetime.now(timezone.utc)
    db.add(rec)
    db.add(db_animal)
    db.commit()
    db.refresh(rec)
    return rec

# Creates and stores a new production record record.
def create_production_record(db: Session, db_animal: models.Animal, payload: schemas.AnimalProductionRecordCreate):
    rec = models.AnimalProductionRecord(animal_id=db_animal.id, breeder_id=db_animal.breeder_id, **payload.model_dump())
    db_animal.updated_at = datetime.now(timezone.utc)
    db.add(rec)
    db.add(db_animal)
    db.commit()
    db.refresh(rec)
    return rec

# Creates and stores a new offspring record record.
def create_offspring_record(db: Session, db_animal: models.Animal, payload: schemas.AnimalOffspringRecordCreate):
    rec = models.AnimalOffspringRecord(animal_id=db_animal.id, breeder_id=db_animal.breeder_id, **payload.model_dump())
    db_animal.updated_at = datetime.now(timezone.utc)
    db.add(rec)
    db.add(db_animal)
    db.commit()
    db.refresh(rec)
    return rec

# Creates and stores a new animal note record.
def create_animal_note(db: Session, db_animal: models.Animal, payload: schemas.AnimalNoteCreate):
    rec = models.AnimalNote(animal_id=db_animal.id, breeder_id=db_animal.breeder_id, note_type=payload.note_type or "general", note=payload.note)

    db.add(rec); db.commit(); db.refresh(rec); return rec

# Retrieves animal full profile records from the database.
def get_animal_full_profile(db: Session, db_animal: models.Animal):
    return {
        "animal": db_animal,
        "measurements": get_animal_measurements(db, db_animal, limit=100),
        "health_records": _latest_first(db.query(models.AnimalHealthRecord).filter(models.AnimalHealthRecord.animal_id == db_animal.id)),
        "fertility_records": _latest_first(db.query(models.AnimalFertilityRecord).filter(models.AnimalFertilityRecord.animal_id == db_animal.id)),
        "production_records": _latest_first(db.query(models.AnimalProductionRecord).filter(models.AnimalProductionRecord.animal_id == db_animal.id)),
        "offspring_records": _latest_first(db.query(models.AnimalOffspringRecord).filter(models.AnimalOffspringRecord.animal_id == db_animal.id)),
        "notes": db.query(models.AnimalNote).filter(models.AnimalNote.animal_id == db_animal.id).order_by(models.AnimalNote.id.desc()).limit(100).all(),
    }

# Updates an existing breeding event record with validated values.
def update_breeding_event(db: Session, db_event: models.BreedingEvent, payload: schemas.BreedingEventUpdate):
    data = payload.model_dump(exclude_unset=True)

    if data.get("outcome") == "live_birth":
        data.setdefault("status", "completed")
        data.setdefault("pregnancy_confirmed", True)

    elif data.get("outcome") in {"failed_conception", "miscarriage", "stillbirth", "abortion"}:
        data.setdefault("status", "failed" if data.get("outcome") == "failed_conception" else "lost")

        if data.get("outcome") == "failed_conception":
            data.setdefault("pregnancy_confirmed", False)

    elif data.get("pregnancy_confirmed") is True:
        data.setdefault("status", "confirmed_pregnant")

    for field, value in data.items():
        setattr(db_event, field, value)

    db_event.updated_at = datetime.now(timezone.utc)
    db.add(db_event); db.commit(); db.refresh(db_event); return db_event
