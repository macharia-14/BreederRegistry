# Backend/app/utils.py: contains backend logic for the Animal Breed Registry System.
import re
import random
import string
from passlib.context import CryptContext
from sqlalchemy.orm import Session

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Retrieves password hash records from the database.
def get_password_hash(password: str) -> str:
    return pwd_ctx.hash(password)

# Handles verify password logic for this module.
def verify_password(plain: str, hashed: str) -> bool:
    return pwd_ctx.verify(plain, hashed)

# Handles slugify logic for this module.
def slugify(value: str, maxlen: int = 20) -> str:
    s = value.lower()

    s = re.sub(r'[^a-z0-9]+', '-', s).strip('-')
    return s[:maxlen]

# Generates unique prefix used by the application.
def generate_unique_prefix(db: Session, full_name: str, max_attempts: int = 100) -> str:
    """
    Generate a unique farm prefix based on the breeder's name.
    Format: First letter of first name + First 2 letters of last name
    Example: John Smith -> JSM

    Args:
        db: Database session
        full_name: Breeder's full name
        max_attempts: Maximum attempts to find unique prefix

    Returns:
        str: Unique farm prefix (3 characters: ABC)
    """

    from .models import Breeder

    # Creates and stores a new base prefix record.
    def create_base_prefix(name: str) -> str:
        clean_name = re.sub(r'[^a-zA-Z\s]', '', name).strip()
        words = clean_name.split()

        if len(words) >= 2:
            first_part = words[0][:1].upper()
            last_part = words[-1][:2].upper()
            base = first_part + last_part

        elif len(words) == 1:
            base = words[0][:3].upper()

        else:
            base = "FAR"

        while len(base) < 3:
            base += "X"
        return base[:3]

    base_prefix = create_base_prefix(full_name)

    for attempt in range(max_attempts):
        candidate_prefix = base_prefix
        existing = db.query(Breeder).filter(

            Breeder.farm_prefix == candidate_prefix

        ).first()

        if not existing:
            return candidate_prefix

        for i in range(1, 10):
            candidate_prefix = f"{base_prefix}{i}"
            existing = db.query(Breeder).filter(

                Breeder.farm_prefix == candidate_prefix

            ).first()

            if not existing:
                return candidate_prefix

    import time

    timestamp_suffix = str(int(time.time()))[-1:]
    fallback_prefix = f"{base_prefix[:2]}{timestamp_suffix}"
    return fallback_prefix

# Generates animal id used by the application.
def generate_animal_id(db: Session, farm_prefix: str) -> str:
    from .models import Animal

    latest_animal = db.query(Animal).filter(Animal.animal_id.like(f"{farm_prefix}-%")).order_by(Animal.id.desc()).first()

    if latest_animal:
        try:
            last_number = int(latest_animal.animal_id.split('-')[-1])
            next_number = last_number + 1

        except (ValueError, IndexError):
            next_number = 1

    else:
        next_number = 1
    return f"{farm_prefix}-{next_number:03d}"
