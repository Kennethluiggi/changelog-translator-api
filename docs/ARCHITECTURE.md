# Architecture

## Flow
Input changelog text → deterministic parser → structured `TranslateResponse` → optional AI enhancement.

For a shareable visual diagram, see `docs/FLOWCHART.md`.

## Components
- `app/main.py`: FastAPI routes and plan gating.
- `app/auth.py`: API key authentication and plan resolution.
- `app/rate_limit.py`: fixed-window in-memory limiter.
- `app/translator.py`: deterministic extraction, risk detection, impact scoring, AI fallback wiring.
- `app/ai.py`: provider abstraction (`mock`, optional `openai`) and schema-validated AI output.
- `app/models.py`: request/response schemas.

## Design principles
- Deterministic-first core.
- AI is additive and optional.
- AI failures never break baseline output.
- Provider chosen by env var for backend portability.
