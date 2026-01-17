# backend/app/utils.py
import re
import random
import string
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
    # Import here to avoid circular imports
    from .models import Breeder
    
    def create_base_prefix(name: str) -> str:
        # Clean the name - remove special characters and extra spaces
        clean_name = re.sub(r'[^a-zA-Z\s]', '', name).strip()
        words = clean_name.split()
        
        if len(words) >= 2:
            # Use first letter of first name + first 2 letters of last name
            first_part = words[0][:1].upper()
            last_part = words[-1][:2].upper()
            base = first_part + last_part
        elif len(words) == 1:
            # Use first 3 letters of single name
            base = words[0][:3].upper()
        else:
            # Fallback if name is empty or invalid
            base = "FAR"
        
        # Pad with 'X' if too short
        while len(base) < 3:
            base += "X"
            
        return base[:3]  # Ensure max 3 letters
    
    base_prefix = create_base_prefix(full_name)
    
    for attempt in range(max_attempts):
        candidate_prefix = base_prefix
        
        # Check if prefix already exists
        existing = db.query(Breeder).filter(
            Breeder.farm_prefix == candidate_prefix
        ).first()
        
        if not existing:
            return candidate_prefix
        
        # If prefix exists, try adding a number suffix
        for i in range(1, 10):
            candidate_prefix = f"{base_prefix}{i}"
            existing = db.query(Breeder).filter(
                Breeder.farm_prefix == candidate_prefix
            ).first()
            if not existing:
                return candidate_prefix
    
    # Fallback: if we can't find unique prefix after max_attempts
    import time
    timestamp_suffix = str(int(time.time()))[-1:]  # Last digit of timestamp
    fallback_prefix = f"{base_prefix[:2]}{timestamp_suffix}"
    
    return fallback_prefix

def generate_animal_id(db: Session, farm_prefix: str) -> str:
    # Import here to avoid circular imports
    from .models import Animal
    
    # Get the highest sequence number for this farm prefix
    latest_animal = db.query(Animal).filter(Animal.animal_id.like(f"{farm_prefix}-%")).order_by(Animal.id.desc()).first()
    
    if latest_animal:
        # Extract the number from the latest animal ID
        try:
            last_number = int(latest_animal.animal_id.split('-')[-1])
            next_number = last_number + 1
        except (ValueError, IndexError):
            next_number = 1
    else:
        next_number = 1
    
    # Format with leading zeros (e.g., JOSM23-001, JOSM23-002)
    return f"{farm_prefix}-{next_number:03d}"