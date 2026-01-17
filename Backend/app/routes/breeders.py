# backend/app/routes/breeders.py
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List
from .. import models, schemas, database, crud
from ..utils import get_password_hash, verify_password, generate_unique_prefix

router = APIRouter(prefix="/api/breeders", tags=["breeders"])

@router.get("/breed/{breed}", response_model=List[schemas.BreedSummaryResponse])
def get_breed_summary(breed: str, db: Session = Depends(database.get_db)):
    """
    Get breed summary from the public_breed_summary view.
    """
    from sqlalchemy import text
    results = db.execute(text("SELECT * FROM public.public_breed_summary WHERE breed = :breed"), {'breed': breed}).fetchall()
    
    if not results:
        raise HTTPException(status_code=404, detail="Breed not found")
    
    return results

@router.post("/register", response_model=schemas.BreederResponse, status_code=status.HTTP_201_CREATED)
def register_breeder(b: schemas.BreederCreate, db: Session = Depends(database.get_db)):
    # Uniqueness checks
    if db.query(models.Breeder).filter(models.Breeder.email == b.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if db.query(models.Breeder).filter(models.Breeder.national_id == b.national_id).first():
        raise HTTPException(status_code=400, detail="National ID already registered")

    # Hash password
    hashed_pw = get_password_hash(b.password)

    # Generate unique farm prefix
    farm_prefix = generate_unique_prefix(db, b.full_name)

    # Create new breeder with animal type and farm prefix
    new_b = models.Breeder(
        full_name=b.full_name,
        national_id=b.national_id,
        animal_type=b.animal_type,
        farm_name=b.farm_name,
        farm_prefix=farm_prefix,
        farm_location=b.farm_location,
        county=b.county,
        phone=b.phone,
        email=b.email,
        password_hash=hashed_pw,
        documents=getattr(b, 'documents', None)  # Add documents field if provided
    )
    
    try:
        db.add(new_b)
        db.commit()
        db.refresh(new_b)
        return new_b
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


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

# New endpoint to get breeder details by ID
@router.get("/{breeder_id}", response_model=schemas.BreederResponse)
def get_breeder_details(breeder_id: int, db: Session = Depends(database.get_db)):
    breeder = db.query(models.Breeder).filter(models.Breeder.id == breeder_id).first()
    if not breeder:
        raise HTTPException(status_code=404, detail="Breeder not found")
    return breeder

# Animal endpoints
@router.get("/{breeder_id}/animals", response_model=List[schemas.AnimalResponse])
def get_breeder_animals(breeder_id: int, db: Session = Depends(database.get_db)):
    animals = crud.get_animals_by_breeder(db, breeder_id=breeder_id)
    return animals

@router.post("/{breeder_id}/animals", response_model=schemas.AnimalResponse, status_code=status.HTTP_201_CREATED)
def create_animal_for_breeder(
    breeder_id: int, 
    animal: schemas.AnimalCreate, 
    db: Session = Depends(database.get_db)
):
    # Verify breeder exists
    breeder = db.query(models.Breeder).filter(models.Breeder.id == breeder_id).first()
    if not breeder:
        raise HTTPException(status_code=404, detail="Breeder not found")
    
    # Verify parents exist if provided
    if animal.sire_id:
        sire = crud.get_animal(db, animal.sire_id)
        if not sire or sire.breeder_id != breeder_id:
            raise HTTPException(status_code=400, detail="Invalid sire ID")
    
    if animal.dam_id:
        dam = crud.get_animal(db, animal.dam_id)
        if not dam or dam.breeder_id != breeder_id:
            raise HTTPException(status_code=400, detail="Invalid dam ID")
    
    return crud.create_animal(db=db, animal=animal, breeder_id=breeder_id)

# Breeding event endpoints
@router.get("/{breeder_id}/breeding-events", response_model=List[schemas.BreedingEventResponse])
def get_breeder_breeding_events(breeder_id: int, db: Session = Depends(database.get_db)):
    events = crud.get_breeding_events_by_breeder(db, breeder_id=breeder_id)
    return events

@router.post("/{breeder_id}/breeding-events", response_model=schemas.BreedingEventResponse, status_code=status.HTTP_201_CREATED)
def create_breeding_event_for_breeder(
    breeder_id: int, 
    breeding_event: schemas.BreedingEventCreate, 
    db: Session = Depends(database.get_db)
):
    # Verify breeder exists
    breeder = db.query(models.Breeder).filter(models.Breeder.id == breeder_id).first()
    if not breeder:
        raise HTTPException(status_code=404, detail="Breeder not found")
    
    # Verify dam exists and belongs to breeder
    dam = crud.get_animal(db, breeding_event.dam_id)
    if not dam or dam.breeder_id != breeder_id:
        raise HTTPException(status_code=400, detail="Invalid dam ID")
    
    # Verify sire exists and belongs to breeder if provided
    if breeding_event.sire_id:
        sire = crud.get_animal(db, breeding_event.sire_id)
        if not sire or sire.breeder_id != breeder_id:
            raise HTTPException(status_code=400, detail="Invalid sire ID")
    
    # Verify offspring exists and belongs to breeder if provided
    if breeding_event.offspring_id:
        offspring = crud.get_animal(db, breeding_event.offspring_id)
        if not offspring or offspring.breeder_id != breeder_id:
            raise HTTPException(status_code=400, detail="Invalid offspring ID")
    
    return crud.create_breeding_event(db=db, breeding_event=breeding_event, breeder_id=breeder_id)

@router.get("/dashboard", include_in_schema=False)
async def read_dashboard():
    return FileResponse('Frontend/breeders/dashboard.html')
