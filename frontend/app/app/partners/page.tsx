const partnerRows = [
  {
    partner: 'Northstar Bank',
    scopes: 'auth:legacy, payments:read',
    area: 'Auth',
    status: 'Mapped',
    updated: '2h ago',
  },
  {
    partner: 'Orbit HR',
    scopes: 'employees:read, auth:legacy',
    area: 'Partner API',
    status: 'Mapped',
    updated: '5h ago',
  },
  {
    partner: 'Helios Marketplace',
    scopes: 'orders:write, auth:token.rotate',
    area: 'Commerce',
    status: 'Reviewing',
    updated: '1d ago',
  },
  {
    partner: 'Acme Payroll',
    scopes: 'profile:read, employees:read',
    area: 'HR Data',
    status: 'Mapped',
    updated: '1d ago',
  },
];

export default function PartnersPage() {
  return (
    <div className="app-dashboard">
      <section className="app-dashboard-hero">
        <div>
          <p className="app-section-kicker">Partners</p>
          <h2 className="app-dashboard-title">Partner mapping and uploaded relationship data</h2>
          <p className="app-dashboard-subtitle">
            Review mapped partners, scopes, product areas, and record status before real
            upload and processing logic is connected in a later phase.
          </p>
        </div>
      </section>

      <section className="app-section">
        <div className="app-section-header">
          <div>
            <p className="app-section-kicker">Partner records</p>
            <h3 className="app-section-title">Current mapped data</h3>
          </div>

          <div className="app-section-actions">
            <button type="button" className="button home-v2-button-primary">
              Upload CSV
            </button>
            <button type="button" className="button-ghost">
              Submit JSON
            </button>
          </div>
        </div>

        <div className="app-table-shell">
          <div className="app-table-toolbar">
            <input
              type="text"
              className="input app-table-search"
              placeholder="Search partner name, scope, or product area"
            />
            <div className="app-table-filters">
              <button type="button" className="button-ghost app-filter-chip">
                All statuses
              </button>
              <button type="button" className="button-ghost app-filter-chip">
                All areas
              </button>
            </div>
          </div>

          <div className="app-table-wrap">
            <table className="app-table">
              <thead>
                <tr>
                  <th>Partner</th>
                  <th>Scopes</th>
                  <th>Area</th>
                  <th>Status</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {partnerRows.map((row, index) => (
                  <tr key={`${row.partner}-${index}`}>
                    <td>{row.partner}</td>
                    <td>{row.scopes}</td>
                    <td>{row.area}</td>
                    <td>
                      <span className={row.status === 'Reviewing' ? 'app-table-badge review' : 'app-table-badge mapped'}>
                        {row.status}
                      </span>
                    </td>
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