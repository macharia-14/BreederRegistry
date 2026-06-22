# main.py: contains backend logic for the Animal Breed Registry System.
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
import os
from Backend.app import models, database
from Backend.app.routes import breeders, admin, public, genetics

load_dotenv()

models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Animal Breed Registry API", version="1.0.0")

@app.middleware("http")
# Handles security headers middleware logic for this module.
async def security_headers_middleware(request: Request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("X-XSS-Protection", "1; mode=block")

    if os.getenv("ENVIRONMENT", "development").lower() == "production":
        response.headers.setdefault(
            "Strict-Transport-Security",
            "max-age=31536000; includeSubDomains"
        )
    return response

ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000,http://localhost:8000,http://127.0.0.1:8000"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(breeders.router)
app.include_router(admin.router)
app.include_router(public.router)
app.include_router(genetics.router)

app.mount("/", StaticFiles(directory="Frontend", html=True), name="static")
