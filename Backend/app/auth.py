# Backend/app/auth.py: contains backend logic for the Animal Breed Registry System.
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError
from sqlalchemy.orm import Session
from .utils.core import decode_access_token
from .database import get_db
from . import models

bearer_scheme = HTTPBearer()

# Internal helper for get token payload.
def _get_token_payload(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)) -> dict:
    """Extract and validate the JWT payload from the Authorization header."""

    try:
        return decode_access_token(credentials.credentials)

    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

# Retrieves current breeder records from the database.
def get_current_breeder(
    payload: dict = Depends(_get_token_payload),
    db: Session = Depends(get_db),

) -> models.Breeder:
    """FastAPI dependency: returns the authenticated Breeder or raises 401."""

    breeder_id = payload.get("sub")
    role = payload.get("role")

    if not breeder_id or role != "breeder":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated as breeder")

    breeder = db.query(models.Breeder).filter(models.Breeder.id == int(breeder_id)).first()

    if not breeder:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Breeder not found")
    return breeder

# Retrieves current admin records from the database.
def get_current_admin(
    payload: dict = Depends(_get_token_payload),
    db: Session = Depends(get_db),
) -> models.Admin:
    """FastAPI dependency: returns the authenticated Admin or raises 401."""

    admin_id = payload.get("sub")
    role = payload.get("role")

    if not admin_id or role != "admin":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated as admin")

    admin = db.query(models.Admin).filter(models.Admin.id == int(admin_id)).first()

    if not admin:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Admin not found")
    return admin
