# Architecture

## System overview
Changelog Translator API is a FastAPI service with a deterministic translation core, optional provider-based AI enhancement, and PostgreSQL persistence for run history and metrics.

## Modules and responsibilities

### `app/main.py`
- Defines FastAPI app and all HTTP endpoints.
- Applies shared dependencies: API key auth + rate limiting.
- Enforces plan gating (`mode="ai"` requires `pro`).
- Persists translation run records via DB layer.

### `app/translator.py`
- Implements deterministic translation pipeline:
  - normalize/split text,
  - detect change types,
  - detect risks,
  - compute impact level,
  - build audience-specific summaries.
- Extracts scope-like tokens from changelog text.
- Orchestrates optional AI enhancement with fallback behavior.

### `app/ai.py`
- Defines provider abstraction (`AIProvider` protocol).
- Implements providers:
  - `MockAIProvider` (default deterministic local enrichment),
  - `OpenAIProvider` (external LLM call).
- Validates AI output against `AIEnhancement` Pydantic model.
- Exposes provider selection via `get_provider()` and environment config.

### `app/db.py`
- Handles PostgreSQL access with `psycopg2`.
- Inserts translation run records into `translation_runs`.
- Fetches translation history for `/v1/history`.
- Computes aggregate metrics for `/v1/metrics/summary`.

### `app/auth.py`
- Loads API keys from environment.
- Validates `X-API-Key` header.
- Resolves caller plan (`free` or `pro`).
- Returns standardized 401 errors for missing/invalid keys.

### `app/rate_limit.py`
- Implements fixed-window in-memory per-key rate limiting.
- Uses different limits for free and pro plans.
- Returns 429 errors with `Retry-After` header.

### `app/models.py`
- Defines request/response contracts with Pydantic:
  - `TranslateRequest`,
  - `TranslateResponse`,
  - `AIEnhancement`,
  - nested models (`ExtractedChange`, `PartnerAccount`).
- Enforces field constraints and literal enums.

### Partner scope mapping data
- `app/data/partners_by_scope.json` stores partner-to-scope mappings.
- Used by AI layer (`partner_catalog.py`) to map detected scopes to likely impacted partner accounts.

## Separation of concerns
- **Routing and policy:** `main.py`, `auth.py`, `rate_limit.py`
- **Business translation logic:** `translator.py`
- **AI integration boundary:** `ai.py`
- **Persistence and reporting:** `db.py`
- **Data contracts:** `models.py`
- **Reference catalog:** `partner_catalog.py` + JSON data

This split keeps deterministic behavior testable, AI integration replaceable, and runtime observability independent from response-generation logic.
