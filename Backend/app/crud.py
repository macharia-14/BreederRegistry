# backend/app/crud.py
from sqlalchemy.orm import Session
from . import models, schemas
from .utils import generate_animal_id

def get_animal(db: Session, animal_id: int):
    return db.query(models.Animal).filter(models.Animal.id == animal_id).first()

def get_animal_by_animal_id(db: Session, animal_id: str):
    return db.query(models.Animal).filter(models.Animal.animal_id == animal_id).first()

def get_animals_by_breeder(db: Session, breeder_id: int, skip: int = 0, limit: int = 100):
    return db.query(models.Animal).filter(models.Animal.breeder_id == breeder_id).offset(skip).limit(limit).all()

def create_animal(db: Session, animal: schemas.AnimalCreate, breeder_id: int):
    # Generate unique animal ID
    farm_prefix = db.query(models.Breeder.farm_prefix).filter(models.Breeder.id == breeder_id).first()[0]
    animal_id = generate_animal_id(db, farm_prefix)
    
    db_animal = models.Animal(
        animal_id=animal_id,
        animal_type=animal.animal_type,
        breed=animal.breed,
        gender=animal.gender,
        date_of_birth=animal.date_of_birth,
        sire_id=animal.sire_id,
        dam_id=animal.dam_id,
        breeder_id=breeder_id
    )
    db.add(db_animal)
    db.commit()
    db.refresh(db_animal)
    return db_animal

def get_breeding_event(db: Session, event_id: int):
    return db.query(models.BreedingEvent).filter(models.BreedingEvent.id == event_id).first()

def get_breeding_events_by_breeder(db: Session, breeder_id: int, skip: int = 0, limit: int = 100):
    return db.query(models.BreedingEvent).filter(models.BreedingEvent.breeder_id == breeder_id).offset(skip).limit(limit).all()

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
        breeder_id=breeder_id
    )
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    return db_event
