# Backend/app/routes/admin.py: contains backend logic for the Animal Breed Registry System.
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import Optional
import json
from .. import models, schemas, database
from ..models import log_action
from ..utils.core import get_password_hash, verify_password, create_access_token
from ..utils.response import success
from ..auth import get_current_admin
from ..email_utils import send_application_approved_email, send_application_rejected_email
router = APIRouter(prefix="/api/admins", tags=["admins"])

# Create a new system administrator account
@router.post("/create", status_code=status.HTTP_201_CREATED)

# Creates and stores a new admin record.
def create_admin(a: schemas.AdminCreate, db: Session = Depends(database.get_db)):
    if db.query(models.Admin).filter(models.Admin.email == a.email).first():
        raise HTTPException(status_code=400, detail="Admin email already exists")
    admin = models.Admin(
        full_name=a.full_name,
        email=a.email,
        password_hash=get_password_hash(a.password)
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    return success({"id": admin.id, "email": admin.email})

# Authenticate an admin and return a signed JWT access token
@router.post("/login")

# Handles admin login logic for this module.
def admin_login(login_data: schemas.AdminLogin, db: Session = Depends(database.get_db)):
    identifier = (login_data.email or login_data.identifier or "").strip().lower()
    if not identifier or not login_data.password:
        raise HTTPException(status_code=400, detail="Email and password are required")
    admin = db.query(models.Admin).filter(models.Admin.email == identifier).first()
    if not admin or not verify_password(login_data.password, admin.password_hash):
        raise HTTPException(status_code=401, detail="Invalid admin credentials")
    token = create_access_token({"sub": str(admin.id), "role": "admin"})
    return {
        "success": True,
        "access_token": token,
        "role": "admin",
        "token_type": "bearer",
        "admin_id": admin.id,
        "email": admin.email,
        "full_name": admin.full_name,
    }


# Retrieve a list of all breeder applications currently awaiting approval
@router.get("/applications")

# Handles list pending applications logic for this module.
def list_pending_applications(
    db: Session = Depends(database.get_db),
    current_admin: models.Admin = Depends(get_current_admin),
):
    return success(db.query(models.Breeder).filter(models.Breeder.status == "pending").all())

# Get detailed information for a specific breeder application by ID
@router.get("/applications/{breeder_id}")

# Retrieves application detail records from the database.
def get_application_detail(
    breeder_id: int,
    db: Session = Depends(database.get_db),
    current_admin: models.Admin = Depends(get_current_admin),
):
    breeder = db.query(models.Breeder).filter(models.Breeder.id == breeder_id).first()
    if not breeder:
        raise HTTPException(status_code=404, detail="Application not found")
    return success(breeder)

# Approve a pending breeder application, record the auditor, and notify the user
@router.post("/approve/{breeder_id}")

# Handles approve breeder logic for this module.
def approve_breeder(
    breeder_id: int,
    db: Session = Depends(database.get_db),
    current_admin: models.Admin = Depends(get_current_admin),
):
    breeder = db.query(models.Breeder).filter(models.Breeder.id == breeder_id).first()
    if not breeder:
        raise HTTPException(status_code=404, detail="Breeder not found")
    if breeder.status == "approved":
        raise HTTPException(status_code=400, detail="Breeder is already approved")
    breeder.status = "approved"
    breeder.approved_by = current_admin.id
    breeder.approved_at = datetime.now(timezone.utc)

    # Log the administrative action
    log_action(
        db,
        actor_type="admin",
        actor_id=current_admin.id,
        actor_name=current_admin.full_name,
        action="APPROVE_BREEDER",
        target_type="Breeder",
        target_id=breeder.id,
        detail=json.dumps({
            "breeder_name": breeder.full_name,
            "email": breeder.email,
            "farm_name": breeder.farm_name,
        }),
    )
    db.commit()
    db.refresh(breeder)

    # Notify the breeder via email
    send_application_approved_email(
        to_email=breeder.email,
        breeder_name=breeder.full_name,
        farm_name=breeder.farm_name or "your farm",
    )
    return success({"message": "approved", "breeder_id": breeder.id})

# Reject a pending breeder application, record the auditor, and notify the user
@router.post("/reject/{breeder_id}")

# Handles reject breeder logic for this module.
def reject_breeder(
    breeder_id: int,
    db: Session = Depends(database.get_db),
    current_admin: models.Admin = Depends(get_current_admin),
):
    breeder = db.query(models.Breeder).filter(models.Breeder.id == breeder_id).first()
    if not breeder:
        raise HTTPException(status_code=404, detail="Breeder not found")
    if breeder.status == "rejected":
        raise HTTPException(status_code=400, detail="Application is already rejected")
    breeder.status = "rejected"
    breeder.rejected_by = current_admin.id
    breeder.rejected_at = datetime.now(timezone.utc)
    log_action(
        db,
        actor_type="admin",
        actor_id=current_admin.id,
        actor_name=current_admin.full_name,
        action="REJECT_BREEDER",
        target_type="Breeder",
        target_id=breeder.id,
        detail=json.dumps({
            "breeder_name": breeder.full_name,
            "email": breeder.email,
        }),
    )
    db.commit()
    db.refresh(breeder)
    send_application_rejected_email(
        to_email=breeder.email,
        breeder_name=breeder.full_name,
    )
    return success({"message": "application rejected", "breeder_id": breeder.id})

# Remove a breeder account from the system, provided they have no registered animals
@router.delete("/breeders/{breeder_id}")

# Removes the selected breeder record from storage.
def delete_breeder(
    breeder_id: int,
    db: Session = Depends(database.get_db),
    current_admin: models.Admin = Depends(get_current_admin),
):
    breeder = db.query(models.Breeder).filter(models.Breeder.id == breeder_id).first()
    if not breeder:
        raise HTTPException(status_code=404, detail="Breeder not found")
    
    # Prevent deletion if the breeder still has animals registered
    animal_count = db.query(models.Animal).filter(models.Animal.breeder_id == breeder_id).count()
    if animal_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete breeder. {animal_count} animals are registered under this breeder.",
        )
    log_action(
        db,
        actor_type="admin",
        actor_id=current_admin.id,
        actor_name=current_admin.full_name,
        action="DELETE_BREEDER",
        target_type="Breeder",
        target_id=breeder.id,
        detail=json.dumps({
            "breeder_name": breeder.full_name,
            "email": breeder.email,
            "national_id": breeder.national_id,
        }),
    )
    db.delete(breeder)
    db.commit()
    return success({"message": "breeder deleted successfully", "breeder_id": breeder_id})

# Get a list of all breeders with an 'approved' status
@router.get("/approved-breeders")

# Retrieves approved breeders records from the database.
def get_approved_breeders(
    db: Session = Depends(database.get_db),
    current_admin: models.Admin = Depends(get_current_admin),
):
    return success(db.query(models.Breeder).filter(models.Breeder.status == "approved").all())

# Get a list of all breeder applications that have been 'rejected'
@router.get("/rejected-applications")

# Retrieves rejected applications records from the database.
def get_rejected_applications(
    db: Session = Depends(database.get_db),
    current_admin: models.Admin = Depends(get_current_admin),
):
    return success(db.query(models.Breeder).filter(models.Breeder.status == "rejected").all())

# Global view of all animals registered in the system, including breeder names
@router.get("/animals")

# Retrieves all animals records from the database.
def get_all_animals(
    db: Session = Depends(database.get_db),
    current_admin: models.Admin = Depends(get_current_admin),
):
    animals = db.query(models.Animal).all()
    result = []
    for animal in animals:

        # N+1 query optimization potential here; consider joinedload
        breeder = db.query(models.Breeder).filter(models.Breeder.id == animal.breeder_id).first()
        result.append({
            "id": animal.id,
            "animal_id": animal.animal_id,
            "animal_type": animal.animal_type,
            "breed": animal.breed,
            "gender": animal.gender,
            "date_of_birth": animal.date_of_birth,
            "breeder_id": animal.breeder_id,
            "breeder_name": breeder.farm_name if breeder else "Unknown",
        })
    return success(result) 

# Aggregated statistics for the admin dashboard overview
@router.get("/stats")

# Retrieves admin stats records from the database.
def get_admin_stats(
    db: Session = Depends(database.get_db),
    current_admin: models.Admin = Depends(get_current_admin),
):
    total_breeders = db.query(models.Breeder).count()
    pending_applications = db.query(models.Breeder).filter(models.Breeder.status == "pending").count()
    approved_breeders = db.query(models.Breeder).filter(models.Breeder.status == "approved").count()
    total_animals = db.query(models.Animal).count()
    return success({
        "total_breeders": total_breeders,
        "pending_applications": pending_applications,
        "approved_breeders": approved_breeders,
        "total_animals": total_animals,
    })

# Paginated access to system-wide audit logs with optional filters
@router.get("/audit-logs")

# Retrieves audit logs records from the database.
def get_audit_logs(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    action: Optional[str] = Query(default=None, description="Filter by action, e.g. APPROVE_BREEDER"),
    actor_id: Optional[int] = Query(default=None, description="Filter by admin/breeder ID"),
    db: Session = Depends(database.get_db),
    current_admin: models.Admin = Depends(get_current_admin),
):
    query = db.query(models.AuditLog)
    if action:
        query = query.filter(models.AuditLog.action == action.upper())
    if actor_id is not None:
        query = query.filter(models.AuditLog.actor_id == actor_id)
    total = query.count()
    logs = (
        query
        .order_by(models.AuditLog.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return success({
        "total": total,
        "skip": skip,
        "limit": limit,
        "logs": [
            {
                "id":          log.id,
                "actor_type":  log.actor_type,
                "actor_id":    log.actor_id,
                "actor_name":  log.actor_name,
                "action":      log.action,
                "target_type": log.target_type,
                "target_id":   log.target_id,
                "detail":      log.detail,
                "created_at":  str(log.created_at),
            }
            for log in logs
        ],
    })
