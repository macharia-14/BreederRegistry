# backend/app/routes/admins.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from .. import models, schemas, database
from ..utils import get_password_hash

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
    # In a real application, REMOVE the hardcoded admin_id.
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
