# Auth and Rate Limits

## API key requirement
All endpoints require the `X-API-Key` header.

Auth behavior:
- Missing key -> `401` with `"Missing X-API-Key header"`.
- Unknown key -> `401` with `"Invalid API key"`.
- Known keys resolve to caller plan:
  - key in `PRO_API_KEYS` -> `plan=pro`
  - key in `FREE_API_KEYS` -> `plan=free`

## Free vs pro plan behavior
- **Free plan:** access to deterministic mode (`mode="basic"`).
- **Pro plan:** access to deterministic and AI mode.

## Why AI mode requires pro
`/v1/translate` explicitly rejects `mode="ai"` for free keys with `403`. This enforces product-tier boundaries and protects paid AI capacity.

## Rate limit behavior
A fixed-window in-memory limiter is applied to every endpoint per API key:
- free: 60 requests / 60 seconds
- pro: 300 requests / 60 seconds

On exceed:
- HTTP `429` is returned,
- `Retry-After` header is included,
- error detail includes approximate retry seconds.

## Failure cases
- **Missing/invalid key:** `401 Unauthorized`.
- **AI mode on free plan:** `403 Forbidden`.
- **Rate limit exceeded:** `429 Too Many Requests`.

## Why rate limiting exists
- protects service availability,
- reduces abuse risk,
- enforces fair plan usage,
- preserves downstream dependency stability.
