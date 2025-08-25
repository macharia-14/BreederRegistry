import uvicorn
from fastapi import FastAPI
from fastapi.responses import FileResponse
import os

# Create a simple test app
app = FastAPI()

@app.get("/test")
async def test_endpoint():
    return {"message": "Test endpoint is working"}

@app.get("/", include_in_schema=False)
async def read_index():
    # Check if index.html exists
    index_path = 'Frontend/index.html'
    if os.path.exists(index_path):
        return FileResponse(index_path)
    else:
        return {"error": "index.html not found", "path": os.path.abspath(index_path)}

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
