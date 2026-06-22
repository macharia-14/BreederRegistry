# Routes for breeder account management, animal registration, and breeding events
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timezone, timedelta
import hashlib, secrets, os, json
from .. import models, schemas, database, crud
from ..services import animal_service, breeding_service, audit_service, report_service
from ..utils.core import get_password_hash, verify_password, generate_unique_prefix, create_access_token
from ..utils.response import success
from ..auth import get_current_breeder
from ..email_utils import send_new_application_email_to_admin, send_password_reset_email

router = APIRouter(prefix="/api/breeders", tags=["breeders"])

# Self-registration for new breeders. Submissions remain 'pending' until admin approval.
@router.post("/register", response_model=schemas.BreederResponse, status_code=status.HTTP_201_CREATED)

# Handles register breeder logic for this module.
def register_breeder(b: schemas.BreederCreate, db: Session = Depends(database.get_db)):

    # Enforce unique email and national ID
    if db.query(models.Breeder).filter(models.Breeder.email == b.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if db.query(models.Breeder).filter(models.Breeder.national_id == b.national_id).first():
        raise HTTPException(status_code=400, detail="National ID already registered")

    # Hash password and auto-generate a farm prefix if one isn't provided
    hashed_pw = get_password_hash(b.password)
    farm_prefix = generate_unique_prefix(db, b.full_name)
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
        documents=b.documents,
    )
    try:
        db.add(new_b)
        db.commit()
        db.refresh(new_b)

        # Alert admins that a new application is waiting
        send_new_application_email_to_admin(
            breeder_name=new_b.full_name,
            breeder_email=new_b.email,
            national_id=new_b.national_id,
            farm_name=new_b.farm_name or "",
            animal_type=new_b.animal_type,
            county=new_b.county or "",
        )
        return new_b
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

# Authenticate a breeder and issue a JWT. Only 'approved' accounts can log in.
@router.post("/login")

# Handles login logic for this module.
def login(payload: schemas.BreederLogin, db: Session = Depends(database.get_db)):
    """Authenticate a breeder and return a JWT access token."""
    breeder = db.query(models.Breeder).filter(
        (models.Breeder.email == payload.identifier) | (models.Breeder.national_id == payload.identifier)
    ).first()
    if not breeder or not verify_password(payload.password, breeder.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if breeder.status != "approved":
        raise HTTPException(
            status_code=403,
            detail=f"Account is {breeder.status}. Please wait for admin approval.",
        )
    
    # Record login event in the audit trail
    token = create_access_token({"sub": str(breeder.id), "role": "breeder"})
    audit_service.record_action(
        db,
        actor_type="breeder",
        actor_id=breeder.id,
        actor_name=breeder.full_name,
        action="BREEDER_LOGIN",
        target_type="Breeder",
        target_id=breeder.id,
    )
    db.commit()
    return {
        "success": True,
        "access_token": token,
        "role": "breeder",
        "token_type": "bearer",
        "breeder_id": breeder.id,
        "status": breeder.status,
    }

# Trigger a password reset email if the identifier exists
@router.post("/forgot-password")

# Handles forgot password logic for this module.
def forgot_password(payload: schemas.ForgotPasswordRequest, request: Request, db: Session = Depends(database.get_db)):
    breeder = db.query(models.Breeder).filter(
        (models.Breeder.email == payload.identifier) | (models.Breeder.national_id == payload.identifier)
    ).first()
    if breeder:
        
        # Generate a temporary secure token
        raw_token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
        reset = models.PasswordResetToken(
            breeder_id=breeder.id,
            token_hash=token_hash,
            expires_at=datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(minutes=60),
        )
        db.add(reset)
        audit_service.record_action(
            db,
            actor_type="breeder",
            actor_id=breeder.id,
            actor_name=breeder.full_name,
            action="REQUEST_PASSWORD_RESET",
            target_type="Breeder",
            target_id=breeder.id,
        )
        db.commit()
        base_url = os.getenv("APP_BASE_URL", str(request.base_url).rstrip("/"))
        reset_url = f"{base_url}/reset-password.html?token={raw_token}"
        send_password_reset_email(breeder.email, breeder.full_name, reset_url)
    return {"success": True, "message": "If the account exists, a reset link has been sent."}

# Update password using a valid reset token
@router.post("/reset-password")

# Handles reset password logic for this module.
def reset_password(payload: schemas.ResetPasswordRequest, db: Session = Depends(database.get_db)):
    token_hash = hashlib.sha256(payload.token.encode("utf-8")).hexdigest()
    reset = db.query(models.PasswordResetToken).filter(models.PasswordResetToken.token_hash == token_hash).first()
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    # Tokens are single-use and expire after a set duration
    if not reset or reset.used_at is not None or reset.expires_at < now:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    breeder = db.query(models.Breeder).filter(models.Breeder.id == reset.breeder_id).first()
    if not breeder:
        raise HTTPException(status_code=404, detail="Account not found")

    breeder.password_hash = get_password_hash(payload.password)
    reset.used_at = now
    audit_service.record_action(
        db,
        actor_type="breeder",
        actor_id=breeder.id,
        actor_name=breeder.full_name,
        action="RESET_PASSWORD",
        target_type="Breeder",
        target_id=breeder.id,
    )
    db.add(breeder); db.add(reset); db.commit()
    return {"success": True, "message": "Password reset successfully"}

# Get the profile data for the authenticated breeder
@router.get("/me", response_model=schemas.BreederResponse)

# Retrieves my profile records from the database.
def get_my_profile(current_breeder: models.Breeder = Depends(get_current_breeder)):
    return current_breeder

# Get details for a specific breeder ID (permission check ensures users only see their own data)
@router.get("/{breeder_id}", response_model=schemas.BreederResponse)

# Retrieves breeder details records from the database.
def get_breeder_details(
    breeder_id: int,
    db: Session = Depends(database.get_db),
    current_breeder: models.Breeder = Depends(get_current_breeder),
):
    if current_breeder.id != breeder_id:
        raise HTTPException(status_code=403, detail="Access denied")
    return current_breeder

# Update profile contact or farm information
@router.patch("/{breeder_id}/profile", response_model=schemas.BreederResponse)

# Updates an existing breeder profile record with validated values.
def update_breeder_profile(
    breeder_id: int,
    payload: schemas.BreederProfileUpdate,
    db: Session = Depends(database.get_db),
    current_breeder: models.Breeder = Depends(get_current_breeder),
):
    # Validates that the current user owns this profile
    animal_service.ensure_breeder_access(breeder_id, current_breeder)
    data = payload.model_dump(exclude_unset=True)

    # If changing email, check for global uniqueness
    if "email" in data and data["email"] != current_breeder.email:
        exists = db.query(models.Breeder).filter(models.Breeder.email == data["email"], models.Breeder.id != breeder_id).first()
        if exists:
            raise HTTPException(status_code=400, detail="Email already used by another account")

    for field in ["phone", "email", "farm_name", "farm_location", "county"]:
        if field in data:
            setattr(current_breeder, field, data[field])
    audit_service.record_action(
        db,
        actor_type="breeder",
        actor_id=current_breeder.id,
        actor_name=current_breeder.full_name,
        action="UPDATE_PROFILE",
        target_type="Breeder",
        target_id=current_breeder.id,
        detail={"updated_fields": list(data.keys())},
    )
    db.add(current_breeder)
    db.commit()
    db.refresh(current_breeder)
    return current_breeder

# Change password while logged in (requires current password verification)
@router.post("/{breeder_id}/change-password")

# Handles change breeder password logic for this module.
def change_breeder_password(
    breeder_id: int,
    payload: schemas.ChangePasswordRequest,
    db: Session = Depends(database.get_db),
    current_breeder: models.Breeder = Depends(get_current_breeder),
):
    animal_service.ensure_breeder_access(breeder_id, current_breeder)
    if not verify_password(payload.current_password, current_breeder.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    current_breeder.password_hash = get_password_hash(payload.new_password)
    audit_service.record_action(
        db,
        actor_type="breeder",
        actor_id=current_breeder.id,
        actor_name=current_breeder.full_name,
        action="CHANGE_PASSWORD",
        target_type="Breeder",
        target_id=current_breeder.id,
    )
    db.add(current_breeder)
    db.commit()
    return {"success": True, "message": "Password updated successfully"}

# Get a history of actions performed by this breeder account
@router.get("/{breeder_id}/activity-logs")

# Retrieves breeder activity logs records from the database.
def get_breeder_activity_logs(
    breeder_id: int,
    db: Session = Depends(database.get_db),
    current_breeder: models.Breeder = Depends(get_current_breeder),
):
    animal_service.ensure_breeder_access(breeder_id, current_breeder)
    logs = audit_service.list_breeder_logs(db, breeder_id=breeder_id, limit=50)
    return {
        "success": True,
        "logs": [
            {
                "id": log.id,
                "action": log.action,
                "target_type": log.target_type,
                "target_id": log.target_id,
                "detail": log.detail,
                "created_at": str(log.created_at),
            }
            for log in logs
        ],
    }

# Get summarized farm analytics (animal counts, breeding success, etc.)
@router.get("/{breeder_id}/report-summary")

# Retrieves breeder report summary records from the database.
def get_breeder_report_summary(
    breeder_id: int,
    db: Session = Depends(database.get_db),
    current_breeder: models.Breeder = Depends(get_current_breeder),
):
    animal_service.ensure_breeder_access(breeder_id, current_breeder)
    return report_service.get_breeder_report_summary(db=db, breeder_id=breeder_id)

# Fetch all animals registered by this breeder
@router.get("/{breeder_id}/animals", response_model=List[schemas.AnimalResponse])

# Retrieves breeder animals records from the database.
def get_breeder_animals(
    breeder_id: int,
    db: Session = Depends(database.get_db),
    current_breeder: models.Breeder = Depends(get_current_breeder),
):
    animal_service.ensure_breeder_access(breeder_id, current_breeder)
    return crud.get_animals_by_breeder(db, breeder_id=breeder_id)

# Register a new animal in the system
@router.post("/{breeder_id}/animals", response_model=schemas.AnimalResponse, status_code=status.HTTP_201_CREATED)

# Creates and stores a new animal for breeder record.
def create_animal_for_breeder(
    breeder_id: int,
    animal: schemas.AnimalCreate,
    db: Session = Depends(database.get_db),
    current_breeder: models.Breeder = Depends(get_current_breeder),
):
    animal_service.ensure_breeder_access(breeder_id, current_breeder)
    created = animal_service.create_animal_for_breeder(db=db, breeder_id=breeder_id, animal=animal)
    audit_service.record_action(db, actor_type="breeder", actor_id=current_breeder.id, actor_name=current_breeder.full_name, action="CREATE_ANIMAL", target_type="Animal", target_id=created.id, detail={"animal_id": created.animal_id})
    db.commit(); db.refresh(created)
    return created

# Update attributes of an existing animal
@router.patch("/{breeder_id}/animals/{animal_db_id}", response_model=schemas.AnimalResponse)

# Updates an existing animal for breeder record with validated values.
def update_animal_for_breeder(
    breeder_id: int,
    animal_db_id: int,
    animal: schemas.AnimalUpdate,
    db: Session = Depends(database.get_db),
    current_breeder: models.Breeder = Depends(get_current_breeder),

):
    animal_service.ensure_breeder_access(breeder_id, current_breeder)
    updated = animal_service.update_animal_for_breeder(
        db=db,
        breeder_id=breeder_id,
        animal_db_id=animal_db_id,
        animal=animal,
    )

    audit_service.record_action(db, actor_type="breeder", actor_id=current_breeder.id, actor_name=current_breeder.full_name, action="UPDATE_ANIMAL", target_type="Animal", target_id=updated.id, detail={"animal_id": updated.animal_id})
    db.commit(); db.refresh(updated)
    return updated

# Record a new weight or size measurement for an animal
@router.post(
    "/{breeder_id}/animals/{animal_db_id}/measurements",
    response_model=schemas.AnimalMeasurementResponse,
    status_code=status.HTTP_201_CREATED,
)
# Creates and stores a new measurement for animal record.
def create_measurement_for_animal(
    breeder_id: int,
    animal_db_id: int,
    measurement: schemas.AnimalMeasurementCreate,
    db: Session = Depends(database.get_db),
    current_breeder: models.Breeder = Depends(get_current_breeder),
):
    animal_service.ensure_breeder_access(breeder_id, current_breeder)
    rec = animal_service.create_measurement_for_animal(
        db=db,
        breeder_id=breeder_id,
        animal_db_id=animal_db_id,
        measurement=measurement,
    )

    audit_service.record_action(db, actor_type="breeder", actor_id=current_breeder.id, actor_name=current_breeder.full_name, action="RECORD_MEASUREMENT", target_type="Animal", target_id=animal_db_id, detail={"value": measurement.value, "unit": measurement.unit})
    db.commit(); db.refresh(rec)
    return rec

# Fetch measurement history for a specific animal
@router.get("/{breeder_id}/animals/{animal_db_id}/measurements", response_model=List[schemas.AnimalMeasurementResponse])

# Retrieves measurements for animal records from the database.
def get_measurements_for_animal(
    breeder_id: int,
    animal_db_id: int,
    db: Session = Depends(database.get_db),
    current_breeder: models.Breeder = Depends(get_current_breeder),
):
    animal_service.ensure_breeder_access(breeder_id, current_breeder)
    return animal_service.get_measurements_for_animal(db=db, breeder_id=breeder_id, animal_db_id=animal_db_id)

# Get comprehensive profile including lineage, health, and production history
@router.get("/{breeder_id}/animals/{animal_db_id}/profile", response_model=schemas.AnimalFullProfileResponse)

# Retrieves animal full profile records from the database.
def get_animal_full_profile(
    breeder_id: int,
    animal_db_id: int,
):
    animal_service.ensure_breeder_access(breeder_id, current_breeder)
    return animal_service.get_animal_full_profile_for_breeder(db=db, breeder_id=breeder_id, animal_db_id=animal_db_id)

# Record vaccinations, treatments, or illness history
@router.post("/{breeder_id}/animals/{animal_db_id}/health-records", response_model=schemas.AnimalHealthRecordResponse, status_code=status.HTTP_201_CREATED)

# Creates and stores a new animal health record record.
def create_animal_health_record(breeder_id: int, animal_db_id: int, payload: schemas.AnimalHealthRecordCreate, db: Session = Depends(database.get_db), current_breeder: models.Breeder = Depends(get_current_breeder)):
    animal_service.ensure_breeder_access(breeder_id, current_breeder)
    return animal_service.create_health_record_for_animal(db=db, breeder_id=breeder_id, animal_db_id=animal_db_id, payload=payload)

# Record fertility examinations or heat observations
@router.post("/{breeder_id}/animals/{animal_db_id}/fertility-records", response_model=schemas.AnimalFertilityRecordResponse, status_code=status.HTTP_201_CREATED)

# Creates and stores a new animal fertility record record.
def create_animal_fertility_record(breeder_id: int, animal_db_id: int, payload: schemas.AnimalFertilityRecordCreate, db: Session = Depends(database.get_db), current_breeder: models.Breeder = Depends(get_current_breeder)):
    animal_service.ensure_breeder_access(breeder_id, current_breeder)
    return animal_service.create_fertility_record_for_animal(db=db, breeder_id=breeder_id, animal_db_id=animal_db_id, payload=payload)

# Record milk production, fleece weight, or other yields
@router.post("/{breeder_id}/animals/{animal_db_id}/production-records", response_model=schemas.AnimalProductionRecordResponse, status_code=status.HTTP_201_CREATED)

# Creates and stores a new animal production record record.
def create_animal_production_record(breeder_id: int, animal_db_id: int, payload: schemas.AnimalProductionRecordCreate, db: Session = Depends(database.get_db), current_breeder: models.Breeder = Depends(get_current_breeder)):
    animal_service.ensure_breeder_access(breeder_id, current_breeder)
    return animal_service.create_production_record_for_animal(db=db, breeder_id=breeder_id, animal_db_id=animal_db_id, payload=payload)

# Log offspring details without necessarily creating full registry records for them yet
@router.post("/{breeder_id}/animals/{animal_db_id}/offspring-records", response_model=schemas.AnimalOffspringRecordResponse, status_code=status.HTTP_201_CREATED)

# Creates and stores a new animal offspring record record.
def create_animal_offspring_record(breeder_id: int, animal_db_id: int, payload: schemas.AnimalOffspringRecordCreate, db: Session = Depends(database.get_db), current_breeder: models.Breeder = Depends(get_current_breeder)):
    animal_service.ensure_breeder_access(breeder_id, current_breeder)
    return animal_service.create_offspring_record_for_animal(db=db, breeder_id=breeder_id, animal_db_id=animal_db_id, payload=payload)

# Add general notes or remarks to an animal's file
@router.post("/{breeder_id}/animals/{animal_db_id}/notes", response_model=schemas.AnimalNoteResponse, status_code=status.HTTP_201_CREATED)

# Creates and stores a new animal note record.
def create_animal_note(breeder_id: int, animal_db_id: int, payload: schemas.AnimalNoteCreate, db: Session = Depends(database.get_db), current_breeder: models.Breeder = Depends(get_current_breeder)):
    animal_service.ensure_breeder_access(breeder_id, current_breeder)
    return animal_service.create_note_for_animal(db=db, breeder_id=breeder_id, animal_db_id=animal_db_id, payload=payload)

# Delete an animal record (Note: Restricted if the animal has offspring in the registry)
@router.delete("/{breeder_id}/animals/{animal_db_id}", status_code=status.HTTP_204_NO_CONTENT)

# Removes the selected animal for breeder record from storage.
def delete_animal_for_breeder(
    breeder_id: int,
    animal_db_id: int,
    db: Session = Depends(database.get_db),
    current_breeder: models.Breeder = Depends(get_current_breeder),
):
    animal_service.ensure_breeder_access(breeder_id, current_breeder)
    audit_service.record_action(db, actor_type="breeder", actor_id=current_breeder.id, actor_name=current_breeder.full_name, action="DELETE_ANIMAL", target_type="Animal", target_id=animal_db_id)
    animal_service.delete_animal_for_breeder(db=db, breeder_id=breeder_id, animal_db_id=animal_db_id)
    db.commit()

# List all breeding events (services, pregnancies, births) for the breeder
@router.get("/{breeder_id}/breeding-events", response_model=List[schemas.BreedingEventResponse])

# Retrieves breeder breeding events records from the database.
def get_breeder_breeding_events(
    breeder_id: int,
    db: Session = Depends(database.get_db),
    current_breeder: models.Breeder = Depends(get_current_breeder),
):
    animal_service.ensure_breeder_access(breeder_id, current_breeder)
    return crud.get_breeding_events_by_breeder(db, breeder_id=breeder_id)

# Log a new breeding service or observed heat
@router.post("/{breeder_id}/breeding-events", response_model=schemas.BreedingEventResponse, status_code=status.HTTP_201_CREATED)

# Creates and stores a new breeding event for breeder record.
def create_breeding_event_for_breeder(
    breeder_id: int,
    breeding_event: schemas.BreedingEventCreate,
    db: Session = Depends(database.get_db),
    current_breeder: models.Breeder = Depends(get_current_breeder),
):
    animal_service.ensure_breeder_access(breeder_id, current_breeder)
    created = breeding_service.create_breeding_event_for_breeder(db=db, breeder_id=breeder_id, payload=breeding_event)
    audit_service.record_action(db, actor_type="breeder", actor_id=current_breeder.id, actor_name=current_breeder.full_name, action="CREATE_BREEDING_EVENT", target_type="BreedingEvent", target_id=created.id, detail={"status": created.status})
    db.commit(); db.refresh(created)
    return created

# Update status of a breeding event (e.g., mark as confirmed pregnant)
@router.patch("/{breeder_id}/breeding-events/{event_id}", response_model=schemas.BreedingEventResponse)

# Updates an existing breeding event for breeder record with validated values.
def update_breeding_event_for_breeder(
    breeder_id: int,
    event_id: int,
    breeding_event: schemas.BreedingEventUpdate,
    db: Session = Depends(database.get_db),
    current_breeder: models.Breeder = Depends(get_current_breeder),
):
    animal_service.ensure_breeder_access(breeder_id, current_breeder)
    updated = breeding_service.update_breeding_event_for_breeder(db=db, breeder_id=breeder_id, event_id=event_id, payload=breeding_event)
    audit_service.record_action(db, actor_type="breeder", actor_id=current_breeder.id, actor_name=current_breeder.full_name, action="UPDATE_BREEDING_EVENT", target_type="BreedingEvent", target_id=updated.id, detail={"status": updated.status, "outcome": updated.outcome})
    db.commit(); db.refresh(updated)
    return updated

# Get details for one specific breeding event
@router.get("/{breeder_id}/breeding-events/{event_id}", response_model=schemas.BreedingEventResponse)

# Retrieves breeding event for breeder records from the database.
def get_breeding_event_for_breeder(
    breeder_id: int,
    event_id: int,
    db: Session = Depends(database.get_db),
    current_breeder: models.Breeder = Depends(get_current_breeder),
):
    animal_service.ensure_breeder_access(breeder_id, current_breeder)
    return breeding_service.get_owned_breeding_event_or_404(db, breeder_id=breeder_id, event_id=event_id)

# Get high-level analytics for breeding success rates
@router.get("/{breeder_id}/breeding-analytics")

# Retrieves breeding analytics for breeder records from the database.
def get_breeding_analytics_for_breeder(
    breeder_id: int,
    db: Session = Depends(database.get_db),
    current_breeder: models.Breeder = Depends(get_current_breeder),
):
    animal_service.ensure_breeder_access(breeder_id, current_breeder)
    return breeding_service.get_breeding_analytics(db=db, breeder_id=breeder_id)

# Get time-sensitive notifications (e.g., expected birth dates)
@router.get("/{breeder_id}/breeding-alerts")

# Retrieves breeding alerts for breeder records from the database.
def get_breeding_alerts_for_breeder(
    breeder_id: int,
    db: Session = Depends(database.get_db),
    current_breeder: models.Breeder = Depends(get_current_breeder),
):
    animal_service.ensure_breeder_access(breeder_id, current_breeder)
    return breeding_service.get_breeding_alerts(db=db, breeder_id=breeder_id)
