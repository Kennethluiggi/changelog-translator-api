'use client';

import { useMemo, useState } from 'react';

type AlertRow = {
  id: string;
  severity: 'High' | 'Medium' | 'Low';
  summary: string;
  partners: string;
  type: string;
  updated: string;
  detailTitle: string;
  detailBody: string;
  detailJson: string;
};

const alertRows: AlertRow[] = [
  {
    id: 'alert-1',
    severity: 'High',
    summary: 'Legacy auth scope deprecation may break partner access',
    partners: 'Northstar Bank, Orbit HR',
    type: 'Breaking change',
    updated: '12 min ago',
    detailTitle: 'Legacy auth scope deprecation may break partner access',
    detailBody:
      'A deprecated legacy authentication scope is still mapped to active partners. This should be treated as a production-readiness issue before rollout proceeds.',
    detailJson: `{
  "severity": "high",
  "type": "breaking_change",
  "partners": ["Northstar Bank", "Orbit HR"],
  "recommended_action": "Notify partner owners and prepare support guidance"
}`,
  },
  {
    id: 'alert-2',
    severity: 'Medium',
    summary: 'Token rotation enforcement requires partner validation',
    partners: 'Helios Marketplace',
    type: 'Authentication',
    updated: '42 min ago',
    detailTitle: 'Token rotation enforcement requires partner validation',
    detailBody:
      'A partner currently mapped to the authentication workflow should validate token rotation behavior before this release is considered safe.',
    detailJson: `{
  "severity": "medium",
  "type": "authentication",
  "partners": ["Helios Marketplace"],
  "recommended_action": "Validate token rotation in sandbox"
}`,
  },
  {
    id: 'alert-3',
    severity: 'Low',
    summary: 'Sandbox activity alert generated from test workflow',
    partners: 'Internal test workspace',
    type: 'Sandbox',
    updated: '2h ago',
    detailTitle: 'Sandbox activity alert generated from test workflow',
    detailBody:
      'This activity appears expected and does not currently indicate partner-facing risk. It remains visible for operational awareness.',
    detailJson: `{
  "severity": "low",
  "type": "sandbox",
  "partners": ["Internal test workspace"],
  "recommended_action": "No action required"
}`,
  },
];

export default function AlertsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'All' | AlertRow['severity']>('All');
  const [typeFilter, setTypeFilter] = useState('All types');
  const [selectedAlert, setSelectedAlert] = useState<AlertRow | null>(null);

  const alertTypes = useMemo(() => ['All types', ...new Set(alertRows.map((row) => row.type))], []);

  const filteredRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return alertRows.filter((row) => {
      const matchesSearch =
        !term ||
        row.summary.toLowerCase().includes(term) ||
        row.partners.toLowerCase().includes(term) ||
        row.type.toLowerCase().includes(term);

      const matchesSeverity = severityFilter === 'All' || row.severity === severityFilter;
      const matchesType = typeFilter === 'All types' || row.type === typeFilter;

      return matchesSearch && matchesSeverity && matchesType;
    });
  }, [searchTerm, severityFilter, typeFilter]);

  return (
    <div className="app-dashboard">
      <section className="app-section">
        <div className="app-section-header compact app-section-header-inline">
          <div>
            <p className="app-section-kicker">Alerts</p>
          </div>

          <div className="app-table-filters">
            <select
              className="input app-select"
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value as 'All' | AlertRow['severity'])}
            >
              <option value="All">All severities</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>

            <select
              className="input app-select"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              {alertTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="app-table-shell">
          <div className="app-table-toolbar">
            <input
              type="text"
              className="input app-table-search"
              placeholder="Search alerts, partners, or change type"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="app-alert-list">
            {filteredRows.map((row) => (
              <button
                key={row.id}
                type="button"
                className={`app-notification-row ${row.severity.toLowerCase()}`}
                onClick={() => setSelectedAlert(row)}
              >
                <span className={`app-notification-dot ${row.severity.toLowerCase()}`} />
                <div className="app-notification-row-main">
                  <strong>{row.summary}</strong>
                  <span>{row.partners}</span>
                </div>
                <div className="app-notification-row-side">
                  <span>{row.type}</span>
                  <span className="app-alert-updated">{row.updated}</span>
                </div>
              </button>
            ))}

            {filteredRows.length === 0 ? (
              <div className="app-empty-state compact">
                <strong>No alerts match this view</strong>
                <p>Try changing the filters or search term.</p>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {selectedAlert ? (
        <div className="app-modal-overlay" onClick={() => setSelectedAlert(null)}>
          <div className="app-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="app-modal-header">
              <div>
                <p className="app-section-kicker">Alert detail</p>
                <h3 className="app-modal-title">{selectedAlert.detailTitle}</h3>
              </div>

              <button
                type="button"
                className="app-icon-button"
                onClick={() => setSelectedAlert(null)}
                aria-label="Close alert detail"
              >
                ✕
              </button>
            </div>

            <p className="app-modal-copy">{selectedAlert.detailBody}</p>

            <div className="app-modal-meta">
              <span
                className={`app-status-badge ${
                  selectedAlert.severity === 'Low' ? 'sandbox' : 'review'
                }`}
              >
                {selectedAlert.severity.toUpperCase()}
              </span>
              <span>{selectedAlert.partners}</span>
              <span>{selectedAlert.type}</span>
            </div>

            <div className="app-modal-json">
              <pre>{selectedAlert.detailJson}</pre>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
