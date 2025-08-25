# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from Backend.app import models, database
from Backend.app.routes import breeders, admin, public

# Load environment variables from .env file
load_dotenv()

# Create database tables
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Animal Breed Registry API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:8000", "http://127.0.0.1:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(breeders.router)
app.include_router(admin.router)
app.include_router(public.router)

# Mount the 'Frontend' directory to serve static files like CSS, JS, images
# This line is not strictly necessary for just index.html, but is good practice
app.mount("/Frontend", StaticFiles(directory="Frontend"), name="Frontend")

@app.get("/", include_in_schema=False)
async def read_index():
    return FileResponse('Frontend/index.html')