# Demo Walkthrough

Use these examples against `http://127.0.0.1:8000` with a configured API key.

## 1) Health
```bash
curl -i http://127.0.0.1:8000/health \
  -H 'X-API-Key: free_demo_key'
```
Expected: `200` with `{"status":"ok"}`.

## 2) Version
```bash
curl -i http://127.0.0.1:8000/version \
  -H 'X-API-Key: free_demo_key'
```
Expected: `200` with `{"version":"..."}`.

## 3) Translate (basic)
```bash
curl -i -X POST http://127.0.0.1:8000/v1/translate \
  -H 'Content-Type: application/json' \
  -H 'X-API-Key: free_demo_key' \
  -d '{
    "raw_text":"Changed OAuth token rotation policy. Deprecated scope auth:legacy and introduced auth:token.rotate. Breaking: integrations using auth:legacy must migrate by June 30.",
    "audience":["cs","support","customer"],
    "mode":"basic"
  }'
```
Expected: deterministic response with `risk_flags`, `impact_level`, and no `ai_enhancement`.

## 4) Translate (ai)
```bash
curl -i -X POST http://127.0.0.1:8000/v1/translate \
  -H 'Content-Type: application/json' \
  -H 'X-API-Key: pro_demo_key' \
  -d '{
    "raw_text":"Changed OAuth token rotation policy. Deprecated scope auth:legacy and introduced auth:token.rotate. Breaking: integrations using auth:legacy must migrate by June 30.",
    "audience":["cs","support","customer"],
    "mode":"ai"
  }'
```
Expected: response includes `ai_provider`, `ai_fallback_used`, and `ai_enhancement` payload.

## 5) History
```bash
curl -i 'http://127.0.0.1:8000/v1/history?limit=5' \
  -H 'X-API-Key: free_demo_key'
```
Expected: newest-first list of translation run records from `translation_runs`.

## 6) Metrics summary
```bash
curl -i http://127.0.0.1:8000/v1/metrics/summary \
  -H 'X-API-Key: free_demo_key'
```
Expected: aggregate counters (`total_runs`, `basic_runs`, `ai_runs`, fallbacks, impact counts).
