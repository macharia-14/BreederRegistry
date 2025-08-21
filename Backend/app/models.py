# backend/app/models.py
from sqlalchemy import Column, Integer, String, TIMESTAMP, ForeignKey, text
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
    breeder_type = Column(String(50), server_default="individual")  # individual | company
    farm_name = Column(String(255))
    farm_prefix = Column(String(100), nullable=False, unique=True)
    farm_location = Column(String(255), nullable=False)
    county = Column(String(100))
    phone = Column(String(50), nullable=False)
    email = Column(String(255), nullable=False, unique=True, index=True)
    password_hash = Column(String(255), nullable=False)
    status = Column(String(50), server_default="pending")  # pending | approved | rejected
    approved_by = Column(Integer, ForeignKey("admins.id"), nullable=True)
    approved_at = Column(TIMESTAMP)
    created_at = Column(TIMESTAMP, server_default=text("CURRENT_TIMESTAMP"))
    role = Column(String(50), server_default="breeder")

    approved_by_admin = relationship("Admin", backref="approved_breeders")
