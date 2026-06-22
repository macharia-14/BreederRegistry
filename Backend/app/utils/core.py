# Backend/app/utils/core.py: contains backend logic for the Animal Breed Registry System.
import re
import os
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
from jose import JWTError, jwt
from sqlalchemy.orm import Session
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "change-me-in-production")

JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "60"))

# Retrieves password hash records from the database.
def get_password_hash(password: str) -> str:
    return pwd_ctx.hash(password)

# Handles verify password logic for this module.
def verify_password(plain: str, hashed: str) -> bool:
    return pwd_ctx.verify(plain, hashed)

# Creates and stores a new access token record.
def create_access_token(data: dict) -> str:
    """Create a signed JWT token that expires after JWT_EXPIRE_MINUTES."""

    payload = data.copy()

    expire = datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRE_MINUTES)

    payload.update({"exp": expire})
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

# Handles decode access token logic for this module.
def decode_access_token(token: str) -> dict:
    """Decode and verify a JWT token. Raises JWTError on failure."""
    return jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])

# Generates unique prefix used by the application.
def generate_unique_prefix(db: Session, full_name: str, max_attempts: int = 100) -> str:
    """
    Generate a unique farm prefix based on the breeder's name.
    Format: First letter of first name + first 2 letters of last name (e.g. John Smith -> JSM).
    Appends a digit suffix (1-9) if the base prefix is already taken.
    """

    from ..models import Breeder

    # Creates and stores a new base prefix record.
    def create_base_prefix(name: str) -> str:
        clean_name = re.sub(r"[^a-zA-Z\s]", "", name).strip()

        words = clean_name.split()

        if len(words) >= 2:
            base = words[0][:1].upper() + words[-1][:2].upper()

        elif len(words) == 1:
            base = words[0][:3].upper()

        else:
            base = "FAR"

        while len(base) < 3:
            base += "X"
        return base[:3]

    base_prefix = create_base_prefix(full_name)

    for _ in range(max_attempts):
        for candidate in [base_prefix] + [f"{base_prefix}{i}" for i in range(1, 10)]:
            exists = db.query(Breeder).filter(Breeder.farm_prefix == candidate).first()

            if not exists:
                return candidate

    import time
    return f"{base_prefix[:2]}{str(int(time.time()))[-1:]}"

# Generates animal id used by the application.
def generate_animal_id(db: Session, farm_prefix: str) -> str:
    """Generate the next sequential animal ID for a given farm prefix (e.g. JSM-001)."""

    from ..models import Animal

    latest = (

        db.query(Animal)

        .filter(Animal.animal_id.like(f"{farm_prefix}-%"))

        .order_by(Animal.id.desc())

        .first()

    )

    if latest:
        try:
            last_number = int(latest.animal_id.split("-")[-1])

            next_number = last_number + 1

        except (ValueError, IndexError):
            next_number = 1

    else:
        next_number = 1
    return f"{farm_prefix}-{next_number:03d}"
