# tests/test_animal_edit_smoke.py: contains backend logic for the Animal Breed Registry System.
from datetime import date
from pathlib import Path
import sys
import types

# Test environment shim only. The application uses passlib in production via requirements.txt,
# but this execution sandbox may not have optional dependencies installed.
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

# Handles test update animal and weight measurement keeps latest weight logic for this module.
def test_update_animal_and_weight_measurement_keeps_latest_weight():
    db = make_session()
    breeder = models.Breeder(
        full_name='Test Breeder', national_id='123', animal_type='cattle', farm_name='Farm',
        farm_prefix='TST', farm_location='Nairobi', county='Nairobi', phone='0700000000',
        email='test@example.com', password_hash='hash', status='approved'
    )
    db.add(breeder)
    db.commit()
    db.refresh(breeder)

    animal = crud.create_animal(db, schemas.AnimalCreate(
        animal_type='cattle', breed='Friesian', gender='female', date_of_birth=date(2024, 1, 1), current_weight=200
    ), breeder.id)

    updated = crud.update_animal(db, animal, schemas.AnimalUpdate(current_weight=250, health_status='good'))
    assert updated.current_weight == 250
    assert updated.health_status == 'good'

    measurement = crud.create_animal_measurement(db, updated, schemas.AnimalMeasurementCreate(
        value=300, measured_at=date(2026, 5, 4), notes='monthly weighing'
    ))
    assert measurement.value == 300
    assert crud.get_animal(db, animal.id).current_weight == 300
    assert len(crud.get_animal_measurements(db, animal)) == 1
