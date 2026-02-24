# Evaluation Plan

## Deterministic checks
- Change extraction returns expected type/area/description.
- Risk detection flags high/medium/low indicators.
- Impact scoring follows deterministic mapping.

## API checks
- Auth rejects missing/invalid key.
- Free key gets `403` for AI mode.
- Rate limiting returns `429` beyond window.

## AI checks
- Mock provider returns `ai_enhancement`.
- OpenAI provider missing key triggers fallback.
- Response shape always validates against `TranslateResponse`.
