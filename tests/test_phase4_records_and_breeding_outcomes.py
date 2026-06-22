# tests/test_phase4_records_and_breeding_outcomes.py: contains backend logic for the Animal Breed Registry System.
from datetime import date
from pathlib import Path
import sys
import types

passlib_module = types.ModuleType('passlib')
passlib_context_module = types.ModuleType('passlib.context')
# Defines the crypt context structure used by this module.
class CryptContext:
    # Internal helper for init.
    def __init__(self, *args, **kwargs): pass
    # Handles hash logic for this module.
    def hash(self, value): return value
    # Handles verify logic for this module.
    def verify(self, plain, hashed): return plain == hashed
passlib_context_module.CryptContext = CryptContext
sys.modules.setdefault('passlib', passlib_module)
sys.modules.setdefault('passlib.context', passlib_context_module)

jose_module = types.ModuleType('jose')
# Defines the jwterror structure used by this module.
class JWTError(Exception): pass
# Defines the dummy jwt structure used by this module.
class DummyJWT:
    # Handles encode logic for this module.
    def encode(self, *args, **kwargs): return 'token'
    # Handles decode logic for this module.
    def decode(self, *args, **kwargs): return {}
jose_module.JWTError = JWTError
jose_module.jwt = DummyJWT()
sys.modules.setdefault('jose', jose_module)

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from Backend.app.database import Base
from Backend.app import models, schemas, crud

# Handles make session logic for this module.
def make_session():
    engine = create_engine('sqlite:///:memory:', connect_args={'check_same_thread': False})
    Base.metadata.create_all(bind=engine)
    return sessionmaker(bind=engine)()

# Creates and stores a new breeder record.
def create_breeder(db):
    breeder = models.Breeder(
        full_name='Phase Four Breeder', national_id='999', animal_type='cattle', farm_name='Farm',
        farm_prefix='P4', farm_location='Nairobi', county='Nairobi', phone='0700000000',
        email='phase4@example.com', password_hash='hash', status='approved'
    )
    db.add(breeder); db.commit(); db.refresh(breeder); return breeder

# Handles test normalized health record updates latest animal cache and profile logic for this module.
def test_normalized_health_record_updates_latest_animal_cache_and_profile():
    db = make_session(); breeder = create_breeder(db)
    animal = crud.create_animal(db, schemas.AnimalCreate(
        animal_type='cattle', breed='Friesian', gender='female', date_of_birth=date(2024, 1, 1)
    ), breeder.id)

    rec = crud.create_health_record(db, animal, schemas.AnimalHealthRecordCreate(
        record_date=date(2026, 5, 4), health_status='good', vaccination_status='complete', vet_notes='annual check'
    ))

    assert rec.health_status == 'good'
    refreshed = crud.get_animal(db, animal.id)
    assert refreshed.health_status == 'good'
    assert refreshed.vaccination_status == 'complete'

    profile = crud.get_animal_full_profile(db, refreshed)
    assert len(profile['health_records']) == 1
    assert profile['animal'].animal_id == animal.animal_id

# Handles test breeding event no longer assumes success until outcome recorded logic for this module.
def test_breeding_event_no_longer_assumes_success_until_outcome_recorded():
    db = make_session(); breeder = create_breeder(db)
    dam = crud.create_animal(db, schemas.AnimalCreate(
        animal_type='cattle', breed='Friesian', gender='female', date_of_birth=date(2023, 1, 1)
    ), breeder.id)
    sire = crud.create_animal(db, schemas.AnimalCreate(
        animal_type='cattle', breed='Friesian', gender='male', date_of_birth=date(2022, 1, 1)
    ), breeder.id)

    event = crud.create_breeding_event(db, schemas.BreedingEventCreate(
        breeding_method='ai', dam_id=dam.id, sire_id=sire.id, breeding_date=date(2026, 5, 4)
    ), breeder.id)
    assert event.status == 'served'
    assert event.outcome is None
    assert event.pregnancy_confirmed is False

    failed = crud.update_breeding_event(db, event, schemas.BreedingEventUpdate(outcome='failed_conception'))
    assert failed.status == 'failed'
    assert failed.outcome == 'failed_conception'
    assert failed.pregnancy_confirmed is False
