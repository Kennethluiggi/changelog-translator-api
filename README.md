# Changelog Translator API

**Stack:** Python · FastAPI · PostgreSQL · Pydantic · OpenAI API · psycopg2 · python-dotenv

Changelog Translator API converts raw, engineering-first release notes into structured communication outputs for customer-facing teams. It is designed to show production-minded API design with deterministic logic, optional LLM enrichment, and clear operational signals.

## Problem this project solves
Engineering changelog text is often inconsistent and too technical for customer-facing workflows. This service standardizes release notes into:
- audience-specific summaries,
- risk flags,
- follow-up prompts,
- optional AI-enhanced communication assets.

## What this API produces
For a single changelog input, the API returns:

- Structured extracted changes (type, area, description)
- Risk flags (e.g., breaking changes, authentication impact)
- Impact level classification (low / medium / high)
- Audience-specific summaries:
  - Customer Success
  - Support
  - Customer-facing messaging
- Follow-up questions for operational teams
- Optional AI-enhanced output:
  - Executive summary
  - Partner impact mapping
  - Ready-to-send partner communication draft

## Example
Input:

```json
{
  "raw_text": "Deprecated scope auth:legacy. Introduced auth:token.rotate. Breaking change.",
  "audience": ["cs", "support", "customer"],
  "mode": "ai"
}
```

Output (shape excerpt):

```json
{
  "impact_level": "high",
  "risk_flags": ["breaking change", "authentication impact"],
  "extracted_changes": [
    {
      "type": "deprecated",
      "area": "Auth",
      "description": "Deprecated scope auth:legacy"
    }
  ],
  "ai_provider": "mock",
  "ai_fallback_used": false,
  "ai_enhancement": {
    "executive_summary": "...",
    "impacted_scopes": ["auth:legacy", "auth:token.rotate"],
    "impacted_partners": ["Northstar Bank"],
    "partner_email_draft": "Subject: Quick alignment on upcoming OAuth scope changes"
  }
}
```

This reflects the production-minded pattern used by the service: deterministic baseline first, then optional AI enrichment with explicit provider and fallback metadata.

## Design philosophy
- **Deterministic baseline first:** the system always produces a reliable rule-based response.
- **AI is additive:** AI mode enriches output, but does not replace core logic.
- **Fallback preserves reliability:** if AI fails, deterministic output still returns.
- **Observability matters:** each translation run is logged with mode, plan, outcomes, and AI metadata.

## High-level architecture
1. FastAPI route receives request.
2. API key auth resolves caller plan (`free` or `pro`).
3. Fixed-window rate limit is enforced by plan.
4. Deterministic translator builds core response.
5. If `mode="ai"` and caller is `pro`, provider-based AI enhancement is attempted.
6. Run metadata and response payload are persisted in `translation_runs`.

## Quick start (summary)
1. Create and activate a virtual environment.
2. Install dependencies.
3. Configure environment variables via `.env.example` pattern.
4. Start server with Uvicorn.
5. Call authenticated endpoints with `X-API-Key`.

Detailed setup: [docs/QUICKSTART.md](docs/QUICKSTART.md)

## API surface
- `GET /health`
- `GET /version`
- `POST /v1/translate`
- `GET /v1/history`
- `GET /v1/metrics/summary`

## Documentation index
- [Architecture](docs/ARCHITECTURE.md)
- [Request Flows](docs/FLOWS.md)
- [Database Schema](docs/DATABASE_SCHEMA.md)
- [AI Layer](docs/AI_LAYER.md)
- [Auth and Rate Limits](docs/AUTH_AND_RATE_LIMITS.md)
- [Request/Response Contract](docs/REQUEST_RESPONSE_CONTRACT.md)
- [Quickstart](docs/QUICKSTART.md)
- [Demo Walkthrough](docs/DEMO.md)
- [Evaluation Checklist](docs/EVALUATION_CHECKLIST.md)

## Demo and testing summary
- Demo-ready curl walkthroughs are provided in [docs/DEMO.md](docs/DEMO.md).
- Reviewer validation steps are provided in [docs/EVALUATION_CHECKLIST.md](docs/EVALUATION_CHECKLIST.md).
- Core behavior is covered by deterministic/API tests in `tests/`.
