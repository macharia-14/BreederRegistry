# backend/app/routes/breeders.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from .. import models, schemas, database
from ..utils import get_password_hash, verify_password, generate_unique_prefix

router = APIRouter(prefix="/api/breeders", tags=["breeders"])

@router.post("/register", response_model=schemas.BreederResponse, status_code=status.HTTP_201_CREATED)
def register_breeder(b: schemas.BreederCreate, db: Session = Depends(database.get_db)):
    # uniqueness checks
    if db.query(models.Breeder).filter(models.Breeder.email == b.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if db.query(models.Breeder).filter(models.Breeder.national_id == b.national_id).first():
        raise HTTPException(status_code=400, detail="National ID already registered")

    # farm_prefix: DB requires NOT NULL, enforce or generate
    if b.farm_prefix:
        if db.query(models.Breeder).filter(models.Breeder.farm_prefix == b.farm_prefix).first():
            raise HTTPException(status_code=400, detail="Farm prefix already registered")
        farm_prefix = b.farm_prefix
    else:
        farm_prefix = generate_unique_prefix(db, b.full_name)

    hashed_pw = get_password_hash(b.password)

    new_b = models.Breeder(
        full_name=b.full_name,
        national_id=b.national_id,
        breeder_type=b.breeder_type,
        farm_name=b.farm_name,
        farm_prefix=farm_prefix,
        farm_location=b.farm_location,
        county=b.county,
        phone=b.phone,
        email=b.email,
        password_hash=hashed_pw
    )
    db.add(new_b)
    db.commit()
    db.refresh(new_b)
    return new_b


@router.post("/login")
def login(payload: schemas.BreederLogin, db: Session = Depends(database.get_db)):
    """
    Minimal login endpoint (accepts {"identifier": <email|national_id>, "password": <pw>})
    For now returns a simple success/failure. Later replace with JWT.
    """
    breeder = db.query(models.Breeder).filter(
        (models.Breeder.email == payload.identifier) | (models.Breeder.national_id == payload.identifier)
    ).first()
    if not breeder or not verify_password(payload.password, breeder.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"success": True, "breeder_id": breeder.id, "status": breeder.status}
