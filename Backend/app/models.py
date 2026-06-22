# Backend/app/models.py: contains backend logic for the Animal Breed Registry System.
from sqlalchemy import Column, Integer, String, TIMESTAMP, ForeignKey, text, Date, Text, Float, Boolean
from sqlalchemy.orm import relationship, Session
from .database import Base

# Defines the admin structure used by this module.
class Admin(Base):
    __tablename__ = "admins"
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False, unique=True, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), server_default="admin")
    created_at = Column(TIMESTAMP, server_default=text("CURRENT_TIMESTAMP"))

# Defines the breeder structure used by this module.
class Breeder(Base):
    __tablename__ = "breeders"
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(255), nullable=False)
    national_id = Column(String(100), nullable=False, unique=True, index=True)
    animal_type = Column(String(50), nullable=False)
    farm_name = Column(String(255), nullable=True)
    farm_prefix = Column(String(100), nullable=True)
    farm_location = Column(String(255), nullable=False)
    county = Column(String(100), nullable=True)
    phone = Column(String(50), nullable=False)
    email = Column(String(255), nullable=False, unique=True, index=True)
    password_hash = Column(String(255), nullable=False)
    status = Column(String(50), server_default="pending")
    approved_by = Column(Integer, ForeignKey("admins.id"), nullable=True)
    approved_at = Column(TIMESTAMP, nullable=True)
    rejected_by = Column(Integer, ForeignKey("admins.id"), nullable=True)
    rejected_at = Column(TIMESTAMP, nullable=True)
    created_at = Column(TIMESTAMP, server_default=text("CURRENT_TIMESTAMP"))
    role = Column(String(50), server_default="breeder")
    documents = Column(String(500), nullable=True)
    approved_by_admin = relationship("Admin", foreign_keys=[approved_by], backref="approved_breeders")
    rejected_by_admin = relationship("Admin", foreign_keys=[rejected_by], backref="rejected_breeders")
    animals = relationship("Animal", back_populates="breeder")
    breeding_events = relationship("BreedingEvent", back_populates="breeder")

# Defines the animal structure used by this module.
class Animal(Base):
    __tablename__ = "animals"
    id = Column(Integer, primary_key=True, index=True)
    animal_id = Column(String(50), unique=True, index=True, nullable=False)
    animal_type = Column(String(50), nullable=False)
    breed = Column(String(100), nullable=False)
    gender = Column(String(10), nullable=False)
    date_of_birth = Column(Date, nullable=False)
    sire_id = Column(Integer, ForeignKey("animals.id"), nullable=True)
    dam_id = Column(Integer, ForeignKey("animals.id"), nullable=True)
    breeder_id = Column(Integer, ForeignKey("breeders.id"), nullable=False)
    updated_at = Column(TIMESTAMP, nullable=True)

    # Internal helper for latest measurement value.
    def _latest_measurement_value(self, *measurement_types):
        records = [r for r in self.measurements if r.measurement_type in measurement_types and r.value is not None]
        if not records:
            return None
        latest = max(records, key=lambda r: (r.measured_at, r.id or 0))
        return latest.value

    # Internal helper for latest record.
    def _latest_record(self, records, date_attr="record_date"):
        records = list(records or [])
        if not records:
            return None
        return max(records, key=lambda r: (getattr(r, date_attr), r.id or 0))

    @property
    # Handles birth weight logic for this module.
    def birth_weight(self):
        return self._latest_measurement_value("birth_weight")

    @property
    # Handles current weight logic for this module.
    def current_weight(self):
        return self._latest_measurement_value("current_weight", "weight")

    @property
    # Handles weaning weight logic for this module.
    def weaning_weight(self):
        return self._latest_measurement_value("weaning_weight")

    @property
    # Handles mature weight logic for this module.
    def mature_weight(self):
        return self._latest_measurement_value("mature_weight")

    @property
    # Handles body condition score logic for this module.
    def body_condition_score(self):
        return self._latest_measurement_value("body_condition_score")

    @property
    # Handles health status logic for this module.
    def health_status(self):
        rec = self._latest_record(self.health_records)
        return rec.health_status if rec else None

    @property
    # Handles vaccination status logic for this module.
    def vaccination_status(self):
        rec = self._latest_record(self.health_records)
        return rec.vaccination_status if rec else None

    @property
    # Handles disease history logic for this module.
    def disease_history(self):
        rec = self._latest_record(self.health_records)
        return rec.disease_history if rec else None

    @property
    # Handles hereditary conditions logic for this module.
    def hereditary_conditions(self):
        rec = self._latest_record(self.health_records)
        return rec.hereditary_conditions if rec else None

    @property
    # Handles vet notes logic for this module.
    def vet_notes(self):
        rec = self._latest_record(self.health_records)
        return rec.vet_notes if rec else None

    @property
    # Handles fertility status logic for this module.
    def fertility_status(self):
        rec = self._latest_record(self.fertility_records)
        return rec.fertility_status if rec else None

    @property
    # Handles age at first service months logic for this module.
    def age_at_first_service_months(self):
        rec = self._latest_record(self.fertility_records)
        return rec.age_at_first_service_months if rec else None

    @property
    # Handles services per conception logic for this module.
    def services_per_conception(self):
        rec = self._latest_record(self.fertility_records)
        return rec.services_per_conception if rec else None

    @property
    # Handles birth interval days logic for this module.
    def birth_interval_days(self):
        rec = self._latest_record(self.fertility_records)
        return rec.birth_interval_days if rec else None

    @property
    # Handles offspring count logic for this module.
    def offspring_count(self):
        rec = self._latest_record(self.offspring_records)
        return rec.offspring_count if rec else None

    @property
    # Handles offspring survival rate logic for this module.
    def offspring_survival_rate(self):
        rec = self._latest_record(self.offspring_records)
        return rec.offspring_survival_rate if rec else None

    @property
    # Handles offspring quality score logic for this module.
    def offspring_quality_score(self):
        rec = self._latest_record(self.offspring_records)
        return rec.offspring_quality_score if rec else None

    @property
    # Handles production type logic for this module.
    def production_type(self):
        rec = self._latest_record(self.production_records)
        return rec.production_type if rec else None

    @property
    # Handles daily milk yield logic for this module.
    def daily_milk_yield(self):
        rec = self._latest_record(self.production_records)
        return rec.daily_milk_yield if rec else None

    @property
    # Handles milk fat percent logic for this module.
    def milk_fat_percent(self):
        rec = self._latest_record(self.production_records)
        return rec.milk_fat_percent if rec else None

    @property
    # Handles egg count annual logic for this module.
    def egg_count_annual(self):
        rec = self._latest_record(self.production_records)
        return rec.egg_count_annual if rec else None

    @property
    # Handles average daily gain logic for this module.
    def average_daily_gain(self):
        rec = self._latest_record(self.production_records)
        if rec and rec.average_daily_gain is not None:
            return rec.average_daily_gain
        return self._latest_measurement_value("average_daily_gain")

    created_at = Column(TIMESTAMP, server_default=text("CURRENT_TIMESTAMP"))
    sire = relationship("Animal", foreign_keys=[sire_id], remote_side=[id])
    dam = relationship("Animal", foreign_keys=[dam_id], remote_side=[id])
    breeder = relationship("Breeder", back_populates="animals")
    measurements = relationship("AnimalMeasurement", back_populates="animal", cascade="all, delete-orphan")
    health_records = relationship("AnimalHealthRecord", back_populates="animal", cascade="all, delete-orphan")
    fertility_records = relationship("AnimalFertilityRecord", back_populates="animal", cascade="all, delete-orphan")
    production_records = relationship("AnimalProductionRecord", back_populates="animal", cascade="all, delete-orphan")
    offspring_records = relationship("AnimalOffspringRecord", back_populates="animal", cascade="all, delete-orphan")
    notes = relationship("AnimalNote", back_populates="animal", cascade="all, delete-orphan")

# Defines the animal measurement structure used by this module.
class AnimalMeasurement(Base):
    """
    Time-series animal measurements.
    Use this table for values that naturally change over time, especially weight.
    The animals.current_weight field stores only the latest value for quick listing/scoring.
    """

    __tablename__ = "animal_measurements"
    id = Column(Integer, primary_key=True, index=True)
    animal_id = Column(Integer, ForeignKey("animals.id"), nullable=False, index=True)
    breeder_id = Column(Integer, ForeignKey("breeders.id"), nullable=False, index=True)
    measurement_type = Column(String(50), nullable=False, server_default="weight")
    value = Column(Float, nullable=False)
    unit = Column(String(20), nullable=False, server_default="kg")
    measured_at = Column(Date, nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP, server_default=text("CURRENT_TIMESTAMP"))
    animal = relationship("Animal", back_populates="measurements")
    breeder = relationship("Breeder")

# Defines the animal health record structure used by this module.
class AnimalHealthRecord(Base):
    __tablename__ = "animal_health_records"
    id = Column(Integer, primary_key=True, index=True)
    animal_id = Column(Integer, ForeignKey("animals.id"), nullable=False, index=True)
    breeder_id = Column(Integer, ForeignKey("breeders.id"), nullable=False, index=True)
    record_date = Column(Date, nullable=False)
    health_status = Column(String(50), nullable=True)
    vaccination_status = Column(String(50), nullable=True)
    disease_history = Column(Text, nullable=True)
    hereditary_conditions = Column(Text, nullable=True)
    vet_notes = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP, server_default=text("CURRENT_TIMESTAMP"))
    animal = relationship("Animal", back_populates="health_records")
    breeder = relationship("Breeder")

# Defines the animal fertility record structure used by this module.
class AnimalFertilityRecord(Base):
    __tablename__ = "animal_fertility_records"
    id = Column(Integer, primary_key=True, index=True)
    animal_id = Column(Integer, ForeignKey("animals.id"), nullable=False, index=True)
    breeder_id = Column(Integer, ForeignKey("breeders.id"), nullable=False, index=True)
    record_date = Column(Date, nullable=False)
    fertility_status = Column(String(50), nullable=True)
    age_at_first_service_months = Column(Float, nullable=True)
    services_per_conception = Column(Float, nullable=True)
    birth_interval_days = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP, server_default=text("CURRENT_TIMESTAMP"))
    animal = relationship("Animal", back_populates="fertility_records")
    breeder = relationship("Breeder")

# Defines the animal production record structure used by this module.
class AnimalProductionRecord(Base):
    __tablename__ = "animal_production_records"
    id = Column(Integer, primary_key=True, index=True)
    animal_id = Column(Integer, ForeignKey("animals.id"), nullable=False, index=True)
    breeder_id = Column(Integer, ForeignKey("breeders.id"), nullable=False, index=True)
    record_date = Column(Date, nullable=False)
    production_type = Column(String(50), nullable=True)
    daily_milk_yield = Column(Float, nullable=True)
    milk_fat_percent = Column(Float, nullable=True)
    egg_count_annual = Column(Integer, nullable=True)
    average_daily_gain = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP, server_default=text("CURRENT_TIMESTAMP"))
    animal = relationship("Animal", back_populates="production_records")
    breeder = relationship("Breeder")

# Defines the animal offspring record structure used by this module.
class AnimalOffspringRecord(Base):
    __tablename__ = "animal_offspring_records"
    id = Column(Integer, primary_key=True, index=True)
    animal_id = Column(Integer, ForeignKey("animals.id"), nullable=False, index=True)
    breeder_id = Column(Integer, ForeignKey("breeders.id"), nullable=False, index=True)
    record_date = Column(Date, nullable=False)
    offspring_count = Column(Integer, nullable=True)
    offspring_survival_rate = Column(Float, nullable=True)
    offspring_quality_score = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP, server_default=text("CURRENT_TIMESTAMP"))
    animal = relationship("Animal", back_populates="offspring_records")
    breeder = relationship("Breeder")

# Defines the animal note structure used by this module.
class AnimalNote(Base):
    __tablename__ = "animal_notes"
    id = Column(Integer, primary_key=True, index=True)
    animal_id = Column(Integer, ForeignKey("animals.id"), nullable=False, index=True)
    breeder_id = Column(Integer, ForeignKey("breeders.id"), nullable=False, index=True)
    note_type = Column(String(50), nullable=False, server_default="general")
    note = Column(Text, nullable=False)
    created_at = Column(TIMESTAMP, server_default=text("CURRENT_TIMESTAMP"))
    animal = relationship("Animal", back_populates="notes")
    breeder = relationship("Breeder")

# Defines the breeding event structure used by this module.
class BreedingEvent(Base):
    __tablename__ = "breeding_events"
    id = Column(Integer, primary_key=True, index=True)
    breeding_method = Column(String(50), nullable=False)
    dam_id = Column(Integer, ForeignKey("animals.id"), nullable=False)
    sire_id = Column(Integer, ForeignKey("animals.id"), nullable=True)
    breeding_date = Column(Date, nullable=False)
    expected_due_date = Column(Date, nullable=True)
    offspring_id = Column(Integer, ForeignKey("animals.id"), nullable=True)
    status = Column(String(50), nullable=False, server_default="served")
    pregnancy_confirmed = Column(Boolean, nullable=False, server_default="false")
    pregnancy_check_date = Column(Date, nullable=True)
    outcome = Column(String(50), nullable=True)
    outcome_date = Column(Date, nullable=True)
    offspring_count = Column(Integer, nullable=True)
    live_offspring_count = Column(Integer, nullable=True)
    outcome_notes = Column(Text, nullable=True)
    semen_source = Column(String(255), nullable=True)
    ai_technician = Column(String(255), nullable=True)
    batch_number = Column(String(100), nullable=True)
    donor_dam = Column(String(255), nullable=True)
    embryo_id = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    breeder_id = Column(Integer, ForeignKey("breeders.id"), nullable=False)
    created_at = Column(TIMESTAMP, server_default=text("CURRENT_TIMESTAMP"))
    updated_at = Column(TIMESTAMP, nullable=True)
    dam = relationship("Animal", foreign_keys=[dam_id])
    sire = relationship("Animal", foreign_keys=[sire_id])
    offspring = relationship("Animal", foreign_keys=[offspring_id])
    breeder = relationship("Breeder", back_populates="breeding_events")

# Defines the password reset token structure used by this module.
class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"
    id = Column(Integer, primary_key=True, index=True)
    breeder_id = Column(Integer, ForeignKey("breeders.id"), nullable=False, index=True)
    token_hash = Column(String(255), nullable=False, unique=True, index=True)
    expires_at = Column(TIMESTAMP, nullable=False)
    used_at = Column(TIMESTAMP, nullable=True)
    created_at = Column(TIMESTAMP, server_default=text("CURRENT_TIMESTAMP"))
    breeder = relationship("Breeder")

# Defines the audit log structure used by this module.
class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    actor_type = Column(String(20),  nullable=False)
    actor_id = Column(Integer,     nullable=False)
    actor_name = Column(String(255), nullable=True)
    action = Column(String(100), nullable=False)
    target_type = Column(String(50),  nullable=True)
    target_id = Column(Integer,     nullable=True)
    detail = Column(Text,        nullable=True)
    created_at = Column(TIMESTAMP,   server_default=text("CURRENT_TIMESTAMP"))

# Handles log action logic for this module.
def log_action(
    db: Session,
    *,
    actor_type: str,
    actor_id: int,
    actor_name: str,
    action: str,
    target_type: str | None = None,
    target_id: int | None = None,
    detail: str | None = None,

) -> None:
    """
    Write a single row to audit_logs.  Never raises — a logging failure
    must not roll back the business transaction that triggered it.
    """

    try:
        entry = AuditLog(
            actor_type=actor_type,
            actor_id=actor_id,
            actor_name=actor_name,
            action=action,
            target_type=target_type,
            target_id=target_id,
            detail=detail,
        )

        db.add(entry)

        db.flush()

    except Exception:
        import logging

        logging.getLogger(__name__).exception("audit_log write failed — suppressed")
