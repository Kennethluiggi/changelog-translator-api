import Link from 'next/link';
import { HomeHeroDemo } from '@/components/HomeHeroDemo';
import Image from 'next/image';

const integrations = [
  'Jira',
  'Slack',
  'Salesforce',
  'OpenAI',
  'REST APIs',
  'JSON',
  'Postgres',
  'Webhooks',
  'HubSpot',
  'Zendesk',
];

export default function HomePage() {
  return (
    <main className="home-v2">
      <section className="home-v2-hero">
        <div className="content-width home-v2-hero-grid">
          <div className="home-v2-copy">
            <p className="home-v2-eyebrow">AI-powered change intelligence</p>

            <h1 className="home-v2-title">
              See the impact of every
              <br />
              engineering change before it
              <br />
              reaches your customers
            </h1>

            <p className="home-v2-subtitle">
              AI-powered analysis turns release notes and Jira updates into clear,
              actionable intelligence for customer-facing teams.
            </p>

            <div className="home-v2-actions">
              <Link href="/docs" className="button home-v2-button-primary">
                View live demo
              </Link>

              <Link href="/docs" className="button-ghost home-v2-button-secondary">
                View API
              </Link>
            </div>

            <div className="home-v2-proof">
              <span className="home-v2-proof-dot" />
              <span>Built for engineering, product, customer success, and support teams</span>
            </div>
          </div>

          <HomeHeroDemo />
        </div>
      </section>

      <section className="home-v2-trust">
        <div className="content-width">
          <p className="home-v2-trust-title">Works with tools your team already uses</p>

          <div className="home-v2-marquee">
            <div className="home-v2-marquee-track">
              {[...integrations, ...integrations].map((item, index) => (
                <div key={`${item}-${index}`} className="home-v2-logo-chip">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="home-v2-system">
        <div className="content-width">
          <div className="home-v2-section-heading">
            <p className="home-v2-section-label">How it works</p>
            <h2>From engineering change to customer-ready action</h2>
            <p className="text-muted">
              Change Intelligence turns raw release information into a decision-ready layer
              for the teams that own customer impact.
            </p>
          </div>

          <div className="home-v2-system-flow">
            <div className="home-v2-system-node">
              <p className="home-v2-node-title">Inputs</p>
              <ul>
                <li>Jira updates</li>
                <li>Release notes</li>
                <li>Manual changelog input</li>
              </ul>
            </div>

            <div className="home-v2-system-arrow">→</div>

            <div className="home-v2-system-node featured">
              <p className="home-v2-node-title">AI-powered intelligence</p>
              <ul>
                <li>Change classification</li>
                <li>Partner impact detection</li>
                <li>Recommended actions</li>
              </ul>
            </div>

            <div className="home-v2-system-arrow">→</div>

            <div className="home-v2-system-node">
              <p className="home-v2-node-title">Outputs</p>
              <ul>
                <li>Executive-ready summaries</li>
                <li>Support guidance</li>
                <li>Customer communication prep</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="home-v2-audience">
        <div className="content-width home-v2-audience-grid">
          <div className="home-v2-audience-card panel">
            <p className="home-v2-section-label">Built for</p>
            <h2>Teams that cannot afford surprise release impact</h2>
            <ul className="home-v2-audience-list">
              <li>Head of Engineering</li>
              <li>Product and Product Marketing</li>
              <li>Customer Success leadership</li>
              <li>Support operations</li>
            </ul>
          </div>

          <div className="home-v2-audience-card panel">
            <p className="home-v2-section-label">What you gain</p>
            <ul className="home-v2-audience-list">
              <li>Earlier visibility into breaking changes</li>
              <li>Clear partner impact before rollout</li>
              <li>Faster internal coordination</li>
              <li>Less reactive support chaos</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="home-v2-close">
        <div className="content-width home-v2-close-card panel">
          <div>
            <p className="home-v2-section-label">Start with the API</p>
            <h2>See how Change Intelligence fits into your workflow</h2>
            <p className="text-muted">
              Explore the API, review the product flow, and decide whether your team
              should move into pilot access.
            </p>
          </div>

          <div className="home-v2-actions">
            <Link href="/pricing" className="button home-v2-button-primary">
              View pricing
            </Link>

            <Link href="/login" className="button-ghost home-v2-button-secondary">
              Request access
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}