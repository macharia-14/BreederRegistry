# backend/app/utils.py
import re
import random
from passlib.context import CryptContext
from sqlalchemy.orm import Session

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    return pwd_ctx.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_ctx.verify(plain, hashed)

def slugify(value: str, maxlen: int = 20) -> str:
    s = value.lower()
    s = re.sub(r'[^a-z0-9]+', '-', s).strip('-')
    return s[:maxlen]

def generate_unique_prefix(db: Session, full_name: str) -> str:
    # Import here to avoid circular imports
    from .models import Breeder
    base = slugify(full_name or "breeder")
    for _ in range(2000):
        candidate = f"{base}-{random.randint(1000,9999)}"
        exists = db.query(Breeder).filter(Breeder.farm_prefix == candidate).first()
        if not exists:
            return candidate
    raise RuntimeError("Unable to generate unique farm prefix; try a different full_name or supply farm_prefix.")
