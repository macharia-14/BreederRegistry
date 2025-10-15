# Implementation Plan for Backend-Frontend Integration Improvements

## Phase 1: Authentication & Security Enhancements

### 1.1 JWT Token Implementation

**Backend Changes (Backend/app/utils.py)**:
```python
from datetime import datetime, timedelta
from jose import JWTError, jwt
from fastapi.security import OAuth2PasswordBearer
import os

# JWT Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/breeders/login")

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def verify_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None
```

**Backend Changes (Backend/app/routes/breeders.py)**:
```python
from ..utils import create_access_token, verify_token, oauth2_scheme
from fastapi import Depends, HTTPException

@router.post("/login")
def login(payload: schemas.BreederLogin, db: Session = Depends(database.get_db)):
    breeder = db.query(models.Breeder).filter(
        (models.Breeder.email == payload.identifier) | 
        (models.Breeder.national_id == payload.identifier)
    ).first()
    
    if not breeder or not verify_password(payload.password, breeder.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token = create_access_token(data={"sub": str(breeder.id)})
    return {"access_token": access_token, "token_type": "bearer", "breeder_id": breeder.id}

# Add token dependency for protected routes
async def get_current_breeder(token: str = Depends(oauth2_scheme), db: Session = Depends(database.get_db)):
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    breeder_id = payload.get("sub")
    breeder = db.query(models.Breeder).filter(models.Breeder.id == breeder_id).first()
    if not breeder:
        raise HTTPException(status_code=401, detail="Breeder not found")
    
    return breeder
```

**Frontend Changes (Frontend/breeders/js/script.js)**:
```javascript
// Update apiRequest function to include token
async function apiRequest(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...options.headers,
        },
        ...options,
    };
    
}

// Update login function
async function login(identifier, password) {
    try {
        const response = await apiRequest('/breeders/login', {
            method: 'POST',
            body: { identifier, password }
        });
        
        localStorage.setItem('token', response.access_token);
        localStorage.setItem('breeder', JSON.stringify({ breeder_id: response.breeder_id }));
        return response;
    } catch (error) {
        throw error;
    }
}
```

### 1.2 Token Refresh Mechanism

**Backend (new endpoint)**:
```python
@router.post("/refresh")
def refresh_token(current_breeder: models.Breeder = Depends(get_current_breeder)):
    new_token = create_access_token(data={"sub": str(current_breeder.id)})
    return {"access_token": new_token, "token_type": "bearer"}
```

**Frontend (token refresh utility)**:
```javascript
let refreshInProgress = false;

async function refreshToken() {
    if (refreshInProgress) return;
    refreshInProgress = true;
    
    try {
        const response = await fetch('/api/breeders/refresh', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('token', data.access_token);
            return data.access_token;
        }
    } catch (error) {
        console.error('Token refresh failed:', error);
        logout();
    } finally {
        refreshInProgress = false;
    }
}

// Enhanced apiRequest with token refresh
async function apiRequest(endpoint, options = {}) {
    let response = await fetchWithToken(endpoint, options);
    
    if (response.status === 401) {
        // Token expired, try to refresh
        const newToken = await refreshToken();
        if (newToken) {
            // Retry with new token
            response = await fetchWithToken(endpoint, options);
        }
    }
    
    return response;
}

async function fetchWithToken(endpoint, options) {
    const token = localStorage.getItem('token');
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...options.headers,
        },
        ...options,
    };
    
    return await fetch(`${API_BASE_URL}${endpoint}`, config);
}
```

## Phase 2: Error Handling Standardization

### 2.1 Consistent Error Responses

**Backend (Backend/app/utils.py)**:
```python
from pydantic import BaseModel
from typing import Optional, List

class ErrorDetail(BaseModel):
    field: Optional[str] = None
    message: str
    code: str

class ErrorResponse(BaseModel):
    detail: List[ErrorDetail]
    status_code: int

def create_error_response(
    message: str, 
    status_code: int = 400, 
    field: Optional[str] = None, 
    code: Optional[str] = None
):
    error_detail = ErrorDetail(
        field=field,
        message=message,
        code=code or f"ERR_{status_code}"
    )
    return ErrorResponse(detail=[error_detail], status_code=status_code)

# Custom exception handler
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content=create_error_response(
            exc.detail,
            exc.status_code
        ).dict()
    )
```

### 2.2 Frontend Error Handling

**Frontend (errorHandling.js)**:
```javascript
class ApiError extends Error {
    constructor(message, code, field = null) {
        super(message);
        this.name = 'ApiError';
        this.code = code;
        this.field = field;
    }
}

function handleApiError(error) {
    if (error.detail && Array.isArray(error.detail)) {
        const errors = error.detail.map(err => 
            new ApiError(err.message, err.code, err.field)
        );
        return errors;
    }
    return [new ApiError(error.message || 'Unknown error', 'UNKNOWN_ERROR')];
}

function showFormErrors(errors) {
    // Clear previous errors
    document.querySelectorAll('.error-message').forEach(el => el.remove());
    document.querySelectorAll('.field-error').forEach(el => 
        el.classList.remove('field-error')
    );
    
    errors.forEach(error => {
        if (error.field) {
            const field = document.querySelector(`[name="${error.field}"]`);
            if (field) {
                field.classList.add('field-error');
                const errorEl = document.createElement('div');
                errorEl.className = 'error-message';
                errorEl.textContent = error.message;
                field.parentNode.appendChild(errorEl);
            }
        } else {
            showMessage(error.message, 'error');
        }
    });
}
```

## Phase 3: Performance Optimizations

### 3.1 Caching Implementation

**Frontend (cacheManager.js)**:
```javascript
class CacheManager {
    constructor() {
        this.cache = new Map();
        this.defaultTTL = 5 * 60 * 1000; // 5 minutes
    }
    
    set(key, data, ttl = this.defaultTTL) {
        const item = {
            data,
            expiry: Date.now() + ttl
        };
        this.cache.set(key, item);
    }
    
    get(key) {
        const item = this.cache.get(key);
        if (!item) return null;
        
        if (Date.now() > item.expiry) {
            this.cache.delete(key);
            return null;
        }
        
        return item.data;
    }
    
    clear() {
        this.cache.clear();
    }
    
    // Auto-clear expired items every minute
    startCleanup() {
        setInterval(() => {
            const now = Date.now();
            for (const [key, item] of this.cache.entries()) {
                if (now > item.expiry) {
                    this.cache.delete(key);
                }
            }
        }, 60000);
    }
}

const cache = new CacheManager();
cache.startCleanup();

// Enhanced apiRequest with caching
async function apiRequest(endpoint, options = {}) {
    const cacheKey = options.method === 'GET' ? endpoint : null;
    
    // Check cache for GET requests
    if (cacheKey && !options.noCache) {
        const cached = cache.get(cacheKey);
        if (cached) return cached;
    }
    
    const response = await fetchWithToken(endpoint, options);
    const data = await response.json();
    
    // Cache successful GET responses
    if (cacheKey && response.ok) {
        cache.set(cacheKey, data);
    }
    
    return data;
}
```

### 3.2 Pagination Implementation

**Backend (updated endpoints)**:
```python
from fastapi import Query

@router.get("/{breeder_id}/animals", response_model=List[schemas.AnimalResponse])
def get_breeder_animals(
    breeder_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(database.get_db)
):
    animals = crud.get_animals_by_breeder(db, breeder_id=breeder_id, skip=skip, limit=limit)
    total = crud.count_animals_by_breeder(db, breeder_id=breeder_id)
    
    return {
        "items": animals,
        "total": total,
        "skip": skip,
        "limit": limit
    }
```

**Frontend (pagination component)**:
```javascript
class Pagination {
    constructor({ total, skip, limit, onPageChange }) {
        this.total = total;
        this.skip = skip;
        this.limit = limit;
        this.onPageChange = onPageChange;
        this.currentPage = Math.floor(skip / limit) + 1;
        this.totalPages = Math.ceil(total / limit);
    }
    
    render(container) {
        container.innerHTML = `
            <div class="pagination">
                <button ${this.currentPage === 1 ? 'disabled' : ''} 
                    onclick="pagination.previous()">Previous</button>
                
                <span>Page ${this.currentPage} of ${this.totalPages}</span>
                
                <button ${this.currentPage === this.totalPages ? 'disabled' : ''} 
                    onclick="pagination.next()">Next</button>
            </div>
        `;
    }
    
    next() {
        if (this.currentPage < this.totalPages) {
            this.skip += this.limit;
            this.currentPage++;
            this.onPageChange(this.skip, this.limit);
        }
    }
    
    previous() {
        if (this.currentPage > 1) {
            this.skip -= this.limit;
            this.currentPage--;
            this.onPageChange(this.skip, this.limit);
        }
    }
}
```

## Phase 4: Real-time Updates (Optional)

### 4.1 WebSocket Implementation

**Backend (WebSocket manager)**:
```python
from fastapi import WebSocket, WebSocketDisconnect

class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[int, List[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, breeder_id: int):
        await websocket.accept()
        if breeder_id not in self.active_connections:
            self.active_connections[breeder_id] = []
        self.active_connections[breeder_id].append(websocket)
    
    def disconnect(self, websocket: WebSocket, breeder_id: int):
        if breeder_id in self.active_connections:
            self.active_connections[breeder_id].remove(websocket)
    
    async def send_to_breeder(self, message: str, breeder_id: int):
        if breeder_id in self.active_connections:
            for connection in self.active_connections[breeder_id]:
                await connection.send_text(message)

manager = ConnectionManager()

@app.websocket("/ws/breeders/{breeder_id}")
async def websocket_endpoint(websocket: WebSocket, breeder_id: int):
    await manager.connect(websocket, breeder_id)
    try:
        while True:
            data = await websocket.receive_text()
            # Handle incoming messages if needed
    except WebSocketDisconnect:
        manager.disconnect(websocket, breeder_id)
```

**Frontend (WebSocket client)**:
```javascript
class WebSocketClient {
    constructor(breederId) {
        this.breederId = breederId;
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
    }
    
    connect() {
        this.ws = new WebSocket(`ws://localhost:8000/ws/breeders/${this.breederId}`);
        
        this.ws.onopen = () => {
            console.log('WebSocket connected');
            this.reconnectAttempts = 0;
        };
        
        this.ws.onmessage = (event) => {
            this.handleMessage(JSON.parse(event.data));
        };
        
        this.ws.onclose = () => {
            console.log('WebSocket disconnected');
            this.tryReconnect();
        };
        
        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }
    
    handleMessage(data) {
        switch (data.type) {
            case 'new_animal':
                this.handleNewAnimal(data.animal);
                break;
            case 'breeding_event':
                this.handleBreedingEvent(data.event);
                break;
            // Add more message types as needed
        }
    }
    
    tryReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            setTimeout(() => this.connect(), 1000 * this.reconnectAttempts);
        }
    }
    
    disconnect() {
        if (this.ws) {
            this.ws.close();
        }
    }
}
```

## Implementation Timeline

### Week 1: Authentication & Security
- Implement JWT tokens
- Add token refresh mechanism
- Update all protected routes

### Week 2: Error Handling & Validation
- Standardize error responses
- Enhance frontend error handling
- Add client-side validation

### Week 3: Performance Optimizations
- Implement caching
- Add pagination
- Optimize database queries

### Week 4: Testing & Deployment
- Write comprehensive tests
- Performance testing
- Production deployment

This implementation plan provides a structured approach to improving your backend-frontend integration with concrete code examples and a realistic timeline.
