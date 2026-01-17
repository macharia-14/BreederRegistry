# backend/app/routes/public.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List
from .. import schemas, database

router = APIRouter(prefix="/api/public", tags=["public"])

@router.get("/animals/breed/{breed}", response_model=List[schemas.BreedSummaryResponse])
def get_breed_summary(breed: str, db: Session = Depends(database.get_db)):
    """
    Get breed summary from the public_breed_summary view.
    """
    results = db.execute(text("SELECT * FROM public.public_breed_summary WHERE breed ILIKE :breed"), {'breed': breed}).fetchall()
    
    if not results:
        raise HTTPException(status_code=404, detail="Breed not found")
    
    return results

@router.get("/animals/lineage/{animal_id}")
def get_animal_lineage(animal_id: str, db: Session = Depends(database.get_db)):
    """
    Get complete lineage information for an animal using the PostgreSQL function.
    """
    try:
        # Call the PostgreSQL function
        results = db.execute(
            text("SELECT * FROM public.get_lineage(:animal_id)"),
            {'animal_id': animal_id}
        ).fetchall()
        
        if not results:
            raise HTTPException(status_code=404, detail=f"Animal with ID {animal_id} not found")
        
        # Convert results to list of dictionaries
        lineage_data = []
        for row in results:
            lineage_data.append({
                "animal_id": row[0],
                "breed": row[1],
                "gender": row[2],
                "date_of_birth": row[3],
                "sire_id": row[4],
                "dam_id": row[5],
                "generation": row[6]
            })
        
        return lineage_data
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving lineage: {str(e)}")
