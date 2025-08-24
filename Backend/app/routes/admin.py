# backend/app/routes/admins.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from .. import models, schemas, database
from ..utils import get_password_hash, verify_password

router = APIRouter(prefix="/api/admins", tags=["admins"])

@router.post("/create", status_code=status.HTTP_201_CREATED)
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
    return {"id": admin.id, "email": admin.email}

@router.post("/login")
def admin_login(login_data: schemas.AdminLogin, db: Session = Depends(database.get_db)):
    admin = db.query(models.Admin).filter(models.Admin.email == login_data.email).first()
    if not admin or not verify_password(login_data.password, admin.password_hash):
        raise HTTPException(status_code=401, detail="Invalid admin credentials")
    
    return {
        "success": True, 
        "admin_id": admin.id,
        "email": admin.email,
        "full_name": admin.full_name
    }

@router.get("/applications")
def list_pending_applications(db: Session = Depends(database.get_db)):
    pending = db.query(models.Breeder).filter(models.Breeder.status == "pending").all()
    return pending

@router.post("/approve/{breeder_id}")
def approve_breeder(breeder_id: int, db: Session = Depends(database.get_db)):
    # FIXME: This endpoint is insecure. It needs an authenticated admin user.
    # The `admin_id` should be retrieved from a dependency that manages authentication,
    # not passed as a parameter. For now, we'll simulate getting a current admin.
    # For example: current_admin: models.Admin = Depends(get_current_admin_user)
    # Let's assume admin with ID 1 is doing the approval for demonstration.
    
    admin_id = 1 
    admin = db.query(models.Admin).filter(models.Admin.id == admin_id).first()
    if not admin:
        raise HTTPException(status_code=500, detail="Approving admin not found. Configure system admins.")

    breeder = db.query(models.Breeder).get(breeder_id)
    if not breeder:
        raise HTTPException(status_code=404, detail="Breeder not found")
    breeder.status = "approved"
    breeder.approved_by = admin.id
    breeder.approved_at = datetime.utcnow()
    db.commit()
    db.refresh(breeder)
    return {"message": "approved", "breeder_id": breeder.id}

@router.post("/reject/{breeder_id}")
def reject_breeder(breeder_id: int, db: Session = Depends(database.get_db)):
    
    admin_id = 1 
    admin = db.query(models.Admin).filter(models.Admin.id == admin_id).first()
    if not admin:
        raise HTTPException(status_code=500, detail="Rejecting admin not found. Configure system admins.")

    breeder = db.query(models.Breeder).get(breeder_id)
    if not breeder:
        raise HTTPException(status_code=404, detail="Breeder not found")
    
    # Mark as rejected instead of deleting
    breeder.status = "rejected"
    breeder.rejected_by = admin.id
    breeder.rejected_at = datetime.utcnow()
    db.commit()
    db.refresh(breeder)
    return {"message": "application rejected", "breeder_id": breeder.id}

@router.delete("/breeders/{breeder_id}")
def delete_breeder(breeder_id: int, db: Session = Depends(database.get_db)):
    # FIXME: This endpoint is insecure. It needs an authenticated admin user.
    admin_id = 1 
    admin = db.query(models.Admin).filter(models.Admin.id == admin_id).first()
    if not admin:
        raise HTTPException(status_code=500, detail="Admin not found. Configure system admins.")

    breeder = db.query(models.Breeder).get(breeder_id)
    if not breeder:
        raise HTTPException(status_code=404, detail="Breeder not found")
    
    # Check if breeder has any animals registered
    animal_count = db.query(models.Animal).filter(models.Animal.breeder_id == breeder_id).count()
    if animal_count > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot delete breeder. {animal_count} animals are registered under this breeder."
        )
    
    db.delete(breeder)
    db.commit()
    return {"message": "breeder deleted successfully", "breeder_id": breeder_id}

@router.get("/approved-breeders")
def get_approved_breeders(db: Session = Depends(database.get_db)):
    approved_breeders = db.query(models.Breeder).filter(models.Breeder.status == "approved").all()
    return approved_breeders

@router.get("/rejected-applications")
def get_rejected_applications(db: Session = Depends(database.get_db)):
    rejected_applications = db.query(models.Breeder).filter(models.Breeder.status == "rejected").all()
    return rejected_applications

@router.get("/stats")
def get_admin_stats(db: Session = Depends(database.get_db)):
    total_breeders = db.query(models.Breeder).count()
    pending_applications = db.query(models.Breeder).filter(models.Breeder.status == "pending").count()
    total_animals = db.query(models.Animal).count()
    
    return {
        "total_breeders": total_breeders,
        "pending_applications": pending_applications,
        "total_animals": total_animals
    }
