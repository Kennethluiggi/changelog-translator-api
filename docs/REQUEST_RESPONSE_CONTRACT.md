# Request/Response Contract

## Shared request header
All endpoints require:
- `X-API-Key: <key>`

---

## `POST /v1/translate`

### Request body
```json
{
  "raw_text": "Changed OAuth token rotation policy. Deprecated scope auth:legacy.",
  "audience": ["cs", "support", "customer"],
  "tone": "neutral",
  "product_area": "Auth",
  "constraints": "no jargon",
  "mode": "basic",
  "persona": "cs",
  "partner_accounts": [
    {
      "name": "Northstar Bank",
      "scopes": ["auth:legacy"]
    }
  ]
}
```

### Response body (success, basic mode)
```json
{
  "cs_summary": ["Changed — Auth: Changed OAuth token rotation policy"],
  "support_notes": ["Support awareness — Changed OAuth token rotation policy"],
  "customer_summary": ["Update: Changed OAuth token rotation policy"],
  "risk_flags": ["authentication impact"],
  "follow_up_questions": ["Are any customers using custom auth configurations?"],
  "extracted_changes": [
    {
      "type": "changed",
      "area": "Auth",
      "description": "Changed OAuth token rotation policy"
    }
  ],
  "impact_level": "medium",
  "ai_enhancement": null,
  "ai_provider": null,
  "ai_fallback_used": false,
  "ai_model": null,
  "ai_prompt_version": null,
  "ai_error_message": null
}
```

### Response body (success, ai mode)
```json
{
  "impact_level": "high",
  "ai_provider": "mock",
  "ai_fallback_used": false,
  "ai_model": null,
  "ai_prompt_version": null,
  "ai_error_message": null,
  "ai_enhancement": {
    "executive_summary": "This release introduces OAuth scope hardening...",
    "customer_followups": ["Which partner owners are accountable..."],
    "adoption_risks": ["Legacy OAuth scope usage can produce partner auth failures..."],
    "impacted_scopes": ["auth:legacy", "auth:token.rotate"],
    "impacted_partners": ["Northstar Bank"],
    "partner_email_draft": "Subject: Quick alignment on upcoming OAuth scope changes"
  }
}
```

---

## `GET /v1/history`

### Query parameter
- `limit` (integer, default `10`): number of rows to return, newest first.

### Success example
```json
[
  {
    "id": 42,
    "created_at": "2026-03-30T12:34:56Z",
    "status": "success",
    "mode": "basic",
    "plan": "free",
    "raw_text": "...",
    "product_area": "Auth",
    "tone": "neutral",
    "impact_level": "medium",
    "risk_flags": ["authentication impact"],
    "detected_scopes": ["auth:legacy"],
    "ai_provider": null,
    "ai_fallback_used": false,
    "response_json": {"impact_level": "medium"},
    "error_message": null
  }
]
```

---

## `GET /v1/metrics/summary`

### Success example
```json
{
  "total_runs": 120,
  "basic_runs": 95,
  "ai_runs": 25,
  "ai_fallbacks": 3,
  "high_impact": 14,
  "medium_impact": 61,
  "low_impact": 45
}
```

---

## Error responses

### 401 Unauthorized (missing key)
```json
{
  "detail": "Missing X-API-Key header"
}
```

### 401 Unauthorized (invalid key)
```json
{
  "detail": "Invalid API key"
}
```

### 403 Forbidden (AI mode on free plan)
```json
{
  "detail": "AI mode requires a PRO API key"
}
```

### 429 Too Many Requests
Headers include `Retry-After`.
```json
{
  "detail": "Rate limit exceeded. Try again in ~17s."
}
```

### 500 Internal Server Error (possible cases)
Possible when infrastructure dependencies fail outside guarded paths (for example DB reads in `/v1/history` or `/v1/metrics/summary`, or unexpected runtime exceptions).
```json
{
  "detail": "Internal Server Error"
}
```
