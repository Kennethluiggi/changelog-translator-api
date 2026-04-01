export type CodeExampleGroup = {
  title: string;
  examples: {
    label: string;
    language: string;
    code: string;
  }[];
};

export type DocItem = {
  slug: string;
  title: string;
  description: string;
  body: string;
  codeExamples?: CodeExampleGroup[];
};

export const docs: DocItem[] = [
  {
    slug: 'overview',
    title: 'Overview',
    description: 'What Change Intelligence is and why it exists.',
    body: `Change Intelligence analyzes engineering changes and identifies which partners, customers, or systems are likely impacted.

It sits between engineering output and customer-facing teams, turning raw change signals into structured, actionable intelligence.

## What this solves

When engineering ships changes:
- Customer Success often finds out too late
- Support teams discover issues through tickets
- Product teams lack clear partner-impact visibility

Change Intelligence fixes this by providing earlier visibility into likely impact.

## What the system does

For each incoming change, the system can:
- extract structured change data
- detect risk signals like breaking changes or authentication impact
- identify affected scopes and systems
- optionally enrich results with AI
- produce outputs for CS, support, and customer communication

## Example flow

Input:
Deprecated scope auth:legacy. Introduced auth:token.rotate. Breaking change.

Output can include:
- impact level
- risk flags
- extracted changes
- AI-enhanced partner impact reasoning

## Design philosophy

- deterministic first, AI second
- AI is additive, not required
- fallback preserves reliability
- every run is logged for traceability

## What Phase 1 includes

Phase 1 is focused on public-facing presence:
- homepage
- pricing page
- docs surface
- login shell
- developer-friendly information architecture`
  },
  {
    slug: 'quickstart',
    title: 'Quickstart',
    description: 'Run the backend locally and call the main endpoints.',
    body: `## Local setup

1. Create and activate a Python virtual environment.
2. Install dependencies.
3. Create your local \`.env\` from the \`.env.example\` pattern.
4. Run the API with \`python -m uvicorn app.main:app --reload\`.

## Local endpoints

- \`GET /health\`
- \`GET /version\`
- \`POST /v1/translate\`
- \`GET /v1/history\`
- \`GET /v1/metrics/summary\`

## Authentication

Every request requires:
- \`X-API-Key\`

## Next step

Once the backend is running locally, go to:
- Authentication
- API Reference
- Request / Response`
  },
  {
    slug: 'api-reference',
    title: 'API Reference',
    description: 'Endpoint-by-endpoint reference for the current backend surface.',
    body: `## Available endpoints

The current public backend surface includes:

- \`GET /health\`
- \`GET /version\`
- \`POST /v1/translate\`
- \`GET /v1/history\`
- \`GET /v1/metrics/summary\`

## How to use this section

Use the endpoint links nested under API Reference in the left sidebar to view:
- required headers
- query parameters
- request bodies
- success responses
- error responses
- integration notes

## Authentication requirement

All endpoints require:
- \`X-API-Key\`

## Recommended reading order

1. Authentication
2. \`POST /v1/translate\`
3. Request / Response
4. History and metrics endpoints`
  },
  {
    slug: 'endpoint-health',
    title: 'GET /health',
    description: 'Health check endpoint for service availability.',
    body: `## Purpose

Use this endpoint to verify that the API is running and reachable.

## Method and path

- Method: \`GET\`
- Path: \`/health\`

## Headers

Required:
- \`X-API-Key\`

## Request body

This endpoint does not accept a request body.

## Example request

\`\`\`bash
curl -i http://127.0.0.1:8000/health \\
  -H 'X-API-Key: free_demo_key'
\`\`\`

## Success response

\`\`\`json
{
  "status": "ok"
}
\`\`\`

## Notes

This is the simplest endpoint to use for:
- connectivity checks
- environment validation
- startup verification`
  },
  {
    slug: 'endpoint-version',
    title: 'GET /version',
    description: 'Returns the current API version.',
    body: `## Purpose

Use this endpoint to confirm which version of the service is currently running.

## Method and path

- Method: \`GET\`
- Path: \`/version\`

## Headers

Required:
- \`X-API-Key\`

## Request body

This endpoint does not accept a request body.

## Example request

\`\`\`bash
curl -i http://127.0.0.1:8000/version \\
  -H 'X-API-Key: free_demo_key'
\`\`\`

## Success response

\`\`\`json
{
  "version": "0.1.0"
}
\`\`\`

## Notes

This is useful for:
- debugging deployments
- validating environment parity
- confirming release state`
  },
{
  slug: 'endpoint-translate',
  title: 'POST /v1/translate',
  description: 'Primary endpoint for analyzing engineering change text.',
  body: `## Purpose

This is the core endpoint in the system.

It accepts engineering-first change text and returns structured outputs that customer-facing teams can act on.

## Method and path

- Method: \`POST\`
- Path: \`/v1/translate\`

## Headers

Required:
- \`Content-Type: application/json\`
- \`X-API-Key\`

---

## Request fields

- raw_text  
  The raw engineering change text. This is the only required field.

- audience  
  Array of output targets. Common values: cs, support, customer.

- tone  
  Optional tone modifier. Example: neutral, direct, friendly.

- product_area  
  Optional hint for classification (e.g. Auth, Billing, API).

- constraints  
  Optional instruction like "no jargon" or "customer-safe language".

- mode  
  basic or ai  
  basic = deterministic only  
  ai = deterministic + AI enrichment (Pro only)

- persona  
  Optional persona hint (e.g. cs, support)

- partner_accounts  
  Optional array used to detect partner-specific impact.

---

## Response fields

- cs_summary  
  Customer Success-ready bullet points

- support_notes  
  Internal support guidance

- customer_summary  
  External-facing messaging

- risk_flags  
  Detected risks (breaking change, auth impact, etc.)

- follow_up_questions  
  Suggested questions to clarify impact

- extracted_changes  
  Structured breakdown of detected changes

- impact_level  
  low, medium, or high

- ai_enhancement  
  Only present in ai mode  
  Adds executive summary, risks, partner impact, and messaging

---

## Mode behavior

basic mode:
- deterministic only
- always available
- faster
- no AI enrichment

ai mode:
- includes partner reasoning
- includes executive summaries
- includes communication drafts
- requires Pro API key

If a free key calls mode=ai, the API returns 403.

---

## Common mistakes

- Missing X-API-Key header  
  → returns 401

- Using mode=ai with a free key  
  → returns 403

- Sending empty raw_text  
  → returns validation error

- Forgetting Content-Type: application/json  
  → request may fail silently depending on client

---

## Integration pattern

Typical flow:

1. Capture change text from:
   - Jira
   - release notes
   - internal changelogs

2. Send to /v1/translate

3. Store:
   - impact_level
   - risk_flags
   - summaries

4. Trigger:
   - Slack alerts
   - CS workflows
   - customer messaging

---

## When to use this endpoint

Use /v1/translate when you need:

- early visibility into breaking changes
- structured summaries for non-engineers
- partner impact detection
- pre-support alerting before tickets spike
`,
  codeExamples: [
    {
      title: 'Example request',
      examples: [
        {
          label: 'JavaScript',
          language: 'javascript',
          code: `const url = "http://127.0.0.1:8000/v1/translate";

const payload = {
  raw_text:
    "Changed OAuth token rotation policy. Deprecated scope auth:legacy and introduced auth:token.rotate. Breaking: integrations using auth:legacy must migrate by June 30.",
  audience: ["cs", "support", "customer"],
  tone: "neutral",
  product_area: "Auth",
  constraints: "no jargon",
  mode: "ai",
  persona: "cs",
  partner_accounts: [
    {
      name: "Northstar Bank",
      scopes: ["auth:legacy"]
    }
  ]
};

const response = await fetch(url, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": "pro_demo_key"
  },
  body: JSON.stringify(payload)
});

const data = await response.json();
console.log(response.status, data);`
        },
        {
          label: 'Python',
          language: 'python',
          code: `import requests

url = "http://127.0.0.1:8000/v1/translate"
headers = {
    "Content-Type": "application/json",
    "X-API-Key": "pro_demo_key",
}
payload = {
    "raw_text": "Changed OAuth token rotation policy. Deprecated scope auth:legacy and introduced auth:token.rotate. Breaking: integrations using auth:legacy must migrate by June 30.",
    "audience": ["cs", "support", "customer"],
    "tone": "neutral",
    "product_area": "Auth",
    "constraints": "no jargon",
    "mode": "ai",
    "persona": "cs",
    "partner_accounts": [
        {
            "name": "Northstar Bank",
            "scopes": ["auth:legacy"],
        }
    ],
}

response = requests.post(url, headers=headers, json=payload)
print(response.status_code)
print(response.json())`
        },
        {
          label: 'CSharp',
          language: 'csharp',
          code: `using System.Text;
using System.Net.Http;

var client = new HttpClient();

var json = """
{
  "raw_text": "Changed OAuth token rotation policy. Deprecated scope auth:legacy and introduced auth:token.rotate. Breaking: integrations using auth:legacy must migrate by June 30.",
  "audience": ["cs", "support", "customer"],
  "tone": "neutral",
  "product_area": "Auth",
  "constraints": "no jargon",
  "mode": "ai",
  "persona": "cs",
  "partner_accounts": [
    {
      "name": "Northstar Bank",
      "scopes": ["auth:legacy"]
    }
  ]
}
""";

var request = new HttpRequestMessage(HttpMethod.Post, "http://127.0.0.1:8000/v1/translate");
request.Headers.Add("X-API-Key", "pro_demo_key");
request.Content = new StringContent(json, Encoding.UTF8, "application/json");

var response = await client.SendAsync(request);
var body = await response.Content.ReadAsStringAsync();

Console.WriteLine(body);`
        },
        {
          label: 'Java',
          language: 'java',
          code: `import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class Example {
  public static void main(String[] args) throws Exception {
    var client = HttpClient.newHttpClient();

    var json = """
      {
        "raw_text": "Changed OAuth token rotation policy. Deprecated scope auth:legacy and introduced auth:token.rotate. Breaking: integrations using auth:legacy must migrate by June 30.",
        "audience": ["cs", "support", "customer"],
        "tone": "neutral",
        "product_area": "Auth",
        "constraints": "no jargon",
        "mode": "ai",
        "persona": "cs",
        "partner_accounts": [
          {
            "name": "Northstar Bank",
            "scopes": ["auth:legacy"]
          }
        ]
      }
      """;

    var request = HttpRequest.newBuilder()
      .uri(URI.create("http://127.0.0.1:8000/v1/translate"))
      .header("Content-Type", "application/json")
      .header("X-API-Key", "pro_demo_key")
      .POST(HttpRequest.BodyPublishers.ofString(json))
      .build();

    var response = client.send(request, HttpResponse.BodyHandlers.ofString());
    System.out.println(response.body());
  }
}`
        },
        {
          label: 'Go',
          language: 'go',
          code: `package main

import (
  "bytes"
  "fmt"
  "io"
  "net/http"
)

func main() {
  jsonBody := []byte(\`{
    "raw_text": "Changed OAuth token rotation policy. Deprecated scope auth:legacy and introduced auth:token.rotate. Breaking: integrations using auth:legacy must migrate by June 30.",
    "audience": ["cs", "support", "customer"],
    "tone": "neutral",
    "product_area": "Auth",
    "constraints": "no jargon",
    "mode": "ai",
    "persona": "cs",
    "partner_accounts": [
      {
        "name": "Northstar Bank",
        "scopes": ["auth:legacy"]
      }
    ]
  }\`)

  req, _ := http.NewRequest("POST", "http://127.0.0.1:8000/v1/translate", bytes.NewBuffer(jsonBody))
  req.Header.Set("Content-Type", "application/json")
  req.Header.Set("X-API-Key", "pro_demo_key")

  client := &http.Client{}
  resp, _ := client.Do(req)
  defer resp.Body.Close()

  body, _ := io.ReadAll(resp.Body)
  fmt.Println(string(body))
}`
        },
        {
          label: 'cURL',
          language: 'bash',
          code: `curl -X POST http://127.0.0.1:8000/v1/translate \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: pro_demo_key" \\
  -d '{
    "raw_text": "Changed OAuth token rotation policy. Deprecated scope auth:legacy and introduced auth:token.rotate. Breaking: integrations using auth:legacy must migrate by June 30.",
    "audience": ["cs", "support", "customer"],
    "tone": "neutral",
    "product_area": "Auth",
    "constraints": "no jargon",
    "mode": "ai",
    "persona": "cs",
    "partner_accounts": [
      {
        "name": "Northstar Bank",
        "scopes": ["auth:legacy"]
      }
    ]
  }'`
        }
      ]
    },
    {
      title: 'Example response',
      examples: [
        {
          label: 'JSON',
          language: 'json',
          code: `{
  "cs_summary": [
    "Changed — Auth: Changed OAuth token rotation policy"
  ],
  "support_notes": [
    "Support awareness — Changed OAuth token rotation policy"
  ],
  "customer_summary": [
    "Update: Changed OAuth token rotation policy"
  ],
  "risk_flags": [
    "breaking change",
    "authentication impact"
  ],
  "follow_up_questions": [
    "Are any customers using custom auth configurations?"
  ],
  "extracted_changes": [
    {
      "type": "changed",
      "area": "Auth",
      "description": "Changed OAuth token rotation policy"
    },
    {
      "type": "deprecated",
      "area": "Auth",
      "description": "Deprecated scope auth:legacy"
    }
  ],
  "impact_level": "high",
  "ai_provider": "mock",
  "ai_fallback_used": false,
  "ai_model": null,
  "ai_prompt_version": null,
  "ai_error_message": null,
  "ai_enhancement": {
    "executive_summary": "This release introduces OAuth scope hardening and may affect partners still using legacy auth scopes.",
    "customer_followups": [
      "Confirm which partner owners still rely on auth:legacy."
    ],
    "adoption_risks": [
      "Legacy OAuth scope usage can produce partner auth failures if migration is delayed."
    ],
    "impacted_scopes": [
      "auth:legacy",
      "auth:token.rotate"
    ],
    "impacted_partners": [
      "Northstar Bank"
    ],
    "partner_email_draft": "Subject: Action requested for upcoming OAuth scope changes"
  }
}`
        }
      ]
    }
  ]
},
  {
    slug: 'endpoint-history',
    title: 'GET /v1/history',
    description: 'Returns recent translation runs from persistence.',
    body: `## Purpose

Use this endpoint to retrieve recent translation runs in newest-first order.

## Method and path

- Method: \`GET\`
- Path: \`/v1/history\`

## Headers

Required:
- \`X-API-Key\`

## Query parameters

- \`limit\` — optional integer, defaults to \`10\`

## Example request

\`\`\`bash
curl -i 'http://127.0.0.1:8000/v1/history?limit=5' \\
  -H 'X-API-Key: free_demo_key'
\`\`\`

## Response shape

Each history item can include:
- \`id\`
- \`created_at\`
- \`status\`
- \`mode\`
- \`plan\`
- \`raw_text\`
- \`product_area\`
- \`tone\`
- \`impact_level\`
- \`risk_flags\`
- \`detected_scopes\`
- \`ai_provider\`
- \`ai_fallback_used\`
- \`response_json\`
- \`error_message\`

## Notes

Use this endpoint for:
- auditability
- debugging
- recent-run review
- internal tooling surfaces`
  },
  {
    slug: 'endpoint-metrics-summary',
    title: 'GET /v1/metrics/summary',
    description: 'Returns aggregate usage and impact counters.',
    body: `## Purpose

Use this endpoint to retrieve high-level aggregate metrics for translation runs.

## Method and path

- Method: \`GET\`
- Path: \`/v1/metrics/summary\`

## Headers

Required:
- \`X-API-Key\`

## Request body

This endpoint does not accept a request body.

## Example request

\`\`\`bash
curl -i http://127.0.0.1:8000/v1/metrics/summary \\
  -H 'X-API-Key: free_demo_key'
\`\`\`

## Success response

The response can include:
- \`total_runs\`
- \`basic_runs\`
- \`ai_runs\`
- \`ai_fallbacks\`
- \`high_impact\`
- \`medium_impact\`
- \`low_impact\`

## Notes

Use this endpoint for:
- dashboard summaries
- usage reporting
- operational insight
- internal visibility`
  },
  {
  slug: 'authentication',
  title: 'Authentication',
  description: 'How API keys, plans, headers, and access rules work.',
  body: `## Authentication model

Change Intelligence uses API-key authentication.

Every request must include:
- X-API-Key

There is no OAuth or bearer token flow in Phase 1.

---

## Required header

All authenticated requests must include the X-API-Key header.

---

## Plan model

The backend supports two plan types:

- free
- pro

Keys are mapped server-side.

---

## Free vs Pro access

Free:
- deterministic only
- cannot use AI mode

Pro:
- deterministic + AI
- access to enriched outputs

---

## AI mode enforcement

Free keys calling AI mode are rejected.

---

## Rate limits

- free: 60 requests / 60s  
- pro: 300 requests / 60s

---

## Integration guidance

1. store API key securely  
2. send it on every request  
3. handle 401, 403, 429 properly  

---

## Summary

To authenticate successfully:

- include X-API-Key  
- use correct plan  
- handle errors properly`,
  
  codeExamples: [
    {
      title: 'Basic authenticated request',
      examples: [
        {
          label: 'cURL',
          language: 'bash',
          code: `curl http://127.0.0.1:8000/health \\
  -H "X-API-Key: free_demo_key"`
        },
        {
          label: 'JavaScript',
          language: 'javascript',
          code: `const res = await fetch("http://127.0.0.1:8000/health", {
  headers: {
    "X-API-Key": "free_demo_key"
  }
});

console.log(await res.json());`
        }
      ]
    },
    {
      title: 'AI mode blocked (free key)',
      examples: [
        {
          label: 'Request',
          language: 'json',
          code: `{
  "mode": "ai"
}`
        },
        {
          label: 'Response',
          language: 'json',
          code: `{
  "detail": "AI mode requires a PRO API key"
}`
        }
      ]
    },
    {
      title: 'Missing API key',
      examples: [
        {
          label: 'Response',
          language: 'json',
          code: `{
  "detail": "Missing X-API-Key header"
}`
        }
      ]
    },
    {
      title: 'Invalid API key',
      examples: [
        {
          label: 'Response',
          language: 'json',
          code: `{
  "detail": "Invalid API key"
}`
        }
      ]
    },
    {
      title: 'Rate limit exceeded',
      examples: [
        {
          label: 'Response',
          language: 'json',
          code: `{
  "detail": "Rate limit exceeded. Try again in ~17s."
}`
        }
      ]
    },
    {
      title: 'Standard request headers',
      examples: [
        {
          label: 'JSON',
          language: 'json',
          code: `{
  "Content-Type": "application/json",
  "X-API-Key": "pro_demo_key"
}`
        }
      ]
    }
  ]
},
  {
    slug: 'request-response',
    title: 'Request / Response',
    description: 'Core translation payload shape.',
    body: `## Core response fields

\`POST /v1/translate\` returns:

- \`cs_summary\`
- \`support_notes\`
- \`customer_summary\`
- \`risk_flags\`
- \`follow_up_questions\`
- \`extracted_changes\`
- \`impact_level\`
- \`ai_enhancement\`
- \`ai_provider\`
- \`ai_fallback_used\`
- \`ai_model\`
- \`ai_prompt_version\`
- \`ai_error_message\`

## Deterministic baseline

The deterministic baseline always exists first.

That means the API is designed so that:
- useful output exists even without AI
- AI is additive
- fallback preserves reliability

## Request modeling

The main request body can include:
- \`raw_text\`
- \`audience\`
- \`tone\`
- \`product_area\`
- \`constraints\`
- \`mode\`
- \`persona\`
- optional \`partner_accounts\`

## Recommended reading

For endpoint-specific details, use:
- API Reference
- \`POST /v1/translate\`
- Authentication`
  },
  {
    slug: 'architecture',
    title: 'Architecture',
    description: 'System modules and data flow.',
    body: `## System overview

The backend is structured around:
- FastAPI routing
- deterministic translation logic
- optional provider-based AI enhancement
- PostgreSQL persistence

## Core modules

- \`app/main.py\` handles routing, auth, rate limiting, plan gating, and persistence
- \`app/translator.py\` handles deterministic extraction and orchestration
- \`app/ai.py\` handles provider-based AI enrichment
- \`app/db.py\` persists translation runs and summary metrics
- \`app/auth.py\` resolves caller plan from \`X-API-Key\`
- \`app/rate_limit.py\` enforces per-key request limits

## Phase 1 public shell

Phase 1 adds a lightweight frontend on top of the backend so the product can be understood, navigated, and demoed as a real developer-facing surface.`
  },
  {
    slug: 'demo-story',
    title: 'Demo Story',
    description: 'The canonical example for product demos and docs.',
    body: `## Input change

Deprecated scope auth:legacy. Introduced auth:token.rotate. Breaking: integrations using auth:legacy must migrate.

## System behavior

The system:
- detects authentication impact
- detects breaking change
- extracts scope tokens
- assigns impact level
- generates CS, support, and customer-ready outputs
- optionally enriches with partner-impact reasoning in AI mode

## Why this matters

This is the canonical demo story to reuse on:
- the homepage
- public docs
- sales demos
- outreach`
  }
];

export const defaultDocSlug = 'overview';

export const apiReferenceParentSlug = 'api-reference';

export const apiEndpointSlugs = [
  'endpoint-health',
  'endpoint-version',
  'endpoint-translate',
  'endpoint-history',
  'endpoint-metrics-summary'
];

export function getDocBySlug(slug: string) {
  return docs.find((doc) => doc.slug === slug);
}