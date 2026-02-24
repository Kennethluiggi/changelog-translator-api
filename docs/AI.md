# AI Enhancement Layer

## Goals
- Preserve deterministic baseline output.
- Add polished executive summary and follow-up framing.
- Keep outputs schema-safe via `AIEnhancement` model validation.

## Providers
- `mock` (default): no external API calls; deterministic synthetic enhancement.
- `openai` (opt-in): set `AI_PROVIDER=openai` and `OPENAI_API_KEY`.

## Safety/fallback
- Any provider exception sets `ai_fallback_used=true`.
- Deterministic fields remain present and authoritative.
- `temperature=0` for lower variance in OpenAI mode.
