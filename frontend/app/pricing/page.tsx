import Link from 'next/link';
import type { Route } from 'next';

type PricingTier = {
  name: string;
  price: string;
  label: string;
  description: string;
  bullets: string[];
  cta: string;
  href: Route;
  featured: boolean;
};

const tiers: PricingTier[] = [
  {
    name: 'Sandbox',
    price: 'Free',
    label: 'Best for evaluation',
    description:
      'Explore Opsentry with safe mock data and a low-friction sandbox environment.',
    bullets: [
      'Sandbox API access with mock responses',
      'Basic change summaries',
      'Limited test volume',
      'No Slack or email delivery',
      'No live partner impact workflows',
    ],
    cta: 'Start in sandbox',
    href: '/docs',
    featured: false,
  },
  {
    name: 'Starter',
    price: '$249/mo',
    label: 'Best for first production workflow',
    description:
      'For smaller teams that need visibility into release impact before support feels it.',
    bullets: [
      '1 workflow',
      'Slack alert delivery',
      'Deterministic + AI analysis',
      'Basic history and visibility',
      'Light onboarding support',
    ],
    cta: 'Start monitoring changes',
    href: '/login',
    featured: false,
  },
  {
    name: 'Growth',
    price: '$999/mo',
    label: 'Most popular',
    description:
      'For teams managing customer-facing releases, partner exposure, and higher operational risk.',
    bullets: [
      'Multiple workflows',
      'Slack + email notifications',
      'Partner impact reasoning',
      'Recommended actions and summaries',
      'Priority support',
    ],
    cta: 'Prevent customer surprises',
    href: '/login',
    featured: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    label: 'For larger rollouts',
    description:
      'For organizations that need deeper rollout planning, broader integrations, and custom support.',
    bullets: [
      'Custom workflow design',
      'Advanced onboarding support',
      'Custom alerting strategy',
      'Future premium integrations',
      'Dedicated planning conversations',
    ],
    cta: 'Contact sales',
    href: '/login',
    featured: false,
  },
];

const comparisonRows = [
  ['Sandbox API', 'Yes', 'Yes', 'Yes', 'Yes'],
  ['Mock responses for testing', 'Yes', 'No', 'No', 'No'],
  ['Slack alerts', 'No', 'Yes', 'Yes', 'Yes'],
  ['Email alerts', 'No', 'No', 'Yes', 'Yes'],
  ['Partner impact reasoning', 'No', 'Limited', 'Full', 'Custom'],
  ['AI summaries', 'Basic', 'Standard', 'Advanced', 'Advanced'],
  ['Production workflows', 'No', '1', 'Multiple', 'Custom'],
  ['Onboarding support', 'Docs', 'Light', 'Priority', 'Dedicated'],
];

export default function PricingPage() {
  return (
    <main className="pricing-page">
      <section className="pricing-hero">
        <div className="content-width">
          <div className="pricing-hero-inner">
            <p className="pricing-kicker">Pricing</p>

            <h1 className="pricing-title">
              Stop finding out about breaking changes from your customers
            </h1>

            <p className="pricing-subtitle">
              opSentry detects high-risk engineering changes, identifies likely impact,
              and helps your team act before support tickets spike.
            </p>

            <div className="pricing-hero-actions">
              <Link href="/docs" className="button home-v2-button-primary">
                View live demo
              </Link>

              <Link href="/docs" className="button-ghost home-v2-button-secondary">
                Start in sandbox
              </Link>
            </div>

            <div className="pricing-proof-row">
              <span className="pricing-proof-pill">Flat pricing for now</span>
              <span className="pricing-proof-pill">Built for early operational clarity</span>
              <span className="pricing-proof-pill">Upgrade later as workflows expand</span>
            </div>
          </div>
        </div>
      </section>

      <section className="pricing-cards-section">
        <div className="content-width">
          <div className="pricing-cards-grid">
            {tiers.map((tier) => (
              <section
                key={tier.name}
                className={tier.featured ? 'pricing-tier-card featured' : 'pricing-tier-card'}
              >
                <div className="pricing-tier-top">
                  <p className="pricing-tier-label">{tier.label}</p>
                  <h2 className="pricing-tier-name">{tier.name}</h2>
                  <div className="pricing-tier-price">{tier.price}</div>
                  <p className="pricing-tier-description">{tier.description}</p>
                </div>

                <ul className="pricing-tier-list">
                  {tier.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>

                <Link
                  href={tier.href}
                  className={tier.featured ? 'button home-v2-button-primary' : 'button-ghost'}
                >
                  {tier.cta}
                </Link>
              </section>
            ))}
          </div>
        </div>
      </section>

      <section className="pricing-value-section">
        <div className="content-width">
          <div className="pricing-value-card">
            <div className="pricing-value-copy">
              <p className="pricing-section-label">What you’re actually paying for</p>
              <h2>Less chaos after release. Faster action before customers notice.</h2>
              <p className="text-muted">
                opSentry is not just another dashboard. It is an operational advantage for teams
                that need earlier visibility, better coordination, and fewer preventable surprises.
              </p>
            </div>

            <div className="pricing-value-grid">
              <div className="pricing-value-item">
                <strong>Fewer support escalations</strong>
                <p>Catch high-risk changes before they become reactive ticket volume.</p>
              </div>

              <div className="pricing-value-item">
                <strong>Faster internal alignment</strong>
                <p>Give customer-facing teams clear context without chasing engineering.</p>
              </div>

              <div className="pricing-value-item">
                <strong>Proactive partner communication</strong>
                <p>Know who may be affected and what should happen next.</p>
              </div>

              <div className="pricing-value-item">
                <strong>Reduced fire drills</strong>
                <p>Turn release uncertainty into earlier, calmer operational response.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="pricing-compare-section">
        <div className="content-width">
          <div className="pricing-compare-header">
            <p className="pricing-section-label">Compare plans</p>
            <h2>Choose the right level of visibility for your team</h2>
          </div>

          <div className="pricing-compare-table-wrap">
            <table className="pricing-compare-table">
              <thead>
                <tr>
                  <th>Feature</th>
                  <th>Sandbox</th>
                  <th>Starter</th>
                  <th>Growth</th>
                  <th>Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, rowIndex) => (
                <tr key={`${row[0]}-${rowIndex}`}>
                  {row.map((cell, cellIndex) => (
                    <td key={`${row[0]}-${cellIndex}`}>{cell}</td>
                  ))}
                </tr>
              ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="pricing-final-cta">
        <div className="content-width">
          <div className="pricing-final-cta-card">
            <div>
              <p className="pricing-section-label">See the workflow</p>
              <h2>See how your last release would have been handled with opSentry</h2>
              <p className="text-muted">
                Explore the docs, run through the demo story, or move into early access if your
                team already feels this pain.
              </p>
            </div>

            <div className="pricing-final-actions">
              <Link href="/docs" className="button home-v2-button-primary">
                View live demo
              </Link>
              <Link href="/login" className="button-ghost">
                Request access
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}