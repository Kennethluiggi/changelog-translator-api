# Database Schema

## Table: `translation_runs`
The API persists each `/v1/translate` execution to `translation_runs` for traceability, reporting, and AI observability.

## Column reference
- `id`: Run identifier (used for descending history order).
- `status`: Run status (currently inserted as `success` in main flow).
- `mode`: Translation mode used (`basic` or `ai`).
- `plan`: Caller plan (`free` or `pro`).
- `raw_text`: Original changelog input.
- `product_area`: Optional product area override from request.
- `tone`: Requested tone.
- `impact_level`: Deterministic impact label (`low`, `medium`, `high`).
- `risk_flags`: JSON payload of detected risk flags.
- `detected_scopes`: JSON payload of extracted scope tokens from changelog text.
- `ai_provider`: Provider name when AI mode is used (`mock` or `openai`).
- `ai_fallback_used`: Boolean indicating AI failure fallback path.
- `ai_model`: AI model name used by provider when available.
- `ai_prompt_version`: Prompt/version tag associated with provider prompt logic.
- `ai_error_message`: Captured AI exception string when fallback occurs.
- `response_json`: Full serialized API response payload.
- `error_message`: Non-AI pipeline error message field reserved in insert payload.
- `created_at`: Timestamp used for run chronology and history browsing.

## Why JSONB-style fields are used
`risk_flags`, `detected_scopes`, and `response_json` are stored as JSON payloads to preserve structured output without forcing rigid relational decomposition for rapidly evolving response shapes. This keeps query flexibility for analytics while retaining exact output snapshots.

## Observability and audit/debug value
The table provides:
- **Run-level auditability:** exact input, mode, plan, and returned payload.
- **AI reliability insight:** provider, model, prompt version, fallback usage, error text.
- **Operational reporting:** history browsing and aggregate metrics endpoints.
- **Debugging support:** compare deterministic baseline outcomes and AI-enriched outcomes over time.
