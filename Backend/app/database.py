# Backend/app/database.py: contains backend logic for the Animal Breed Registry System.
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./lineagex.db")

engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Retrieves db records from the database.
def get_db():
    db = SessionLocal()

    try:
        yield db

    finally:
        db.close()
