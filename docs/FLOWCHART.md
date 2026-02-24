# High-Level API Flowchart

Use this Mermaid chart directly in GitHub Markdown, or copy it into Lucidchart as a blueprint.

```mermaid
flowchart TD
    A[Client: Postman / App / Script] --> B[FastAPI app.main]
    B --> C[Auth: require_api_key]
    C --> D[Resolve plan: free or pro]
    D --> E[Rate limit check]
    E --> F[/v1/translate]

    F --> G{mode == ai?}
    G -- no --> H[Run deterministic translator]
    G -- yes --> I{plan == pro?}
    I -- no --> J[403: AI mode requires PRO]
    I -- yes --> H

    H --> K[Extract changes]
    K --> L[Detect risk flags]
    L --> M[Compute impact score/level]
    M --> N[Build base TranslateResponse]

    N --> O{mode == ai?}
    O -- no --> P[Return deterministic response]
    O -- yes --> Q[Select provider by AI_PROVIDER]

    Q --> R{provider}
    R -- mock --> S[MockAIProvider]
    R -- openai --> T[OpenAIProvider]

    S --> U[Validate against AIEnhancement schema]
    T --> U

    U --> V{AI success?}
    V -- yes --> W[Attach ai_enhancement + ai_provider]
    V -- no --> X[Set ai_fallback_used = true]

    W --> Y[Return response]
    X --> Y
```

## Quick interpretation
- The deterministic pipeline is always the source of truth.
- AI runs only when requested and only for `pro` callers.
- Any AI failure falls back safely to deterministic output.
