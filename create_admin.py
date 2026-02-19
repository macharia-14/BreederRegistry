import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), "Backend"))

from app.database import SessionLocal
from app.models import Admin
from passlib.context import CryptContext

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_admin():
    db = SessionLocal()
    try:
        # Check if admin already exists
        existing = db.query(Admin).filter(Admin.email == "admin@breedery.com").first()
        if existing:
            print("❌ Admin already exists!")
            return

        admin = Admin(
            full_name="Super Admin",
            email="admin@breedery.com",
            password_hash=pwd_ctx.hash("Admin1234!")
        )
        db.add(admin)
        db.commit()
        print("✅ Admin created successfully!")
        print("   Email: admin@breedery.com")
        print("   Password: Admin1234!")
    finally:
        db.close()

create_admin()