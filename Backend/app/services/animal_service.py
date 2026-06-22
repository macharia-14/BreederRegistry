# Backend/app/services/animal_service.py: contains backend logic for the Animal Breed Registry System.
"""Business rules for breeder-owned animal records.

This module intentionally separates validation and ownership checks from the
FastAPI route layer. It keeps the API endpoints small and makes animal-related
rules easier to test and maintain.
"""

from __future__ import annotations
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from .. import crud, models, schemas

PARENT_GENDER = {
    "sire_id": "male",
    "dam_id": "female",
}

# Handles ensure breeder access logic for this module.
def ensure_breeder_access(breeder_id: int, current_breeder: models.Breeder) -> None:
    """Raise 403 when a breeder tries to access another breeder's records."""

    if current_breeder.id != breeder_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

# Retrieves owned animal or 404 records from the database.
def get_owned_animal_or_404(db: Session, *, breeder_id: int, animal_db_id: int) -> models.Animal:
    animal = (
        db.query(models.Animal)
        .filter(models.Animal.id == animal_db_id, models.Animal.breeder_id == breeder_id)
        .first()
    )

    if not animal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Animal not found")
    return animal

# Validates parent public id before the request continues.
def validate_parent_public_id(
    db: Session,
    *,
    breeder_id: int,
    parent_public_id: str | None,
    expected_gender: str,
    child_db_id: int | None = None,
    label: str,

) -> models.Animal | None:
    """Validate a parent selected by public animal ID.

    The frontend sends public IDs like FAR-001; the database stores parent
    relationships using integer primary keys. This function validates ownership,
    gender, and self-parenting before crud converts the public ID to the DB ID.
    """

    if not parent_public_id:
        return None
    parent = crud.get_animal_by_animal_id(db, parent_public_id)
    if not parent or parent.breeder_id != breeder_id or parent.gender != expected_gender:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid or inaccessible {label} ID: {parent_public_id}",
        )

    if child_db_id is not None and parent.id == child_db_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"An animal cannot be its own {label}.",
        )
    return parent

# Validates animal create before the request continues.
def validate_animal_create(db: Session, *, breeder_id: int, animal: schemas.AnimalCreate) -> None:
    validate_parent_public_id(
        db,
        breeder_id=breeder_id,
        parent_public_id=animal.sire_id,
        expected_gender="male",
        label="sire",
    )

    validate_parent_public_id(
        db,
        breeder_id=breeder_id,
        parent_public_id=animal.dam_id,
        expected_gender="female",
        label="dam",
    )

# Creates and stores a new animal for breeder record.
def create_animal_for_breeder(db: Session, *, breeder_id: int, animal: schemas.AnimalCreate) -> models.Animal:
    validate_animal_create(db, breeder_id=breeder_id, animal=animal)
    return crud.create_animal(db=db, animal=animal, breeder_id=breeder_id)

# Validates animal update before the request continues.
def validate_animal_update(
    db: Session,
    *,
    breeder_id: int,
    animal_db_id: int,
    animal: schemas.AnimalUpdate,
) -> None:
    update_data = animal.model_dump(exclude_unset=True)
    if "sire_id" in update_data:
        validate_parent_public_id(
            db,
            breeder_id=breeder_id,
            parent_public_id=update_data.get("sire_id"),
            expected_gender="male",
            child_db_id=animal_db_id,
            label="sire",
        )

    if "dam_id" in update_data:
        validate_parent_public_id(
            db,
            breeder_id=breeder_id,
            parent_public_id=update_data.get("dam_id"),
            expected_gender="female",
            child_db_id=animal_db_id,
            label="dam",
        )

# Updates an existing animal for breeder record with validated values.
def update_animal_for_breeder(
    db: Session,
    *,
    breeder_id: int,
    animal_db_id: int,
    animal: schemas.AnimalUpdate,

) -> models.Animal:
    db_animal = get_owned_animal_or_404(db, breeder_id=breeder_id, animal_db_id=animal_db_id)

    validate_animal_update(db, breeder_id=breeder_id, animal_db_id=animal_db_id, animal=animal)
    return crud.update_animal(db=db, db_animal=db_animal, animal=animal)

# Creates and stores a new measurement for animal record.
def create_measurement_for_animal(

    db: Session,
    *,
    breeder_id: int,
    animal_db_id: int,
    measurement: schemas.AnimalMeasurementCreate,
) -> models.AnimalMeasurement:
    db_animal = get_owned_animal_or_404(db, breeder_id=breeder_id, animal_db_id=animal_db_id)
    return crud.create_animal_measurement(db=db, db_animal=db_animal, measurement=measurement)

# Retrieves measurements for animal records from the database.
def get_measurements_for_animal(db: Session, *, breeder_id: int, animal_db_id: int):
    db_animal = get_owned_animal_or_404(db, breeder_id=breeder_id, animal_db_id=animal_db_id)
    return crud.get_animal_measurements(db=db, db_animal=db_animal)

# Removes the selected animal for breeder record from storage.
def delete_animal_for_breeder(db: Session, *, breeder_id: int, animal_db_id: int) -> None:
    animal_to_delete = get_owned_animal_or_404(db, breeder_id=breeder_id, animal_db_id=animal_db_id)

    is_parent = (
        db.query(models.Animal)
        .filter((models.Animal.sire_id == animal_to_delete.id) | (models.Animal.dam_id == animal_to_delete.id))
        .first()
    )

    if is_parent:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot delete {animal_to_delete.animal_id} as it is a parent to other animals.",
        )

    is_in_event = (
        db.query(models.BreedingEvent)
        .filter(
            (models.BreedingEvent.dam_id == animal_to_delete.id)
            | (models.BreedingEvent.sire_id == animal_to_delete.id)
            | (models.BreedingEvent.offspring_id == animal_to_delete.id)
        )
        .first()
    )

    if is_in_event:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot delete {animal_to_delete.animal_id} as it is part of a breeding event history.",
        )

    db.delete(animal_to_delete)
    db.commit()

# Retrieves animal full profile for breeder records from the database.
def get_animal_full_profile_for_breeder(db: Session, *, breeder_id: int, animal_db_id: int):
    db_animal = get_owned_animal_or_404(db, breeder_id=breeder_id, animal_db_id=animal_db_id)
    return crud.get_animal_full_profile(db=db, db_animal=db_animal)

# Creates and stores a new health record for animal record.
def create_health_record_for_animal(db: Session, *, breeder_id: int, animal_db_id: int, payload: schemas.AnimalHealthRecordCreate):
    db_animal = get_owned_animal_or_404(db, breeder_id=breeder_id, animal_db_id=animal_db_id)
    return crud.create_health_record(db=db, db_animal=db_animal, payload=payload)

# Creates and stores a new fertility record for animal record.
def create_fertility_record_for_animal(db: Session, *, breeder_id: int, animal_db_id: int, payload: schemas.AnimalFertilityRecordCreate):
    db_animal = get_owned_animal_or_404(db, breeder_id=breeder_id, animal_db_id=animal_db_id)
    return crud.create_fertility_record(db=db, db_animal=db_animal, payload=payload)

# Creates and stores a new production record for animal record.
def create_production_record_for_animal(db: Session, *, breeder_id: int, animal_db_id: int, payload: schemas.AnimalProductionRecordCreate):
    db_animal = get_owned_animal_or_404(db, breeder_id=breeder_id, animal_db_id=animal_db_id)
    return crud.create_production_record(db=db, db_animal=db_animal, payload=payload)

# Creates and stores a new offspring record for animal record.
def create_offspring_record_for_animal(db: Session, *, breeder_id: int, animal_db_id: int, payload: schemas.AnimalOffspringRecordCreate):
    db_animal = get_owned_animal_or_404(db, breeder_id=breeder_id, animal_db_id=animal_db_id)
    return crud.create_offspring_record(db=db, db_animal=db_animal, payload=payload)

# Creates and stores a new note for animal record.
def create_note_for_animal(db: Session, *, breeder_id: int, animal_db_id: int, payload: schemas.AnimalNoteCreate):
    db_animal = get_owned_animal_or_404(db, breeder_id=breeder_id, animal_db_id=animal_db_id)
    return crud.create_animal_note(db=db, db_animal=db_animal, payload=payload)

# Updates an existing breeding event for breeder record with validated values.
def update_breeding_event_for_breeder(db: Session, *, breeder_id: int, event_id: int, payload: schemas.BreedingEventUpdate):
    db_event = db.query(models.BreedingEvent).filter(models.BreedingEvent.id == event_id, models.BreedingEvent.breeder_id == breeder_id).first()

    if not db_event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Breeding event not found")

    data = payload.model_dump(exclude_unset=True)

    if data.get("offspring_id"):
        offspring = crud.get_animal(db, data["offspring_id"])

        if not offspring or offspring.breeder_id != breeder_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid offspring ID")
    return crud.update_breeding_event(db=db, db_event=db_event, payload=payload)
