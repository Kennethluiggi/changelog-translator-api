import Link from 'next/link';

const requestExample = `POST /v1/translate
{
  "raw_text": "Deprecated scope auth:legacy. Introduced auth:token.rotate. Breaking change.",
  "audience": ["cs", "support", "customer"],
  "mode": "ai"
}`;

const responseExample = `{
  "impact_level": "high",
  "risk_flags": ["breaking change", "authentication impact"],
  "extracted_changes": [
    {
      "type": "deprecated",
      "area": "Auth",
      "description": "Deprecated scope auth:legacy"
    }
  ],
  "ai_enhancement": {
    "impacted_scopes": ["auth:legacy", "auth:token.rotate"],
    "impacted_partners": ["Northstar Bank"]
  }
}`;

export default function HomePage() {
  return (
    <main>
      <section className="hero content-width">
        <div className="hero-grid">
          <div className="panel">
            <span className="eyebrow">Phase 1 public shell</span>
            <h1>Know which partners are likely impacted the moment engineering ships a change.</h1>
            <p className="lead">
              Change Intelligence turns Jira and release signals into partner-impact reasoning,
              team-ready summaries, and a docs-first developer surface you can actually demo.
            </p>
            <div className="actions">
              <Link href="/docs" className="button">
                Read docs
              </Link>
              <Link href="/pricing" className="button-ghost">
                View pricing
              </Link>
            </div>
            <div className="kpi-grid">
              <div className="kpi">
                <strong>FastAPI backend</strong>
                <span className="small">Already built and running</span>
              </div>
              <div className="kpi">
                <strong>Docs-first shell</strong>
                <span className="small">OpenAI-inspired public structure</span>
              </div>
              <div className="kpi">
                <strong>Private app later</strong>
                <span className="small">Login and dashboard route already staged</span>
              </div>
            </div>
          </div>

          <div className="panel">
            <p className="docs-group-title">Canonical demo story</p>
            <h2>Incoming change</h2>
            <div className="code-block">
              <pre>{requestExample}</pre>
            </div>
            <h2 style={{ marginTop: 20 }}>System output</h2>
            <div className="code-block">
              <pre>{responseExample}</pre>
            </div>
          </div>
        </div>
      </section>

      <section className="section content-width">
        <div className="card-grid">
          <div className="card">
            <h2>Who it’s for</h2>
            <p className="text-muted">
              Customer Success, Support Operations, Product Marketing, API teams, and SaaS
              businesses with partner or integration exposure.
            </p>
          </div>
          <div className="card">
            <h2>Why it matters</h2>
            <p className="text-muted">
              Engineering ships. Customer-facing teams find out late. Support gets the first pain.
              This shell makes the product understandable before the full app is shipped.
            </p>
          </div>
          <div className="card">
            <h2>What exists now</h2>
            <p className="text-muted">
              /health, /version, /v1/translate, /v1/history, /v1/metrics/summary, AI enhancement,
              rate limiting, and Postgres persistence are already in the backend.
            </p>
          </div>
        </div>
      </section>

      <section className="section content-width">
        <div className="hero-grid">
          <div className="panel">
            <h2>How it works</h2>
            <div className="flow">
              <div className="flow-step">
                <span className="flow-num">1</span>
                <div>
                  <strong>Change enters system</strong>
                  <p className="text-muted">
                    Jira, release notes, or manual change text comes into the API.
                  </p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-num">2</span>
                <div>
                  <strong>AI plus rules analyze impact</strong>
                  <p className="text-muted">
                    Deterministic extraction runs first, then optional AI enhancement adds impact
                    reasoning.
                  </p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-num">3</span>
                <div>
                  <strong>Likely affected accounts are surfaced</strong>
                  <p className="text-muted">
                    Scope tokens, impact level, and partner reasoning become visible in one place.
                  </p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-num">4</span>
                <div>
                  <strong>Teams act earlier</strong>
                  <p className="text-muted">
                    Slack, email, and dashboard visibility are the next layers after this public shell.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="panel">
            <h2>Architecture snapshot</h2>
            <div className="code-block">
              <pre>{`Jira / Manual Input
        ↓
Change Intelligence API
        ↓
Deterministic Parser + AI Layer
        ↓
Risk / Scopes / Impact Reasoning
        ↓
Docs, Dashboard, Slack, Email`}</pre>
            </div>
            <div className="actions">
              <Link href="/docs/architecture" className="button-ghost">
                View architecture
              </Link>
              <Link href="/login" className="button">
                Go to login
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
