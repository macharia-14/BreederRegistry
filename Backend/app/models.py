# backend/app/models.py
from sqlalchemy import Column, Integer, String, TIMESTAMP, ForeignKey, text, Date, Text
from sqlalchemy.orm import relationship
from .database import Base

class Admin(Base):
    __tablename__ = "admins"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False, unique=True, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), server_default="admin")
    created_at = Column(TIMESTAMP, server_default=text("CURRENT_TIMESTAMP"))



class Breeder(Base):
    __tablename__ = "breeders"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(255), nullable=False)
    national_id = Column(String(100), nullable=False, unique=True, index=True)
    animal_type = Column(String(50), nullable=False)  # cattle, sheep, goat, dog, pig, poultry, other
    farm_name = Column(String(255), nullable=True)
    farm_prefix = Column(String(100), nullable=True)
    farm_location = Column(String(255), nullable=False)
    county = Column(String(100), nullable=True)
    phone = Column(String(50), nullable=False)
    email = Column(String(255), nullable=False, unique=True, index=True)
    password_hash = Column(String(255), nullable=False)
    status = Column(String(50), server_default="pending")  # pending | approved | rejected
    approved_by = Column(Integer, ForeignKey("admins.id"), nullable=True)
    approved_at = Column(TIMESTAMP)
    created_at = Column(TIMESTAMP, server_default=text("CURRENT_TIMESTAMP"))
    role = Column(String(50), server_default="breeder")
    documents = Column(String(500), nullable=True)  # New field for storing document paths

    approved_by_admin = relationship("Admin", backref="approved_breeders")
    animals = relationship("Animal", back_populates="breeder")
    breeding_events = relationship("BreedingEvent", back_populates="breeder")
    
class Animal(Base):
    __tablename__ = "animals"

    id = Column(Integer, primary_key=True, index=True)
    animal_id = Column(String(50), unique=True, index=True, nullable=False)  # e.g., ABC-001
    animal_type = Column(String(50), nullable=False)  # cattle, sheep, goat, etc.
    breed = Column(String(100), nullable=False)
    gender = Column(String(10), nullable=False)  # male, female
    date_of_birth = Column(Date, nullable=False)
    sire_id = Column(Integer, ForeignKey("animals.id"), nullable=True)
    dam_id = Column(Integer, ForeignKey("animals.id"), nullable=True)
    breeder_id = Column(Integer, ForeignKey("breeders.id"), nullable=False)
    
    created_at = Column(TIMESTAMP, server_default=text("CURRENT_TIMESTAMP"))
   

    # Relationships
    sire = relationship("Animal", foreign_keys=[sire_id], remote_side=[id])
    dam = relationship("Animal", foreign_keys=[dam_id], remote_side=[id])
    breeder = relationship("Breeder", back_populates="animals")
    

class BreedingEvent(Base):
    __tablename__ = "breeding_events"

    id = Column(Integer, primary_key=True, index=True)
    breeding_method = Column(String(50), nullable=False)  # natural, ai, et, ivf
    dam_id = Column(Integer, ForeignKey("animals.id"), nullable=False)
    sire_id = Column(Integer, ForeignKey("animals.id"), nullable=True)
    breeding_date = Column(Date, nullable=False)
    expected_due_date = Column(Date, nullable=True)
    offspring_id = Column(Integer, ForeignKey("animals.id"), nullable=True)
    semen_source = Column(String(255), nullable=True)
    ai_technician = Column(String(255), nullable=True)
    batch_number = Column(String(100), nullable=True)
    donor_dam = Column(String(255), nullable=True)
    embryo_id = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    breeder_id = Column(Integer, ForeignKey("breeders.id"), nullable=False)
    created_at = Column(TIMESTAMP, server_default=text("CURRENT_TIMESTAMP"))
    
    # Relationships
    dam = relationship("Animal", foreign_keys=[dam_id])
    sire = relationship("Animal", foreign_keys=[sire_id])
    offspring = relationship("Animal", foreign_keys=[offspring_id])
    breeder = relationship("Breeder", back_populates="breeding_events")
