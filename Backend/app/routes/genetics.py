# Backend/app/routes/genetics.py: contains backend logic for the Animal Breed Registry System.
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import date, timedelta
from .. import models, database
from ..auth import get_current_breeder
from ..genetics import (
    compute_inbreeding_coefficient,
    classify_coi,
    recommend_sires,
    get_gestation_days,
    combine_pedigree_completeness,
    analyze_pedigree_completeness,
    detect_relationship_risks,
)

router = APIRouter(prefix="/api/genetics", tags=["genetics"])

# Calculate the projected Inbreeding Coefficient (COI) for a hypothetical pairing
@router.get("/coi")

# Retrieves coi records from the database.
def get_coi(
    sire_id: int = Query(..., description="Database ID of the sire"),
    dam_id:  int = Query(..., description="Database ID of the dam"),

    db: Session = Depends(database.get_db),
    current_breeder: models.Breeder = Depends(get_current_breeder),
):
    """
    Calculate Wright's Coefficient of Inbreeding for a hypothetical offspring
    of the given sire × dam pairing.  Both animals must exist in the database.
    """

    sire = db.query(models.Animal).filter(models.Animal.id == sire_id).first()
    dam = db.query(models.Animal).filter(models.Animal.id == dam_id).first()

    if not sire:
        raise HTTPException(status_code=404, detail=f"Sire with id {sire_id} not found")
    if not dam:
        raise HTTPException(status_code=404, detail=f"Dam with id {dam_id} not found")
    if sire.animal_type != dam.animal_type:
        raise HTTPException(status_code=400, detail="Sire and dam must be the same animal type")
    if sire.gender != "male":
        raise HTTPException(status_code=400, detail="Sire must be male")
    if dam.gender != "female":
        raise HTTPException(status_code=400, detail="Dam must be female")

    coi = compute_inbreeding_coefficient(sire_id, dam_id, db)
    classification = classify_coi(coi)
    pedigree_completeness = combine_pedigree_completeness(sire_id, dam_id, db, max_depth=4)
    relationship_flags = detect_relationship_risks(sire, dam)
    recommendation = (

        "Lower projected inbreeding risk based on available pedigree records." if coi < 0.0625
        else "Consider an alternative sire to reduce projected inbreeding risk."

    )
    if pedigree_completeness.get("warnings"):
        recommendation += " Interpret with caution because pedigree records are incomplete."
    return {
        "sire_animal_id": sire.animal_id,
        "dam_animal_id":  dam.animal_id,
        "coi":            coi,
        "coi_percent":    round(coi * 100, 2),
        "risk_level":     classification["level"],
        "risk_color":     classification["color"],
        "description":    classification["description"],
        "recommendation": recommendation,
        "relationship_flags": relationship_flags,
        "pedigree_completeness": pedigree_completeness,
        "pedigree_depth_analyzed": pedigree_completeness["generations_requested"],
        "pedigree_depth_available": pedigree_completeness["generations_available"],
        "pedigree_completeness_percent": pedigree_completeness["completeness_percent"],
        "data_notice": "Pedigree-based estimate only. Not DNA or laboratory verification.",
    }

# Get the COI for an existing animal based on its registered parents
@router.get("/animal-coi/{animal_db_id}")

# Retrieves animal coi records from the database.
def get_animal_coi(
    animal_db_id: int,
    db: Session = Depends(database.get_db),
    current_breeder: models.Breeder = Depends(get_current_breeder),
):
    """
    Calculates the COI of an existing animal by looking up its sire and dam.
    Note: Completeness of the registry affects accuracy.
    """
    animal = db.query(models.Animal).filter(models.Animal.id == animal_db_id).first()
    if not animal:
        raise HTTPException(status_code=404, detail="Animal not found")

    # Check if parents are registered to allow calculation
    if not animal.sire_id or not animal.dam_id:
        pedigree_completeness = analyze_pedigree_completeness(animal.id, db, max_depth=6)
        return {
            "animal_id":   animal.animal_id,
            "coi":         None,
            "coi_percent": None,
            "message":     "COI cannot be calculated — sire or dam is not registered in the system.",
            "pedigree_completeness": pedigree_completeness,
            "pedigree_depth_analyzed": pedigree_completeness["generations_requested"],
            "pedigree_depth_available": pedigree_completeness["generations_available"],
            "pedigree_completeness_percent": pedigree_completeness["completeness_percent"],
            "data_notice": "Pedigree-based estimate only. Not DNA or laboratory verification.",
        }

    # Calculate using registered lineage
    coi = compute_inbreeding_coefficient(animal.sire_id, animal.dam_id, db)
    classification = classify_coi(coi)
    pedigree_completeness = analyze_pedigree_completeness(animal.id, db, max_depth=4)
    return {
        "animal_id":   animal.animal_id,
        "coi":         coi,
        "coi_percent": round(coi * 100, 2),
        "risk_level":  classification["level"],
        "risk_color":  classification["color"],
        "description": classification["description"],
        "pedigree_completeness": pedigree_completeness,
        "pedigree_depth_analyzed": pedigree_completeness["generations_requested"],
        "pedigree_depth_available": pedigree_completeness["generations_available"],
        "pedigree_completeness_percent": pedigree_completeness["completeness_percent"],
        "data_notice": "Pedigree-based estimate only. Not DNA or laboratory verification.",
    }

# Suggest suitable sires for a specific dam based on genetics and performance
@router.get("/recommend-sires/{dam_db_id}")

# Retrieves sire recommendations records from the database.
def get_sire_recommendations(
    dam_db_id: int,
    top_n: int = Query(default=10, ge=1, le=20),
    db: Session = Depends(database.get_db),
    current_breeder: models.Breeder = Depends(get_current_breeder),
):
    """
    Provides a list of potential mates ranked by a weighted multi-factor score.
    The scoring model considers genetic distance, recorded health, and productivity.
    """
    dam = db.query(models.Animal).filter(models.Animal.id == dam_db_id).first()
    if not dam:
        raise HTTPException(status_code=404, detail="Dam not found")
    if dam.gender != "female":
        raise HTTPException(status_code=400, detail="Selected animal is not female")

    # Execute the scoring engine
    recommendations = recommend_sires(dam_db_id, db, top_n=top_n)
    return {
        "dam_animal_id":    dam.animal_id,
        "dam_breed":        dam.breed,
        "animal_type":      dam.animal_type,
        "total_candidates": len(recommendations),
        "scoring_model": {
            "genetic_diversity": 25,
            "performance": 25,
            "health": 20,
            "fertility": 15,
            "offspring": 10,
            "confidence": 5,
            "note": "Final score is reduced by relationship, COI, hereditary, health, fertility and pedigree-completeness risk warnings. Results are pedigree-based decision support, not DNA verification.",
        },

        "recommendations":  recommendations,
    }

# Dashboard utility to track current pregnancies and projected birth dates
@router.get("/pregnancy-monitor/{breeder_id}")

# Retrieves pregnancy monitor records from the database.
def get_pregnancy_monitor(
    breeder_id: int,
    db: Session = Depends(database.get_db),
    current_breeder: models.Breeder = Depends(get_current_breeder),
):
    """
    Aggregates active breeding events to provide a countdown to birth.
    Categorizes events by urgency (e.g. Due Soon vs Overdue).
    """
    if current_breeder.id != breeder_id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Query events that are currently active
    events = (
        db.query(models.BreedingEvent)
        .filter(
            models.BreedingEvent.breeder_id == breeder_id,
            models.BreedingEvent.status.in_(["served", "confirmed_pregnant"]),
            models.BreedingEvent.outcome == None,
        )
        .all()
    )

    today = date.today()
    pregnancies = []

    for ev in events:
        dam = db.query(models.Animal).filter(models.Animal.id == ev.dam_id).first()
        if not dam:
            continue

        # Calculate timelines based on species-specific gestation periods
        gestation = get_gestation_days(dam.animal_type)
        breed_date = ev.breeding_date

        # Determine the expected due date
        due_date = ev.expected_due_date if ev.expected_due_date else breed_date + timedelta(days=gestation)

        # Calculate progress percentages
        days_elapsed = (today - breed_date).days
        days_remaining = (due_date - today).days
        progress_pct = min(100, max(0, round((days_elapsed / gestation) * 100)))

        # Assign UI-friendly status categories
        if days_elapsed < 0:
            status = "Upcoming"
            status_color = "#6366f1"
        elif not ev.pregnancy_confirmed:
            status = "Awaiting Check"
            status_color = "#64748b"
        elif days_remaining < 0:
            status = "Overdue"
            status_color = "#dc2626"
        elif days_remaining <= 14:
            status = "Due Soon"
            status_color = "#ea580c"
        else:
            status = "Active"
            status_color = "#16a34a"

        sire_info = None
        if ev.sire_id:
            sire = db.query(models.Animal).filter(models.Animal.id == ev.sire_id).first()
            sire_info = sire.animal_id if sire else None

        pregnancies.append({
            "event_id":        ev.id,
            "dam_animal_id":   dam.animal_id,
            "dam_breed":       dam.breed,
            "animal_type":     dam.animal_type,
            "sire_animal_id":  sire_info,
            "breeding_method": ev.breeding_method,
            "breeding_date":   str(breed_date),
            "due_date":        str(due_date),
            "gestation_days":  gestation,
            "days_elapsed":    max(days_elapsed, 0),
            "days_remaining":  days_remaining,
            "progress_pct":    progress_pct,
            "status":          status,
            "status_color":    status_color,
            "breeding_status": ev.status,
            "pregnancy_confirmed": bool(ev.pregnancy_confirmed),
            "pregnancy_check_date": str(ev.pregnancy_check_date) if ev.pregnancy_check_date else None,
        })

    # Sort by urgency so breeders see 'Overdue' and 'Due Soon' items at the top
    order = {"Overdue": 0, "Due Soon": 1, "Active": 2, "Awaiting Check": 3, "Upcoming": 4}
    pregnancies.sort(key=lambda p: (order.get(p["status"], 9), p["days_remaining"]))

    # Create summary statistics for the dashboard hero section
    summary = {
        "total":    len(pregnancies),
        "active":   sum(1 for p in pregnancies if p["status"] == "Active"),
        "due_soon": sum(1 for p in pregnancies if p["status"] == "Due Soon"),
        "overdue":  sum(1 for p in pregnancies if p["status"] == "Overdue"),
        "awaiting_check": sum(1 for p in pregnancies if p["status"] == "Awaiting Check"),
    }
    return {"summary": summary, "pregnancies": pregnancies}
