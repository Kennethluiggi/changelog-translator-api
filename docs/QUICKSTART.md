# Quickstart

This guide uses an `.env.example` template pattern so secrets stay out of source control.

## 1) Create a virtual environment
```bash
python -m venv .venv
```

## 2) Activate the environment

### Windows PowerShell
```powershell
.\.venv\Scripts\Activate.ps1
```

If activation is blocked:
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

### macOS / Linux
```bash
source .venv/bin/activate
```

## 3) Install dependencies
```bash
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

If `requirements.txt` is not present in your local copy, install directly:
```bash
python -m pip install fastapi uvicorn pydantic python-dotenv psycopg2-binary openai
```

## 4) Prepare environment config using `.env.example` pattern
Create a local template file:
```env
# .env.example
FREE_API_KEYS=free_demo_key
PRO_API_KEYS=pro_demo_key
APP_VERSION=0.1.0
AI_PROVIDER=mock
OPENAI_MODEL=gpt-4o-mini

DB_HOST=localhost
DB_PORT=5432
DB_NAME=changelog_translator
DB_USER=postgres
DB_PASSWORD=postgres

# only required for AI_PROVIDER=openai
OPENAI_API_KEY=your_openai_key_here
```

Then create your runtime `.env` from that template and fill real secrets locally.

## 5) Run the API
```bash
python -m uvicorn app.main:app --reload
```

## 6) Local endpoints
- Swagger UI: `http://127.0.0.1:8000/docs`
- Health: `GET http://127.0.0.1:8000/health`
- Version: `GET http://127.0.0.1:8000/version`
- Translate: `POST http://127.0.0.1:8000/v1/translate`
- History: `GET http://127.0.0.1:8000/v1/history?limit=10`
- Metrics: `GET http://127.0.0.1:8000/v1/metrics/summary`
