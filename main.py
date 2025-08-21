# backend/app/main.py
from fastapi import FastAPI
from dotenv import load_dotenv
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from Backend.appl import models, database
from Backend.appl.routes import breeders, admin

# Load environment variables from .env file
load_dotenv()

# Create database tables
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Blockchain Animal Breed Registry API")

app.include_router(breeders.router)
app.include_router(admin.router)

# Mount the 'Frontend' directory to serve static files like CSS, JS, images
# This line is not strictly necessary for just index.html, but is good practice
app.mount("/Frontend", StaticFiles(directory="Frontend"), name="Frontend")

@app.get("/", include_in_schema=False)
async def read_index():
    return FileResponse('Frontend/index.html')
