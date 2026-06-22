# Backend/app/audit_log_model_addition.py: contains backend logic for the Animal Breed Registry System.
from sqlalchemy import Column, Integer, String, Text, TIMESTAMP, text
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    actor_type = Column(String(20), nullable=False)
    actor_id = Column(Integer, nullable=False)
    actor_name = Column(String(255), nullable=True)
    action = Column(String(100), nullable=False)
    target_type= Column(String(50), nullable=True)
    target_id = Column(Integer, nullable=True)
    detail = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP, server_default=text("CURRENT_TIMESTAMP"))
