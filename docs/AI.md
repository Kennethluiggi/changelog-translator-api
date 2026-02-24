# AI Enhancement Layer

## Goals
- Preserve deterministic baseline output.
- Add polished executive summary and follow-up framing.
- In AI mode, map impacted partners from scope signals in `raw_text` using internal catalog data.
- Generate a copy-ready empathetic partner email draft.
- Keep outputs schema-safe via `AIEnhancement` model validation.

## Providers
- `mock` (default): no external API calls; deterministic synthetic enhancement.
- `openai` (opt-in): set `AI_PROVIDER=openai` and `OPENAI_API_KEY`.

## Safety/fallback
- Any provider exception sets `ai_fallback_used=true`.
- Deterministic fields remain present and authoritative.
- `temperature=0` for lower variance in OpenAI mode.

## Partner impact mapping
- Scope tokens are parsed from `raw_text` (for example, `auth:legacy`, `auth:token.rotate`).
- Mappings are resolved through `app/data/partners_by_scope.json`.
- AI response includes `impacted_scopes`, `impacted_partners`, and `partner_email_draft`.
