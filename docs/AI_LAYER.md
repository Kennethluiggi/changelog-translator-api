# AI Layer

## Deterministic-first, AI-second design
The translator always constructs a deterministic baseline response first. AI enhancement is attempted only when `mode="ai"` is requested and plan gating allows it. This ensures the system remains useful even when provider calls fail.

## Provider abstraction
`app/ai.py` defines an `AIProvider` protocol and a `get_provider()` selector:
- `MockAIProvider` (default): local deterministic enrichment, no external dependency.
- `OpenAIProvider`: uses OpenAI Responses API and validates structured JSON output.

This abstraction keeps AI integration replaceable and test-friendly.

## OpenAI integration
When `AI_PROVIDER=openai`:
- API key is read from `OPENAI_API_KEY`.
- Model defaults to `gpt-4o-mini` unless overridden by `OPENAI_MODEL`.
- Provider submits prompt input and parses returned JSON text.

## Prompt versioning
`OpenAIProvider` exposes `prompt_version` (currently `v1`), which is copied onto response metadata and persisted in the database. This supports future prompt evolution with traceability.

## Structured validation with Pydantic
AI output is validated into the `AIEnhancement` model. If generated JSON does not conform to schema, validation fails and fallback logic is triggered.

## Fallback behavior
If provider execution raises any exception:
- `ai_fallback_used` is set to `true`.
- `ai_error_message` is captured.
- deterministic output remains intact and is returned with HTTP 200.

This keeps user-facing reliability independent of LLM availability.

## Postgres AI metadata logging
`/v1/translate` persistence captures:
- provider name,
- fallback flag,
- model,
- prompt version,
- AI error message,
- full response JSON.

This data supports reliability monitoring, debugging, and post-run analysis.
