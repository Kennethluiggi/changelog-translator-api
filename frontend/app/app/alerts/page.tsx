const alertRows = [
  {
    severity: 'High',
    summary: 'Legacy auth scope deprecation may break partner access',
    partners: 'Northstar Bank, Orbit HR',
    type: 'Breaking change',
    updated: '12 min ago',
  },
  {
    severity: 'Medium',
    summary: 'Token rotation enforcement requires partner validation',
    partners: 'Helios Marketplace',
    type: 'Authentication',
    updated: '42 min ago',
  },
  {
    severity: 'Low',
    summary: 'Sandbox activity alert generated from test workflow',
    partners: 'Internal test workspace',
    type: 'Sandbox',
    updated: '2h ago',
  },
];

export default function AlertsPage() {
  return (
    <div className="app-dashboard">
      <section className="app-dashboard-hero">
        <div>
          <p className="app-section-kicker">Alerts</p>
          <h2 className="app-dashboard-title">Review alert history and active impact signals</h2>
          <p className="app-dashboard-subtitle">
            Browse partner-impact notifications, severity levels, and operational summaries
            tied to incoming changes.
          </p>
        </div>
      </section>

      <section className="app-section">
        <div className="app-section-header">
          <div>
            <p className="app-section-kicker">Alert history</p>
            <h3 className="app-section-title">Current and recent alerts</h3>
          </div>

          <div className="app-table-filters">
            <button type="button" className="button-ghost app-filter-chip">
              All severities
            </button>
            <button type="button" className="button-ghost app-filter-chip">
              All types
            </button>
          </div>
        </div>

        <div className="app-table-shell">
          <div className="app-table-toolbar">
            <input
              type="text"
              className="input app-table-search"
              placeholder="Search alerts, partners, or change type"
            />
          </div>

          <div className="app-table-wrap">
            <table className="app-table">
              <thead>
                <tr>
                  <th>Severity</th>
                  <th>Summary</th>
                  <th>Partners</th>
                  <th>Type</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {alertRows.map((row, index) => (
                  <tr key={`${row.summary}-${index}`}>
                    <td>
                      <span
                        className={
                          row.severity === 'High'
                            ? 'app-table-badge review'
                            : row.severity === 'Medium'
                              ? 'app-table-badge review'
                              : 'app-table-badge mapped'
                        }
                      >
                        {row.severity}
                      </span>
                    </td>
                    <td>{row.summary}</td>
                    <td>{row.partners}</td>
                    <td>{row.type}</td>
                    <td>{row.updated}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}