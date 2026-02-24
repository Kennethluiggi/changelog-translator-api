# API

## Auth
All endpoints require `X-API-Key`.

## Endpoints
- `GET /health`
- `GET /version`
- `POST /v1/translate`

## Translate request
```json
{
  "raw_text": "Added OAuth token rotation",
  "audience": ["cs", "support", "customer"],
  "tone": "neutral",
  "product_area": "Auth",
  "constraints": "no jargon",
  "mode": "basic",
  "persona": "cs"
}
```

## Translate response (excerpt)
```json
{
  "impact_level": "medium",
  "risk_flags": ["authentication impact"],
  "ai_provider": "mock",
  "ai_fallback_used": false,
  "ai_enhancement": {
    "executive_summary": "...",
    "customer_followups": ["..."],
    "adoption_risks": ["..."],
    "impacted_scopes": ["auth:legacy", "auth:token.rotate"],
    "impacted_partners": ["Northstar Bank"],
    "partner_email_draft": "Subject: Required OAuth Scope Migration Action ..."
  }
}
```

`impacted_partners` are resolved using internal scope mappings from `app/data/partners_by_scope.json`.

## Plan behavior
- Free keys can use `mode=basic`.
- Pro keys can use `mode=basic` and `mode=ai`.
