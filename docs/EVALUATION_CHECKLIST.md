# Evaluation Checklist

Use this checklist to review the project end-to-end as a backend/API + AI integration exercise.

## Authentication
- [ ] Request without `X-API-Key` returns `401` and expected error message.
- [ ] Request with invalid key returns `401`.
- [ ] Free and pro keys both authenticate successfully.

## Rate limits
- [ ] Free key is limited to 60 requests/60s.
- [ ] Pro key is limited to 300 requests/60s.
- [ ] Exceeded limits return `429` with `Retry-After` header.

## Deterministic translation quality
- [ ] `mode=basic` returns structured deterministic fields.
- [ ] Risk flags and impact level align with changelog content.
- [ ] Scope tokens are detected when present in raw text.

## AI output behavior
- [ ] `mode=ai` with pro key returns `ai_enhancement`.
- [ ] `ai_provider` is populated.
- [ ] AI output conforms to expected response schema.

## Fallback reliability
- [ ] Simulate AI provider failure.
- [ ] API still returns `200` deterministic response.
- [ ] `ai_fallback_used=true` and `ai_error_message` are present.

## PostgreSQL persistence
- [ ] `/v1/translate` inserts rows into `translation_runs`.
- [ ] Stored row contains mode, plan, risk flags, scopes, and response JSON.
- [ ] AI metadata fields are populated when applicable.

## History endpoint
- [ ] `/v1/history` returns newest-first records.
- [ ] `limit` query parameter controls number of rows returned.

## Metrics endpoint
- [ ] `/v1/metrics/summary` returns expected aggregate counters.
- [ ] Counters align with seeded/manual run data.
