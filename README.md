# BreederRegistry

A web application for registering and managing livestock breeders and their animals. Built with **FastAPI** (Python) + **PostgreSQL** backend and a vanilla HTML/CSS/JS frontend.

---

## Project Structure

```
BreederRegistry/
├── Backend/
│   └── app/
│       ├── auth.py          # JWT authentication dependencies
│       ├── crud.py          # Database CRUD operations
│       ├── database.py      # SQLAlchemy setup
│       ├── models.py        # ORM models
│       ├── schemas.py       # Pydantic request/response schemas
│       ├── utils.py         # Password hashing, JWT helpers, ID generators
│       └── routes/
│           ├── admin.py     # Admin-only endpoints (protected)
│           ├── breeders.py  # Breeder endpoints (protected)
│           └── public.py    # Public endpoints (no auth required)
├── Frontend/                # Static HTML/CSS/JS frontend
├── main.py                  # Application entry point
├── requirements.txt
├── .env.example             # Copy to .env and fill in your values
└── create_admin.py          # Script to seed initial admin user
```

---

## Setup

### 1. Clone & install dependencies

```bash
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure environment variables

```bash
cp .env.example .env
# Edit .env with your database URL and JWT secret
```

Generate a secure JWT secret:
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

### 3. Create the database

Make sure PostgreSQL is running, then:
```bash
# Tables are created automatically on first run via SQLAlchemy
```

### 4. Create the first admin user

```bash
python create_admin.py
```

### 5. Run the server

```bash
uvicorn main:app --reload
```

The app will be available at `http://localhost:8000`.
API docs (Swagger UI) at `http://localhost:8000/docs`.

---

## Authentication

The API uses **JWT Bearer tokens**.

1. Call `POST /api/admins/login` or `POST /api/breeders/login` to get a token.
2. Include the token in subsequent requests:
   ```
   Authorization: Bearer <your-token>
   ```

All admin endpoints and breeder data endpoints require a valid token. Public endpoints (`/api/public/...`) require no authentication.

---

## Key API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/breeders/register` | None | Register new breeder |
| POST | `/api/breeders/login` | None | Breeder login → JWT |
| GET | `/api/breeders/{id}/animals` | Breeder | List breeder's animals |
| POST | `/api/breeders/{id}/animals` | Breeder | Register new animal |
| POST | `/api/admins/login` | None | Admin login → JWT |
| GET | `/api/admins/applications` | Admin | Pending applications |
| POST | `/api/admins/approve/{id}` | Admin | Approve breeder |
| POST | `/api/admins/reject/{id}` | Admin | Reject breeder |
| GET | `/api/public/animals/breed/{breed}` | None | Public breed search |
| GET | `/api/public/animals/lineage/{id}` | None | Animal lineage lookup |
