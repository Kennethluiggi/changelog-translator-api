# Changelog Translator API

Structured FastAPI service that turns raw engineering release notes into actionable impact briefs for customer-facing teams.

## Highlights
- Deterministic translation engine (default)
- Optional AI enhancement layer with provider abstraction
- API key authentication with free/pro plan controls
- Fixed-window rate limiting
- Structured request/response contracts via Pydantic

## Quickstart
1. Create `.env`:
```bash
FREE_API_KEYS=free_demo_key
PRO_API_KEYS=pro_demo_key
APP_VERSION=0.1.0
AI_PROVIDER=mock
# OPENAI_API_KEY=...
# OPENAI_MODEL=gpt-4o-mini
```
2. Run:
```bash
uvicorn app.main:app --reload
```
3. Call translate:
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
- `docs/API.md`
- `docs/AI.md`
- `docs/EVALS.md`
