const settingsCards = [
  {
    title: 'Workspace',
    body: 'Manage workspace name, environment defaults, and basic team-level configuration.',
  },
  {
    title: 'Notifications',
    body: 'Configure alert preferences, severity thresholds, and future delivery destinations.',
  },
  {
    title: 'Credentials',
    body: 'Review app authentication posture, usage controls, and future rate-limit visibility.',
  },
  {
    title: 'Security and usage',
    body: 'This area will later surface rate limits, sandbox protections, and usage monitoring.',
  },
];

export default function SettingsPage() {
  return (
    <div className="app-dashboard">
      <section className="app-dashboard-hero">
        <div>
          <p className="app-section-kicker">Settings</p>
          <h2 className="app-dashboard-title">Workspace controls and future operational settings</h2>
          <p className="app-dashboard-subtitle">
            This shell prepares the product for later workspace management, alert preferences,
            usage controls, and security-aware configuration.
          </p>
        </div>
      </section>

      <section className="app-section">
        <div className="app-section-header">
          <div>
            <p className="app-section-kicker">Settings surface</p>
            <h3 className="app-section-title">Configuration areas</h3>
          </div>
        </div>

        <div className="app-apps-grid">
          {settingsCards.map((card) => (
            <article key={card.title} className="app-card">
              <div>
                <h4 className="app-card-title">{card.title}</h4>
                <p className="app-card-description">{card.body}</p>
              </div>

              <div className="app-card-actions">
                <button type="button" className="button-ghost">
                  Open section
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}