# Animal Breed Registry System - Comprehensive Documentation

## Project Overview
A full-stack web application for managing animal breeding records with verified breeder identities. Built with FastAPI backend and vanilla JavaScript frontend.

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Backend Structure](#backend-structure)
3. [Database Models](#database-models)
4. [API Endpoints](#api-endpoints)
5. [Frontend Structure](#frontend-structure)
6. [Setup Instructions](#setup-instructions)
7. [Code Examples](#code-examples)
8. [Security Features](#security-features)
9. [Future Enhancements](#future-enhancements)

## Architecture Overview

```
Animal Breed Registry System
├── Backend/ (FastAPI)
│   ├── app/
│   │   ├── models.py      # SQLAlchemy models
│   │   ├── schemas.py     # Pydantic schemas
│   │   ├── crud.py        # Database operations
│   │   ├── utils.py       # Utility functions
│   │   ├── database.py    # Database configuration
│   │   └── routes/        # API endpoints
│   └── main.py            # FastAPI application
├── Frontend/ (HTML/CSS/JS)
│   ├── index.html         # Landing page
│   ├── login.html         # Login page
│   ├── register.html      # Registration page
│   ├── lineage_search.html # Public lineage search
│   ├── admin/             # Admin dashboard
│   ├── breeders/          # Breeder dashboard
│   └── js/                # JavaScript files
└── requirements.txt        # Python dependencies
```

## Backend Structure

### Main Application (`Backend/main.py`)

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from fastapi.staticfiles import StaticFiles

from Backend.app import models, database
from Backend.app.routes import breeders, admin, public

# Load environment variables
load_dotenv()

# Create database tables
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Animal Breed Registry API")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(breeders.router)
app.include_router(admin.router)
app.include_router(public.router)

# Serve static files
app.mount("/", StaticFiles(directory="Frontend", html=True), name="static")
```

### Database Configuration (`Backend/app/database.py`)

```python
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("❌ DATABASE_URL is not set in .env file")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

## Database Models

### Breeder Model (`Backend/app/models.py`)

```python
class Breeder(Base):
    __tablename__ = "breeders"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(255), nullable=False)
    national_id = Column(String(100), nullable=False, unique=True, index=True)
    animal_type = Column(String(50), nullable=False)  # cattle, sheep, goat, dog, etc.
    farm_name = Column(String(255), nullable=True)
    farm_prefix = Column(String(100), nullable=True)
    farm_location = Column(String(255), nullable=False)
    county = Column(String(100), nullable=True)
    phone = Column(String(50), nullable=False)
    email = Column(String(255), nullable=False, unique=True, index=True)
    password_hash = Column(String(255), nullable=False)
    status = Column(String(50), server_default="pending")  # pending | approved | rejected
    approved_by = Column(Integer, ForeignKey("admins.id"), nullable=True)
    approved_at = Column(TIMESTAMP)
    created_at = Column(TIMESTAMP, server_default=text("CURRENT_TIMESTAMP"))
    role = Column(String(50), server_default="breeder")
    documents = Column(String(500), nullable=True)

    approved_by_admin = relationship("Admin", backref="approved_breeders")
    animals = relationship("Animal", back_populates="breeder")
    breeding_events = relationship("BreedingEvent", back_populates="breeder")
```

### Animal Model

```python
class Animal(Base):
    __tablename__ = "animals"

    id = Column(Integer, primary_key=True, index=True)
    animal_id = Column(String(50), unique=True, index=True, nullable=False)
    animal_type = Column(String(50), nullable=False)
    breed = Column(String(100), nullable=False)
    gender = Column(String(10), nullable=False)  # male, female
    date_of_birth = Column(Date, nullable=False)
    sire_id = Column(Integer, ForeignKey("animals.id"), nullable=True)
    dam_id = Column(Integer, ForeignKey("animals.id"), nullable=True)
    breeder_id = Column(Integer, ForeignKey("breeders.id"), nullable=False)
    created_at = Column(TIMESTAMP, server_default=text("CURRENT_TIMESTAMP"))

    sire = relationship("Animal", foreign_keys=[sire_id], remote_side=[id])
    dam = relationship("Animal", foreign_keys=[dam_id], remote_side=[id])
    breeder = relationship("Breeder", back_populates="animals")
```

## API Endpoints

### Breeder Routes (`Backend/app/routes/breeders.py`)

```python
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

    # Create new breeder
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
        documents=getattr(b, 'documents', None)
    )
    
    try:
        db.add(new_b)
        db.commit()
        db.refresh(new_b)
        return new_b
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
```

### Admin Routes (`Backend/app/routes/admin.py`)

```python
@router.get("/applications")
def list_pending_applications(db: Session = Depends(database.get_db)):
    pending = db.query(models.Breeder).filter(models.Breeder.status == "pending").all()
    return pending

@router.post("/approve/{breeder_id}")
def approve_breeder(breeder_id: int, db: Session = Depends(database.get_db)):
    admin_id = 1  # TODO: Replace with authenticated admin
    admin = db.query(models.Admin).filter(models.Admin.id == admin_id).first()
    if not admin:
        raise HTTPException(status_code=500, detail="Approving admin not found")

    breeder = db.query(models.Breeder).get(breeder_id)
    if not breeder:
        raise HTTPException(status_code=404, detail="Breeder not found")
    
    breeder.status = "approved"
    breeder.approved_by = admin.id
    breeder.approved_at = datetime.utcnow()
    db.commit()
    db.refresh(breeder)
    return {"message": "approved", "breeder_id": breeder.id}
```

## Frontend Structure

### Landing Page (`Frontend/index.html`)

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Animal Breed Registry System</title>
    <link rel="stylesheet" href="css/style.css" />
</head>
<body>
    <div id="landing-page" class="page active">
        <header class="hero">
            <div class="container">
                <h1 class="hero-title">Animal Breed Registry System</h1>
                <p class="hero-tagline">Breed records with verified farmer identities.</p>
                <div class="hero-buttons">
                    <a href="register.html" class="btn btn-primary">Register as Breeder</a>
                    <a href="login.html" class="btn btn-secondary">Login</a>
                </div>
            </div>
        </header>
    </div>
    <script src="js/script.js"></script>
</body>
</html>
```

### JavaScript Functionality (`Frontend/js/script.js`)

```javascript
// Registration Form Handling
const registerForm = document.getElementById('register-form');
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(registerForm);
    const data = {};
    formData.forEach((value, key) => {
      data[key] = value;
    });
    
    try {
      const res = await fetch('/api/breeders/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      const result = await res.json();
      if (!res.ok) {
        alert(result.detail || 'Registration failed');
      } else {
        alert(`Registration successful!\nFarm prefix: ${result.farm_prefix}`);
        registerForm.reset();
      }
    } catch (err) {
      alert('Network error. Please try again.');
    }
  });
}
```

## Setup Instructions

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Configure Environment Variables
Create a `.env` file:
```env
DATABASE_URL=postgresql://username:password@localhost:5432/animal_registry
SECRET_KEY=your-secret-key-here
```

### 3. Database Setup
```sql
-- Example PostgreSQL setup
CREATE DATABASE animal_registry;
```

### 4. Run the Application
```bash
uvicorn Backend.main:app --reload
```

### 5. Access the Application
Open `http://localhost:8000` in your browser.

## Code Examples

### Password Hashing Utility (`Backend/app/utils.py`)

```python
from passlib.context import CryptContext

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    return pwd_ctx.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_ctx.verify(plain, hashed)
```

### Animal ID Generation

```python
def generate_animal_id(db: Session, farm_prefix: str) -> str:
    from .models import Animal
    
    latest_animal = db.query(Animal).filter(
        Animal.animal_id.like(f"{farm_prefix}-%")
    ).order_by(Animal.id.desc()).first()
    
    if latest_animal:
        try:
            last_number = int(latest_animal.animal_id.split('-')[-1])
            next_number = last_number + 1
        except (ValueError, IndexError):
            next_number = 1
    else:
        next_number = 1
    
    return f"{farm_prefix}-{next_number:03d}"
```

## Security Features

1. **Password Hashing**: Uses bcrypt for secure password storage
2. **Input Validation**: Pydantic schemas validate all incoming data
3. **SQL Injection Protection**: SQLAlchemy ORM prevents injection attacks
4. **CORS Configuration**: Proper CORS setup for frontend-backend communication

## Future Enhancements

1. **JWT Authentication**: Implement proper token-based authentication
2. **Email Verification**: Add email confirmation for registrations
3. **File Uploads**: Support for document uploads and storage
4. **Real-time Updates**: WebSocket integration for live updates
5. **Mobile App**: React Native or Flutter mobile application
6. **Blockchain Integration**: Store lineage data on blockchain for immutability

## Troubleshooting

### Common Issues:
1. **Database Connection**: Ensure DATABASE_URL is correctly set in .env
2. **CORS Errors**: Check allow_origins configuration in main.py
3. **Port Conflicts**: Use different port if 8000 is occupied

### Debug Mode:
```bash
uvicorn Backend.main:app --reload --log-level debug
```

## Support
For technical support, contact: machariaelick1454@gmail.com

---

This documentation provides a comprehensive overview of the Animal Breed Registry System, including architecture, code examples, setup instructions, and future enhancement plans.

Detailed Breakdown of the Documentation
1. Architecture Overview
The architecture of the Animal Breed Registry System is designed to separate concerns between the frontend and backend, allowing for a clean and maintainable codebase.

Structure:

Animal Breed Registry System
├── Backend/ (FastAPI)
│   ├── app/                # Contains all backend logic
│   │   ├── models.py       # SQLAlchemy models defining the database structure
│   │   ├── schemas.py      # Pydantic schemas for data validation
│   │   ├── crud.py         # Functions for database operations (Create, Read, Update, Delete)
│   │   ├── utils.py        # Utility functions for common tasks
│   │   ├── database.py     # Database connection and session management
│   │   └── routes/         # API endpoints organized by functionality
│   └── main.py             # Entry point for the FastAPI application
├── Frontend/ (HTML/CSS/JS) # User interface files
│   ├── index.html          # Landing page for the application
│   ├── login.html          # Login page for breeders and admins
│   ├── register.html       # Registration page for new breeders
│   ├── lineage_search.html  # Page for searching animal lineage
│   ├── admin/              # Admin dashboard files
│   ├── breeders/           # Breeder dashboard files
│   └── js/                 # JavaScript files for frontend functionality
└── requirements.txt         # Python dependencies for the backend
2. Backend Structure
The backend is built using FastAPI, which is a modern web framework for building APIs with Python. It is designed for high performance and ease of use.

Main Application (Backend/main.py)
This file initializes the FastAPI application and sets up middleware, routes, and database connections.


from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from fastapi.staticfiles import StaticFiles

# Importing models and routes
from Backend.app import models, database
from Backend.app.routes import breeders, admin, public

# Load environment variables
load_dotenv()

# Create database tables
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Animal Breed Registry API")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers for different functionalities
app.include_router(breeders.router)
app.include_router(admin.router)
app.include_router(public.router)

# Serve static files from the frontend directory
app.mount("/", StaticFiles(directory="Frontend", html=True), name="static")
Key Points:
CORS Middleware: Allows cross-origin requests from specified domains, which is essential for frontend-backend communication.
Static Files: Serves the frontend files directly from the backend, making it easier to deploy as a single application.
3. Database Models
The database models define the structure of the data stored in the database using SQLAlchemy.

Breeder Model (Backend/app/models.py)
This model represents a breeder in the system.


class Breeder(Base):
    __tablename__ = "breeders"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(255), nullable=False)
    national_id = Column(String(100), nullable=False, unique=True, index=True)
    animal_type = Column(String(50), nullable=False)  # e.g., cattle, sheep
    farm_name = Column(String(255), nullable=True)
    farm_prefix = Column(String(100), nullable=True)
    farm_location = Column(String(255), nullable=False)
    county = Column(String(100), nullable=True)
    phone = Column(String(50), nullable=False)
    email = Column(String(255), nullable=False, unique=True, index=True)
    password_hash = Column(String(255), nullable=False)
    status = Column(String(50), server_default="pending")  # pending | approved | rejected
    approved_by = Column(Integer, ForeignKey("admins.id"), nullable=True)
    approved_at = Column(TIMESTAMP)
    created_at = Column(TIMESTAMP, server_default=text("CURRENT_TIMESTAMP"))
    role = Column(String(50), server_default="breeder")
    documents = Column(String(500), nullable=True)  # For storing document paths

    approved_by_admin = relationship("Admin", backref="approved_breeders")
    animals = relationship("Animal", back_populates="breeder")
    breeding_events = relationship("BreedingEvent", back_populates="breeder")
Key Points:
Relationships: Defines how breeders relate to animals and breeding events, allowing for easy data retrieval.
Field Types: Uses SQLAlchemy types to enforce data integrity (e.g., String, Integer, TIMESTAMP).
4. API Endpoints
The API endpoints define how the frontend interacts with the backend.

Breeder Routes (Backend/app/routes/breeders.py)
This file contains endpoints for breeder-related actions.


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

    # Create new breeder
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
        documents=getattr(b, 'documents', None)
    )
    
    try:
        db.add(new_b)
        db.commit()
        db.refresh(new_b)
        return new_b
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
Key Points:
Error Handling: Uses HTTP exceptions to provide meaningful error messages to the client.
Data Validation: Ensures that the data being processed meets the required criteria before proceeding.
5. Frontend Structure
The frontend is built using standard web technologies (HTML, CSS, JavaScript) and interacts with the backend through API calls.

Landing Page (Frontend/index.html)
This is the entry point for users to access the application.


<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Animal Breed Registry System</title>
    <link rel="stylesheet" href="css/style.css" />
</head>
<body>
    <div id="landing-page" class="page active">
        <header class="hero">
            <div class="container">
                <h1 class="hero-title">Animal Breed Registry System</h1>
                <p class="hero-tagline">Breed records with verified farmer identities.</p>
                <div class="hero-buttons">
                    <a href="register.html" class="btn btn-primary">Register as Breeder</a>
                    <a href="login.html" class="btn btn-secondary">Login</a>
                </div>
            </div>
        </header>
    </div>
    <script src="js/script.js"></script>
</body>
</html>
Key Points:
Responsive Design: The layout adapts to different screen sizes, ensuring usability on mobile devices.
Dynamic Content: JavaScript is used to handle user interactions and API calls.
6. Setup Instructions
To set up the project, follow these steps:

Install Dependencies:


pip install -r requirements.txt
Configure Environment Variables:
Create a .env file with the following content:


DATABASE_URL=postgresql://username:password@localhost:5432/animal_registry
SECRET_KEY=your-secret-key-here
Run the Application:


uvicorn Backend.main:app --reload
Access the Application:
Open http://localhost:8000 in your browser.

7. Code Examples
Password Hashing Utility (Backend/app/utils.py)
This utility handles password hashing and verification.


from passlib.context import CryptContext

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    return pwd_ctx.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_ctx.verify(plain, hashed)
8. Security Features
Password Hashing: Uses bcrypt for secure password storage.
Input Validation: Pydantic schemas validate all incoming data.
CORS Configuration: Proper CORS setup for frontend-backend communication.
9. Future Enhancements
JWT Authentication: Implement token-based authentication for secure access.
Email Verification: Add email confirmation for registrations.
Real-time Updates: WebSocket integration for live updates.
Troubleshooting
Common Issues:
Database Connection: Ensure DATABASE_URL is correctly set in .env.
CORS Errors: Check allow_origins configuration in main.py.
This detailed breakdown should help you improve your code knowledge and understanding of the system. If you have any specific areas you'd like to dive deeper into or if you have further questions, please let me know!
