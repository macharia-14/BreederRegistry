# 🐄 Animal Breed Registry System

The **Animal Breed Registry System** is a web-based platform that helps farmers and buyers verify the authenticity of animal breed records.

In Kenya, many sellers claim their animals are pure-breed when they’re not, making it hard for buyers to trust the information they’re given. This project aims to fix that by allowing breeders to register verified animals and their lineage in a secure, traceable way.

### 👨‍🌾 What it Does

-   Breeders can register their farms and animals.
-   Admins verify breeder identities before approval.
-   Buyers or the public can search animals and view verified lineage data.
-   Every animal record is linked to its breeder for traceability.

### ⚙️ Built With

-   **Backend:** FastAPI (Python)
-   **Frontend:** HTML, CSS, and JavaScript
-   **Database:** PostgreSQL

### 🚀 How to Run

1.  Clone the repo
    ```bash
    https://github.com/macharia-14/BreederRegistry.git
    ```
2. Install dependencies

-   pip install -r requirements.txt

3. Set up your .env file

-   DATABASE_URL=postgresql://username:password@localhost:5432/animal_registry
-   SECRET_KEY=your-secret-key

4. Run the app

-   uvicorn main:app --reload --port 8000


   
