# Backend/app/routes/public.py: contains backend logic for the Animal Breed Registry System.
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, text
from sqlalchemy.orm import Session
import re
from .. import database, models
from ..utils.response import success

router = APIRouter(prefix="/api/public", tags=["public"])

@router.get("/breeders")

# Retrieves public breeders records from the database.
def get_public_breeders(db: Session = Depends(database.get_db)):
    """Public endpoint: list breeders with a lightweight animal count."""
    breeders = db.query(models.Breeder).all()

    result = [
        {
            "id": b.id,
            "name": b.full_name,
            "total_animals": db.query(models.Animal).filter(models.Animal.breeder_id == b.id).count(),
        }
        for b in breeders
    ]
    return success(result)

@router.get("/stats")

# Retrieves stats records from the database.
def get_stats(db: Session = Depends(database.get_db)):
    """Public endpoint: lightweight platform statistics for the homepage/dashboard."""
    return success(
        {
            "total_breeders": db.query(models.Breeder).count(),
            "total_animals": db.query(models.Animal).count(),
            "total_breeds": db.query(func.count(func.distinct(models.Animal.breed))).scalar() or 0,
        }
    )

@router.get("/breed-summary")

# Retrieves breed summary by query records from the database.
def get_breed_summary_by_query(breed: str, db: Session = Depends(database.get_db)):
    """Public endpoint: search approved breeders by breed name (query param)."""
    return _breed_search(breed, db)

@router.get("/animals/breed/{breed}")

# Retrieves breed summary records from the database.
def get_breed_summary(breed: str, db: Session = Depends(database.get_db)):
    """Public endpoint: search approved breeders by breed name (path param)."""
    return _breed_search(breed, db)

# Internal helper for breed search.
def _breed_search(breed: str, db: Session):
    """Shared logic: find approved breeders who have animals matching the breed."""
    try:
        rows = db.execute(
            text(
                """
                SELECT
                    b.id,
                    b.full_name        AS breeder_name,
                    b.farm_name,
                    b.farm_prefix,
                    b.farm_location,
                    b.county,
                    b.phone,
                    b.email,
                    b.animal_type,
                    COUNT(a.id)        AS animal_count,
                    STRING_AGG(DISTINCT a.breed, ', ' ORDER BY a.breed) AS breeds
                FROM breeders b
                JOIN animals a ON a.breeder_id = b.id
                WHERE b.status = 'approved'
                  AND a.breed ILIKE :pattern
                GROUP BY b.id, b.full_name, b.farm_name, b.farm_prefix,
                         b.farm_location, b.county, b.phone, b.email, b.animal_type
                ORDER BY animal_count DESC
                """
            ),
            {"pattern": f"%{breed}%"},
        ).fetchall()
    except Exception:

        # Fallback for DBs/environments that don't support the SQL functions we use above.
        breeders = (
            db.query(models.Breeder)
            .join(models.Animal)
            .filter(models.Animal.breed.ilike(f"%{breed}%"), models.Breeder.status == "approved")
            .group_by(models.Breeder.id)
            .all()
        )
        rows, results = None, []
        for b in breeders:
            count = (
                db.query(models.Animal)
                .filter(models.Animal.breeder_id == b.id, models.Animal.breed.ilike(f"%{breed}%"))
                .count()
            )
            results.append(
                {
                    "breeder_name": b.full_name,
                    "farm_name": b.farm_name or "—",
                    "farm_prefix": b.farm_prefix or "Unknown",
                    "farm_location": b.farm_location,
                    "county": b.county or "—",
                    "phone": b.phone,
                    "email": b.email,
                    "animal_type": b.animal_type,
                    "animal_count": count,
                    "breeds": breed,
                }
            )

    if rows is not None:
        
        # Map database row objects to result dictionaries.
        results = [
            {
                "breeder_name": r.breeder_name,
                "farm_name": r.farm_name or "—",
                "farm_prefix": r.farm_prefix or "Unknown",
                "farm_location": r.farm_location,
                "county": r.county or "—",
                "phone": r.phone,
                "email": r.email,
                "animal_type": r.animal_type,
                "animal_count": r.animal_count,
                "breeds": r.breeds,
            }
            for r in rows
        ]

    if not results:
        raise HTTPException(status_code=404, detail="No approved breeders found for this breed")
    return success(results)

# Public lineage lookup using formatted animal identification tags.
@router.get("/animals/lineage/{animal_id}")

# Retrieves animal lineage records from the database.
def get_animal_lineage(animal_id: str, db: Session = Depends(database.get_db)):
    """Public endpoint: return the first-level lineage (animal + immediate parents)."""
    try:

        # Normalize inputs like "FAR 1" / "FAR-001" into the stored tag format "FAR-001".
        cleaned_input = animal_id.strip().upper().replace(" ", "").replace("-", "")
        match = re.match(r"^([A-Z]+)(\d+)$", cleaned_input)
        if match:
            prefix = match.group(1)
            number = match.group(2)
            padded_number = number.zfill(3)
            normalized_id_for_db_lookup = f"{prefix}-{padded_number}"
        else:
            normalized_id_for_db_lookup = cleaned_input
        animal = (
            db.query(models.Animal)
            .filter(func.upper(models.Animal.animal_id) == normalized_id_for_db_lookup)
            .first()
        )
        if not animal:
            raise HTTPException(status_code=404, detail=f"Animal with ID {animal_id} not found")

        # Root node.
        results = [
            {

                "id": animal.id,
                "animal_id": animal.animal_id,
                "breed": animal.breed,
                "gender": animal.gender,
                "date_of_birth": str(animal.date_of_birth),
                "sire_id": animal.sire_id,
                "dam_id": animal.dam_id,
                "generation": 0,
                "parent_type": None,
                "tree_path": None,
            }
        ]

        # Resolve parent tags for the first level of the lineage tree.
        parent_ids = set()
        for row in results:
            if row["sire_id"]:
                parent_ids.add(row["sire_id"])
            if row["dam_id"]:
                parent_ids.add(row["dam_id"])

        parent_map = {}
        if parent_ids:
            parents = (
                db.query(models.Animal.id, models.Animal.animal_id)
                .filter(models.Animal.id.in_(parent_ids))
                .all()
            )
            parent_map = {p.id: p.animal_id for p in parents}

        lineage_data = []
        for row in results:
            lineage_data.append(
                {
                    "id": row["id"],
                    "animal_id": row["animal_id"],
                    "breed": row["breed"],
                    "gender": row["gender"],
                    "date_of_birth": row["date_of_birth"],
                    "sire_id": parent_map.get(row["sire_id"]),
                    "dam_id": parent_map.get(row["dam_id"]),
                    "generation": row["generation"],
                    "parent_type": row["parent_type"],
                    "tree_path": row["tree_path"],
                }
            )
        return success(lineage_data)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving lineage: {str(e)}")
