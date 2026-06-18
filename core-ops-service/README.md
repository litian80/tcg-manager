# Core Ops Pairing Service

Stateless FastAPI service for Swiss pairing computation using NetworkX Blossom algorithm.

## Architecture
- **Stateless** — no database connection, no authentication
- **Single endpoint** — `POST /pair` receives player data, returns pairings
- **Deployed on** — Google Cloud Run

## Local Development
```bash
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

## Running Tests
```bash
pytest tests/ -v
```
