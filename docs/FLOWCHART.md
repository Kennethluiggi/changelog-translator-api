# API Flowcharts (High-Level + Detailed)

This file gives you both a quick architecture view and a detailed request lifecycle view with status-code paths.

## 1) High-level architecture flow

```mermaid
flowchart LR
    A[Client\nPostman / Frontend / Script] --> B[FastAPI Router\napp.main]
    B --> C[Auth Dependency\nrequire_api_key]
    C --> D[Rate Limiter\nenforce_rate_limit]
    D --> E[Endpoint Logic\n/health, /version, /v1/translate]

    E --> F[Deterministic Engine\napp.translator]
    F --> G[Structured Response\nTranslateResponse]

    G --> H{mode == "ai" ?}
    H -- no --> I[Return deterministic output]
    H -- yes --> J[AI Provider Layer\napp.ai]
    J --> K[MockAIProvider OR OpenAIProvider]
    K --> L[AIEnhancement schema validation]
    L --> M[Attach AI fields or fallback flag]
    M --> N[Final API response]
```

## 2) Detailed request lifecycle (status codes + branching)

```mermaid
flowchart TD
    A[HTTP Request arrives] --> B{Path?}

    B -- /health --> H1[GET /health]
    B -- /version --> V1[GET /version]
    B -- /v1/translate --> T1[POST /v1/translate]

    %% Shared dependency path (auth then rate-limit)
    H1 --> D1[Depends(require_api_key)]
    V1 --> D1
    T1 --> D1

    D1 --> D2{X-API-Key header present?}
    D2 -- no --> E401A[401 Unauthorized\n"Missing X-API-Key header"]
    D2 -- yes --> D3{Key in PRO keys?}
    D3 -- yes --> D4[ApiCaller(plan=pro)]
    D3 -- no --> D5{Key in FREE keys?}
    D5 -- yes --> D6[ApiCaller(plan=free)]
    D5 -- no --> E401B[401 Unauthorized\n"Invalid API key"]

    D4 --> RL[enforce_rate_limit(api_key, plan)]
    D6 --> RL

    RL --> RL2{Exceeded window limit?}
    RL2 -- yes --> E429[429 Too Many Requests\nRetry-After header]
    RL2 -- no --> EP{Endpoint type}

    EP -- health --> H2[Return {"status":"ok"}]
    EP -- version --> V2[Return {"version": APP_VERSION}]
    EP -- translate --> T2{req.mode == "ai"?}

    T2 -- no --> T3[Run deterministic translation]
    T2 -- yes --> T4{caller.plan == pro?}
    T4 -- no --> E403[403 Forbidden\n"AI mode requires a PRO API key"]
    T4 -- yes --> T3

    %% deterministic translation internals
    T3 --> P1[Extract change entries]
    P1 --> P2[Detect risk flags]
    P2 --> P3[Compute impact_score + impact_level]
    P3 --> P4[Build base TranslateResponse]

    P4 --> A1{req.mode == "ai"?}
    A1 -- no --> OK200A[200 OK\nDeterministic response]
    A1 -- yes --> A2[get_provider() from AI_PROVIDER]

    A2 --> A3{Provider selected}
    A3 -- mock --> A4[MockAIProvider.enhance]
    A3 -- openai --> A5[OpenAIProvider.enhance]

    A5 --> A6{OPENAI_API_KEY set?}
    A6 -- no --> AERR1[Provider error raised]
    A6 -- yes --> A7[Call OpenAI Chat Completions]
    A7 --> A8[Parse JSON message content]

    A4 --> A9[Build AIEnhancement object]
    A8 --> A9
    A9 --> A10[Schema-validate AIEnhancement]

    A10 --> A11{Enhancement succeeded?}
    A11 -- yes --> OK200B[200 OK\nBase response + ai_enhancement + ai_provider]
    A11 -- no --> A12[Set ai_fallback_used=true]
    AERR1 --> A12
    A12 --> OK200C[200 OK\nBase response + fallback flag]
```

## 3) Status code map (where each comes from)

- **200 OK**: successful `/health`, `/version`, and `/v1/translate` responses.
- **401 Unauthorized**:
  - missing `X-API-Key` header.
  - key not found in `FREE_API_KEYS` or `PRO_API_KEYS`.
- **403 Forbidden**: `/v1/translate` with `mode="ai"` for non-`pro` caller.
- **429 Too Many Requests**: per-key fixed-window limit exceeded; `Retry-After` returned.
- **Fallback-not-error path**: AI provider failures do **not** change HTTP status; response remains `200` with deterministic body and `ai_fallback_used=true`.

## 4) How AI vs non-AI is decided

1. Client sets `mode` in `TranslateRequest` (`basic` or `ai`).
2. If `mode=basic`, no AI provider is called.
3. If `mode=ai`, caller must be `pro` (otherwise `403`).
4. Translator builds deterministic output first, then tries AI enhancement.
5. Provider chosen by `AI_PROVIDER` env var:
   - `mock` (default): local deterministic mock enrichment.
   - `openai`: external API call + strict schema parse.
6. Any AI error toggles fallback flag; deterministic output is still returned.
