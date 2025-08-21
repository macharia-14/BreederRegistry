# backend/app/schemas.py
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

class BreederBase(BaseModel):
    full_name: str
    national_id: str
    breeder_type: Optional[str] = "individual"
    farm_name: Optional[str] = None
    farm_prefix: Optional[str] = None
    farm_location: str
    county: Optional[str] = None
    phone: str
    email: EmailStr

class BreederCreate(BreederBase):
    password: str = Field(..., min_length=8)

class BreederResponse(BaseModel):
    id: int
    full_name: str
    national_id: str
    farm_prefix: str
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

class BreederLogin(BaseModel):
    identifier: str
    password: str
