# Changelog Translator API

A FastAPI service that converts raw engineering release notes into structured, customer-facing impact briefs.

## Why this project exists
Engineering changelogs are often technical and inconsistent. This API standardizes that input into a repeatable format for Customer Success, Product, and Account teams.

## Core capabilities
- Deterministic changelog translation (default behavior)
- Optional AI enhancement layer (safe, additive, and provider-based)
- API key authentication with free/pro plan separation
- Fixed-window rate limiting
- Structured request and response contracts (Pydantic)

## Architecture at a glance
1. Request enters FastAPI route.
2. API key is validated (`401` on missing/invalid key).
3. Rate limit is enforced (`429` when exceeded).
4. Deterministic translator builds baseline response.
5. If `mode="ai"` and caller is `pro`, optional AI enhancement is attempted.
6. If AI fails, deterministic output still returns with fallback metadata.

See detailed diagrams in [`docs/FLOWCHART.md`](docs/FLOWCHART.md).

---

## Quick start

### 1) Create `.env` in the project root
```env
FREE_API_KEYS=free_demo_key
PRO_API_KEYS=pro_demo_key
APP_VERSION=0.1.0
AI_PROVIDER=mock
# OPENAI_API_KEY=...
# OPENAI_MODEL=gpt-4o-mini
```

### 2) Create and activate virtual environment

**Windows (PowerShell)**
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

If activation is blocked:
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

### 4) Run the API
```bash
python -m uvicorn app.main:app --reload
```

### 5) Open local endpoints
- Swagger UI: http://127.0.0.1:8000/docs
- Health: http://127.0.0.1:8000/health
- Version: http://127.0.0.1:8000/version

---

## Demo section (replace after recording)
- Video link: [Watch 60-second demo](PASTE_GITHUB_VIDEO_URL_HERE)
- Optional GIF asset: `docs/demo.gif`

Tip: Upload your video by dragging it into a GitHub issue comment, then paste the generated URL above.

---

## Postman demo script (for interview walkthrough)

### Request 1 — Health check with valid key
- **Method/Path:** `GET /health`
- **Header:** `X-API-Key: free_demo_key`
- **Expected:** `200` and `{"status":"ok"}`

### Request 2 — Auth failure path
- **Method/Path:** `GET /health`
- **Header:** *(none)*
- **Expected:** `401` (missing API key)

### Request 3 — Deterministic translation (free)
- **Method/Path:** `POST /v1/translate`
- **Header:** `X-API-Key: free_demo_key`
- **Body:**
```json
{
  "raw_text": "Added OAuth token rotation. Breaking: old endpoint removed.",
  "audience": ["cs", "support", "customer"],
  "mode": "basic"
}
```
- **Expected:** `200`, with deterministic fields like `extracted_changes`, `risk_flags`, and `impact_level`

### Request 4 — AI gated for free plan
- Same body as Request 3, but set `"mode": "ai"`
- **Header:** `X-API-Key: free_demo_key`
- **Expected:** `403` (AI mode requires pro)

### Request 5 — AI enhancement path (pro + mock)
- Same body as Request 3, but set `"mode": "ai"`
- **Header:** `X-API-Key: pro_demo_key`
- **Expected:** `200`, with `ai_provider`, `ai_enhancement`, `ai_fallback_used`

---

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

## Documentation index
- [Architecture](docs/ARCHITECTURE.md)
- [Flowcharts](docs/FLOWCHART.md)
- [API Contract](docs/API.md)
- [AI Layer](docs/AI.md)
- [Evaluation Checklist](docs/EVALS.md)
