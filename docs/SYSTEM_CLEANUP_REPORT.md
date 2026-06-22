# System Cleanup Report

## Scope
This cleanup pass focuses on making the current Registry/LineageX project safer to share, easier to maintain, and easier to test without changing the product behaviour added in the Genetics & AI refactor.

## Cleanup Changes Applied

### 1. Removed generated/cache files
Removed Python cache and pytest cache folders from the distributable project:

- `__pycache__/`
- `.pytest_cache/`
- compiled `.pyc` files

These files are generated locally and should not be committed or shipped.

### 2. Removed committed environment file
Removed `.env` from the cleaned package and added `.env.example`.

Reason: `.env` can contain private database credentials, JWT secrets, SMTP passwords, and deployment secrets.

Use:

```bash
cp .env.example .env
```

Then update the values for your local or production environment.

### 3. Fixed Python package naming conflict
Removed the shadow file:

```text
Backend/app/utils.py
```

The real utilities now live in:

```text
Backend/app/utils/core.py
Backend/app/utils/response.py
```

Reason: having both `utils.py` and a `utils/` package can confuse future imports and developers.

### 4. Updated database bootstrap safety
Updated:

```text
Backend/app/database.py
```

The app now defaults to local SQLite when `DATABASE_URL` is not set:

```text
sqlite:///./lineagex.db
```

Production should still explicitly set `DATABASE_URL` in `.env` or server environment variables.

### 5. Updated deprecated SQLAlchemy import
Changed deprecated import:

```python
from sqlalchemy.ext.declarative import declarative_base
```

to:

```python
from sqlalchemy.orm import declarative_base
```

### 6. Replaced deprecated UTC datetime calls
Replaced `datetime.utcnow()` with timezone-aware UTC values in updated files.

Examples:

```python
datetime.now(timezone.utc)
```

Affected areas include animal update timestamps, weight measurement timestamps, admin approval/rejection timestamps, and JWT expiry creation.

### 7. Fixed test discovery issue
Renamed the FastAPI demo endpoint function in:

```text
test_app.py
```

The function was named `test_endpoint`, causing pytest to collect it as a test even though it was an async FastAPI route.

## Validation Performed

### Backend compile check
```bash
python -m compileall -q Backend main.py test_app.py tests
```

Result: Passed.

### Backend smoke tests
```bash
pytest -q tests
```

Result: 5 passed.

### Frontend JavaScript syntax check
```bash
node --check Frontend/admin/js/script.js
node --check Frontend/breeders/js/script.js
node --check Frontend/js/common.js
node --check Frontend/js/icons.js
node --check Frontend/js/script.js
```

Result: Passed.

## What Was Not Changed Yet

The frontend still has large HTML and JavaScript files, especially:

```text
Frontend/breeders/animal_management.html
Frontend/breeders/js/script.js
Frontend/breeders/genetics.html
```

Recommended next cleanup phase:

1. Split breeder JavaScript into feature modules:
   - `animals.api.js`
   - `animals.ui.js`
   - `animalMeasurements.js`
   - `genetics.api.js`
   - `genetics.ui.js`
2. Move repeated modal/table helpers into shared frontend utilities.
3. Create a consistent API response format across all backend routes.
4. Add Alembic migrations instead of raw SQL migrations.
5. Add endpoint tests for animal edit and genetics recommendation APIs.
