# backend/app/schemas.py
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime, date

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

class BreederCreate(BreederBase):
    password: str = Field(..., min_length=8)
    documents: Optional[str] = None  # New field for storing document paths

class BreederResponse(BaseModel):
    id: int
    full_name: str
    national_id: str
    animal_type: str
    farm_prefix: Optional[str] = None
    status: str
    approved_by: Optional[int] = None
    approved_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        orm_mode = True

class AdminCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str = Field(..., min_length=8)

class AdminLogin(BaseModel):
    email: EmailStr
    password: str

class BreederLogin(BaseModel):
    identifier: str
    password: str

# Animal Schemas
class AnimalBase(BaseModel):
    animal_type: str
    breed: str
    gender: str
    date_of_birth: date
    sire_id: Optional[int] = None
    dam_id: Optional[int] = None

class AnimalCreate(AnimalBase):
    pass

class AnimalResponse(AnimalBase):
    id: int
    animal_id: str
    breeder_id: int
    created_at: datetime
    

    class Config:
        orm_mode = True

# Breeding Event Schemas
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

class BreedingEventCreate(BreedingEventBase):
    pass

class BreedingEventResponse(BreedingEventBase):
    id: int
    breeder_id: int
    created_at: datetime
   

    class Config:
        orm_mode = True

# Breed Summary Schema for public_breed_summary view
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

    class Config:
        orm_mode = True
