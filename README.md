# Changelog Translator API

Structured FastAPI service that turns raw engineering release notes into actionable impact briefs for customer-facing teams.

## Highlights
- Deterministic translation engine (default)
- Optional AI enhancement layer with provider abstraction
- API key authentication with free/pro plan controls
- Fixed-window rate limiting
- Structured request/response contracts via Pydantic

## Demo
- Add your short clip after recording:
  - `[Watch 60-second demo](PASTE_GITHUB_VIDEO_URL_HERE)`
  - or `![Demo GIF](docs/demo.gif)`

## Run the server (step-by-step)

### 1) Create `.env` in the project root
```bash
FREE_API_KEYS=free_demo_key
PRO_API_KEYS=pro_demo_key
APP_VERSION=0.1.0
AI_PROVIDER=mock
# OPENAI_API_KEY=...
# OPENAI_MODEL=gpt-4o-mini
```

### 2) Create virtual environment

**Windows PowerShell**
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

If activation is blocked, run:
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

**macOS / Linux**
```bash
python -m venv .venv
source .venv/bin/activate
```

### 3) Install dependencies
```bash
python -m pip install --upgrade pip
python -m pip install fastapi uvicorn pydantic python-dotenv
```

### 4) Start API locally
```bash
python -m uvicorn app.main:app --reload
```

### 5) Open docs
- Swagger UI: `http://127.0.0.1:8000/docs`
- Health endpoint: `http://127.0.0.1:8000/health`

## Video demo test plan (what to show in Postman)

### Request 1: health works with API key
- `GET /health`
- Header: `X-API-Key: free_demo_key`
- Expect: `200` + `{ "status": "ok" }`

### Request 2: auth check
- `GET /health` without `X-API-Key`
- Expect: `401` (missing key)

### Request 3: deterministic translate (free plan)
- `POST /v1/translate`
- Header: `X-API-Key: free_demo_key`
- Body:
```json
{
  "raw_text": "Added OAuth token rotation. Breaking: old endpoint removed.",
  "audience": ["cs", "support", "customer"],
  "mode": "basic"
}
```
- Show fields: `extracted_changes`, `risk_flags`, `impact_level`

### Request 4: AI mode blocked on free key
- Same body but `"mode": "ai"`
- Header: `X-API-Key: free_demo_key`
- Expect: `403` (pro required)

### Request 5: AI mode with pro key (mock provider)
- Same body but `"mode": "ai"`
- Header: `X-API-Key: pro_demo_key`
- Expect: `200`
- Show fields: `ai_provider`, `ai_enhancement`, `ai_fallback_used`

## Curl quick check
```bash
curl -X POST http://127.0.0.1:8000/v1/translate \
  -H 'Content-Type: application/json' \
  -H 'X-API-Key: pro_demo_key' \
  -d '{
    "raw_text":"Added OAuth token rotation. Breaking: old token endpoint removed.",
    "audience":["cs","support","customer"],
    "mode":"ai"
  }'
```

## Documentation
- `docs/ARCHITECTURE.md`
- `docs/FLOWCHART.md`
- `docs/API.md`
- `docs/AI.md`
- `docs/EVALS.md`
