# Backend/app/schemas.py: contains backend logic for the Animal Breed Registry System.
from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator
from typing import Optional, Literal, List
from datetime import datetime, date

# Defines the breeder base structure used by this module.
class BreederBase(BaseModel):
    full_name: str
    national_id: str
    animal_type: str
    farm_name: Optional[str] = None
    farm_prefix: Optional[str] = None
    farm_location: str
    county: Optional[str] = None
    phone: str
    email: EmailStr

# Defines the breeder create structure used by this module.
class BreederCreate(BreederBase):
    password: str = Field(..., min_length=8)
    documents: Optional[str] = None

# Defines the breeder response structure used by this module.
class BreederResponse(BaseModel):
    id: int
    full_name: str
    national_id: str
    animal_type: str
    farm_name: Optional[str] = None
    farm_prefix: Optional[str] = None
    farm_location: str
    county: Optional[str] = None
    phone: str
    email: str
    documents: Optional[str] = None
    status: str
    approved_by: Optional[int] = None
    approved_at: Optional[datetime] = None
    rejected_by: Optional[int] = None
    rejected_at: Optional[datetime] = None
    created_at: datetime
    model_config = {

    "from_attributes": True

}

# Defines the admin create structure used by this module.
class AdminCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str = Field(..., min_length=8)

# Defines the admin login structure used by this module.
class AdminLogin(BaseModel):
    email: str | None = None
    identifier: str | None = None
    password: str

# Defines the breeder login structure used by this module.
class BreederLogin(BaseModel):
    identifier: str
    password: str

# Defines the animal base structure used by this module.
class AnimalBase(BaseModel):
    animal_type: str
    breed: str
    gender: str
    date_of_birth: date
    birth_weight: Optional[float] = Field(default=None, ge=0)
    current_weight: Optional[float] = Field(default=None, ge=0)
    weaning_weight: Optional[float] = Field(default=None, ge=0)
    mature_weight: Optional[float] = Field(default=None, ge=0)
    body_condition_score: Optional[float] = Field(default=None, ge=1, le=5)
    average_daily_gain: Optional[float] = Field(default=None, ge=0)
    health_status: Optional[str] = None
    vaccination_status: Optional[str] = None
    disease_history: Optional[str] = None
    hereditary_conditions: Optional[str] = None
    vet_notes: Optional[str] = None
    fertility_status: Optional[str] = None
    age_at_first_service_months: Optional[float] = Field(default=None, ge=0)
    services_per_conception: Optional[float] = Field(default=None, ge=0)
    birth_interval_days: Optional[float] = Field(default=None, ge=0)
    offspring_count: Optional[int] = Field(default=None, ge=0)
    offspring_survival_rate: Optional[float] = Field(default=None, ge=0, le=100)
    offspring_quality_score: Optional[float] = Field(default=None, ge=0, le=100)
    production_type: Optional[str] = None
    daily_milk_yield: Optional[float] = Field(default=None, ge=0)
    milk_fat_percent: Optional[float] = Field(default=None, ge=0, le=100)
    egg_count_annual: Optional[int] = Field(default=None, ge=0)

    @field_validator("gender")

    @classmethod

    # Handles normalize gender logic for this module.
    def normalize_gender(cls, value: str) -> str:
        normalized = value.strip().lower()

        if normalized not in {"male", "female"}:
            raise ValueError("gender must be male or female")
        return normalized

    @field_validator("date_of_birth")

    @classmethod

    # Handles date of birth not future logic for this module.
    def date_of_birth_not_future(cls, value: date) -> date:
        if value > date.today():
            raise ValueError("date_of_birth cannot be in the future")
        return value

# Defines the animal create structure used by this module.
class AnimalCreate(AnimalBase):
    sire_id: Optional[str] = None
    dam_id: Optional[str] = None

# Defines the animal update structure used by this module.
class AnimalUpdate(BaseModel):
    animal_type: Optional[str] = None
    breed: Optional[str] = None
    gender: Optional[str] = None
    date_of_birth: Optional[date] = None
    sire_id: Optional[str] = None
    dam_id: Optional[str] = None
    birth_weight: Optional[float] = Field(default=None, ge=0)
    current_weight: Optional[float] = Field(default=None, ge=0)
    weaning_weight: Optional[float] = Field(default=None, ge=0)
    mature_weight: Optional[float] = Field(default=None, ge=0)
    body_condition_score: Optional[float] = Field(default=None, ge=1, le=5)
    average_daily_gain: Optional[float] = Field(default=None, ge=0)
    health_status: Optional[str] = None
    vaccination_status: Optional[str] = None
    disease_history: Optional[str] = None
    hereditary_conditions: Optional[str] = None
    vet_notes: Optional[str] = None
    fertility_status: Optional[str] = None
    age_at_first_service_months: Optional[float] = Field(default=None, ge=0)
    services_per_conception: Optional[float] = Field(default=None, ge=0)
    birth_interval_days: Optional[float] = Field(default=None, ge=0)
    offspring_count: Optional[int] = Field(default=None, ge=0)
    offspring_survival_rate: Optional[float] = Field(default=None, ge=0, le=100)
    offspring_quality_score: Optional[float] = Field(default=None, ge=0, le=100)
    production_type: Optional[str] = None
    daily_milk_yield: Optional[float] = Field(default=None, ge=0)
    milk_fat_percent: Optional[float] = Field(default=None, ge=0, le=100)
    egg_count_annual: Optional[int] = Field(default=None, ge=0)

    @field_validator("gender")

    @classmethod

    # Handles normalize optional gender logic for this module.
    def normalize_optional_gender(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value

        normalized = value.strip().lower()

        if normalized not in {"male", "female"}:
            raise ValueError("gender must be male or female")
        return normalized

    @field_validator("date_of_birth")

    @classmethod

    # Handles optional date of birth not future logic for this module.
    def optional_date_of_birth_not_future(cls, value: Optional[date]) -> Optional[date]:
        if value is not None and value > date.today():
            raise ValueError("date_of_birth cannot be in the future")
        return value

# Defines the animal measurement create structure used by this module.
class AnimalMeasurementCreate(BaseModel):
    measurement_type: Literal["weight"] = "weight"
    value: float = Field(..., gt=0)
    unit: Literal["kg"] = "kg"
    measured_at: date
    notes: Optional[str] = None

    @field_validator("measured_at")

    @classmethod

    # Handles measurement date not future logic for this module.
    def measurement_date_not_future(cls, value: date) -> date:
        if value > date.today():
            raise ValueError("measured_at cannot be in the future")
        return value

# Defines the animal measurement response structure used by this module.
class AnimalMeasurementResponse(AnimalMeasurementCreate):
    id: int
    animal_id: int
    breeder_id: int
    created_at: datetime
    model_config = {

    "from_attributes": True

    }

# Defines the animal response structure used by this module.
class AnimalResponse(AnimalBase):
    id: int
    animal_id: str
    breeder_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    sire_id: Optional[int] = None
    dam_id: Optional[int] = None
    model_config = {

    "from_attributes": True

    }

# Defines the breeding event base structure used by this module.
class BreedingEventBase(BaseModel):
    breeding_method: str
    dam_id: int
    sire_id: Optional[int] = None
    breeding_date: date
    expected_due_date: Optional[date] = None
    offspring_id: Optional[int] = None
    semen_source: Optional[str] = None
    ai_technician: Optional[str] = None
    batch_number: Optional[str] = None
    donor_dam: Optional[str] = None
    embryo_id: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[Literal["planned", "served", "confirmed_pregnant", "not_pregnant", "failed", "completed", "lost", "cancelled"]] = "served"
    pregnancy_confirmed: bool = False
    pregnancy_check_date: Optional[date] = None
    outcome: Optional[Literal["live_birth", "failed_conception", "miscarriage", "stillbirth", "abortion", "unknown"]] = None
    outcome_date: Optional[date] = None
    offspring_count: Optional[int] = Field(default=None, ge=0)
    live_offspring_count: Optional[int] = Field(default=None, ge=0)
    outcome_notes: Optional[str] = None

# Defines the breeding event create structure used by this module.
class BreedingEventCreate(BreedingEventBase):
    @model_validator(mode="after")

    # Validates breeding event dates and counts before the request continues.
    def validate_breeding_event_dates_and_counts(self):
        if self.breeding_date and self.breeding_date > date.today():
            raise ValueError("breeding_date cannot be in the future")

        if self.expected_due_date and self.breeding_date and self.expected_due_date <= self.breeding_date:
            raise ValueError("expected_due_date must be after breeding_date")

        if self.pregnancy_check_date and self.pregnancy_check_date > date.today():
            raise ValueError("pregnancy_check_date cannot be in the future")

        if self.outcome_date and self.outcome_date > date.today():
            raise ValueError("outcome_date cannot be in the future")

        if self.live_offspring_count is not None and self.offspring_count is not None and self.live_offspring_count > self.offspring_count:
            raise ValueError("live_offspring_count cannot exceed offspring_count")
        return self

# Defines the breeding event update structure used by this module.
class BreedingEventUpdate(BaseModel):
    status: Optional[Literal["planned", "served", "confirmed_pregnant", "not_pregnant", "failed", "completed", "lost", "cancelled"]] = None
    pregnancy_confirmed: Optional[bool] = None
    pregnancy_check_date: Optional[date] = None
    outcome: Optional[Literal["live_birth", "failed_conception", "miscarriage", "stillbirth", "abortion", "unknown"]] = None
    outcome_date: Optional[date] = None
    offspring_id: Optional[int] = None
    offspring_count: Optional[int] = Field(default=None, ge=0)
    live_offspring_count: Optional[int] = Field(default=None, ge=0)
    outcome_notes: Optional[str] = None
    notes: Optional[str] = None

    @model_validator(mode="after")

    # Validates breeding event update before the request continues.
    def validate_breeding_event_update(self):
        if self.pregnancy_check_date and self.pregnancy_check_date > date.today():
            raise ValueError("pregnancy_check_date cannot be in the future")

        if self.outcome_date and self.outcome_date > date.today():
            raise ValueError("outcome_date cannot be in the future")

        if self.live_offspring_count is not None and self.offspring_count is not None and self.live_offspring_count > self.offspring_count:
            raise ValueError("live_offspring_count cannot exceed offspring_count")
        return self

# Defines the breeding event response structure used by this module.
class BreedingEventResponse(BaseModel):
    id: int
    breeding_method: str
    dam_id: int
    sire_id: Optional[int] = None
    breeding_date: date
    expected_due_date: Optional[date] = None
    offspring_id: Optional[int] = None
    semen_source: Optional[str] = None
    ai_technician: Optional[str] = None
    batch_number: Optional[str] = None
    donor_dam: Optional[str] = None
    embryo_id: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None
    pregnancy_confirmed: Optional[bool] = False
    pregnancy_check_date: Optional[date] = None
    outcome: Optional[str] = None
    outcome_date: Optional[date] = None
    offspring_count: Optional[int] = None
    live_offspring_count: Optional[int] = None
    outcome_notes: Optional[str] = None
    breeder_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {
        "from_attributes": True
    }

# Defines the animal health record create structure used by this module.
class AnimalHealthRecordCreate(BaseModel):
    record_date: date
    health_status: Optional[str] = None
    vaccination_status: Optional[str] = None
    disease_history: Optional[str] = None
    hereditary_conditions: Optional[str] = None
    vet_notes: Optional[str] = None

# Defines the animal health record response structure used by this module.
class AnimalHealthRecordResponse(AnimalHealthRecordCreate):
    id: int
    animal_id: int
    breeder_id: int
    created_at: datetime
    model_config = {"from_attributes": True}

# Defines the animal fertility record create structure used by this module.
class AnimalFertilityRecordCreate(BaseModel):
    record_date: date
    fertility_status: Optional[str] = None
    age_at_first_service_months: Optional[float] = Field(default=None, ge=0)
    services_per_conception: Optional[float] = Field(default=None, ge=0)
    birth_interval_days: Optional[float] = Field(default=None, ge=0)
    notes: Optional[str] = None

# Defines the animal fertility record response structure used by this module.
class AnimalFertilityRecordResponse(AnimalFertilityRecordCreate):
    id: int
    animal_id: int
    breeder_id: int
    created_at: datetime
    model_config = {"from_attributes": True}

# Defines the animal production record create structure used by this module.
class AnimalProductionRecordCreate(BaseModel):
    record_date: date
    production_type: Optional[str] = None
    daily_milk_yield: Optional[float] = Field(default=None, ge=0)
    milk_fat_percent: Optional[float] = Field(default=None, ge=0, le=100)
    egg_count_annual: Optional[int] = Field(default=None, ge=0)
    average_daily_gain: Optional[float] = Field(default=None, ge=0)
    notes: Optional[str] = None

# Defines the animal production record response structure used by this module.
class AnimalProductionRecordResponse(AnimalProductionRecordCreate):
    id: int
    animal_id: int
    breeder_id: int
    created_at: datetime
    model_config = {"from_attributes": True}

# Defines the animal offspring record create structure used by this module.
class AnimalOffspringRecordCreate(BaseModel):
    record_date: date
    offspring_count: Optional[int] = Field(default=None, ge=0)
    offspring_survival_rate: Optional[float] = Field(default=None, ge=0, le=100)
    offspring_quality_score: Optional[float] = Field(default=None, ge=0, le=100)
    notes: Optional[str] = None

# Defines the animal offspring record response structure used by this module.
class AnimalOffspringRecordResponse(AnimalOffspringRecordCreate):
    id: int
    animal_id: int
    breeder_id: int
    created_at: datetime
    model_config = {"from_attributes": True}

# Defines the animal note create structure used by this module.
class AnimalNoteCreate(BaseModel):
    note_type: Optional[str] = "general"
    note: str

# Defines the animal note response structure used by this module.
class AnimalNoteResponse(AnimalNoteCreate):
    id: int
    animal_id: int
    breeder_id: int
    created_at: datetime
    model_config = {"from_attributes": True}

# Defines the animal full profile response structure used by this module.
class AnimalFullProfileResponse(BaseModel):
    animal: AnimalResponse
    measurements: List[AnimalMeasurementResponse] = []
    health_records: List[AnimalHealthRecordResponse] = []
    fertility_records: List[AnimalFertilityRecordResponse] = []
    production_records: List[AnimalProductionRecordResponse] = []
    offspring_records: List[AnimalOffspringRecordResponse] = []
    notes: List[AnimalNoteResponse] = []

# Defines the breed summary response structure used by this module.
class BreedSummaryResponse(BaseModel):
    farm_name: Optional[str] = None
    farm_prefix: Optional[str] = None
    farm_location: str
    county: Optional[str] = None
    phone: str
    email: str
    breeder_name: str
    breed: str
    total_animals: int
    model_config = {
    "from_attributes": True
    }

# Defines the breeder profile update structure used by this module.
class BreederProfileUpdate(BaseModel):
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    farm_name: Optional[str] = None
    farm_location: Optional[str] = None
    county: Optional[str] = None

# Defines the change password request structure used by this module.
class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)

# Defines the forgot password request structure used by this module.
class ForgotPasswordRequest(BaseModel):
    identifier: str

# Defines the reset password request structure used by this module.
class ResetPasswordRequest(BaseModel):
    token: str
    password: str = Field(..., min_length=8)
