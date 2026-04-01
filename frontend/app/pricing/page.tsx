import Link from 'next/link';

const tiers = [
  {
    name: 'Pilot',
    price: '$0–$500',
    description: 'Short validation cycle for one workflow.',
    bullets: ['Two-week pilot', 'One source', 'One Slack destination later', 'Founder-led setup']
  },
  {
    name: 'Starter',
    price: '$300–$500/mo',
    description: 'One core team using change impact alerts.',
    bullets: ['Deterministic + AI modes', 'History and usage visibility', 'Docs and onboarding support']
  },
  {
    name: 'Growth',
    price: '$800–$1,200/mo',
    description: 'Multi-workflow teams with more operational exposure.',
    bullets: ['Multiple workflows', 'Deeper partner mapping', 'Priority support and rollout planning']
  }
];

export default function PricingPage() {
  return (
    <main className="content-width section">
      <div className="panel">
        <span className="eyebrow">Pricing</span>
        <h1 className="page-title">Simple early pricing for pilots and first production workflows.</h1>
        <p className="lead">
          This is informational pricing for Phase 1. The dashboard is still gated. New teams request
          access, validate the workflow, and expand from there.
        </p>
      </div>

      <div className="pricing-grid" style={{ marginTop: 24 }}>
        {tiers.map((tier) => (
          <section key={tier.name} className="price-card">
            <h2>{tier.name}</h2>
            <span className="price-number">{tier.price}</span>
            <p className="text-muted">{tier.description}</p>
            <ul>
              {tier.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="panel" style={{ marginTop: 24 }}>
        <h2>Access model</h2>
        <p className="text-muted">
          Existing customers sign in. New teams request access through a pilot or onboarding call.
          This keeps the product controlled while the dashboard, alerts, and partner data workflows
          are finished in later phases.
        </p>
        <div className="actions">
          <Link href="/login" className="button">
            Go to login
          </Link>
          <Link href="/docs" className="button-ghost">
            Read docs first
          </Link>
        </div>
      </div>
    </main>
  );
}
