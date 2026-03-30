# Request Flows

## 1) Translate (basic mode) flow
```text
Client -> POST /v1/translate
  -> require_api_key (401 on missing/invalid key)
  -> enforce_rate_limit (429 on limit exceed)
  -> deterministic translate()
      - parse lines
      - detect change type/risk flags/scopes
      - compute impact_level
      - build audience outputs
  -> insert_translation_run(status=success, mode=basic, ...)
  -> 200 TranslateResponse (no ai_enhancement)
```

## 2) Translate (AI mode, pro key) flow
```text
Client -> POST /v1/translate (mode=ai)
  -> require_api_key -> plan=pro
  -> enforce_rate_limit
  -> deterministic translate() baseline
  -> get_provider() from AI_PROVIDER
  -> provider.enhance(req, baseline)
  -> Pydantic validation into AIEnhancement
  -> attach ai_provider / ai_model / ai_prompt_version
  -> insert_translation_run(..., ai metadata)
  -> 200 TranslateResponse (with ai_enhancement)
```

## 3) AI fallback flow
```text
Client -> POST /v1/translate (mode=ai, pro)
  -> deterministic baseline is built first
  -> AI provider call raises exception
  -> translator sets ai_fallback_used=true and ai_error_message
  -> deterministic response is still returned
  -> run persisted with fallback + error metadata
  -> 200 TranslateResponse (reliable fallback path)
```

## 4) History flow
```text
Client -> GET /v1/history?limit=10
  -> require_api_key
  -> enforce_rate_limit
  -> fetch_translation_history(limit)
  -> SELECT recent rows from translation_runs ORDER BY id DESC
  -> 200 list of translation run records
```

## 5) Metrics summary flow
```text
Client -> GET /v1/metrics/summary
  -> require_api_key
  -> enforce_rate_limit
  -> fetch_metrics_summary()
  -> aggregate SQL (total/basic/ai/fallback/impact levels)
  -> 200 summary object
```

## Notes
- `mode="ai"` with a free key is rejected before translation with `403`.
- DB insert failures are intentionally non-blocking for response delivery (error is logged, response still returns).
