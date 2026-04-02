'use client';

import { ChangeEvent, useMemo, useRef, useState } from 'react';

type AppRow = {
  id: string;
  name: string;
  description: string;
  status: 'Sandbox' | 'Production review';
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  calls: string;
};

type NotificationRow = {
  id: string;
  severity: 'low' | 'medium' | 'high';
  summary: string;
  partners: string;
  action: string;
  detailTitle: string;
  detailBody: string;
  detailJson: string;
};

type PartnerMapRow = {
  id: string;
  partner: string;
  scopes: string;
  area: string;
  status: string;
  updated: string;
  extra?: Record<string, string>;
};

type AppDrafts = Record<
  string,
  { redirectUri: string; description: string; showSecret: boolean }
>;

const initialApps: AppRow[] = [
  {
    id: 'app-1',
    name: 'Northstar API Workspace',
    description: 'Primary sandbox app for release-impact testing and partner alert previews.',
    status: 'Sandbox',
    clientId: 'cli_sbx_84c2f1a9d0',
    clientSecret: 'sec_sbx_29f8db8c1x19k',
    redirectUri: '',
    calls: '2,184',
  },
  {
    id: 'app-2',
    name: 'Payments Rollout Monitor',
    description: 'Prepared for production review with scoped partner visibility and alert routing.',
    status: 'Production review',
    clientId: 'cli_prv_1bc8e2d7a4',
    clientSecret: 'sec_prv_71a2df90pp42m',
    redirectUri: 'https://example.com/callback',
    calls: '412',
  },
];

const notifications: NotificationRow[] = [
  {
    id: 'notif-1',
    severity: 'high',
    summary: 'Breaking auth change flagged for production review',
    partners: 'Northstar Bank, Orbit HR',
    action: 'Escalate to partner owners and support readiness.',
    detailTitle: 'Breaking auth change flagged for production review',
    detailBody:
      'Legacy scope usage is still present in one configured app. This change should be reviewed before approval and partner owners should be notified ahead of rollout.',
    detailJson: `{
  "severity": "high",
  "change_type": "breaking change",
  "impacted_partners": ["Northstar Bank", "Orbit HR"],
  "recommended_action": "Escalate to partner owners and support readiness",
  "status": "pending_review"
}`,
  },
  {
    id: 'notif-2',
    severity: 'medium',
    summary: 'OAuth scope migration may affect 3 partners',
    partners: 'Northstar Bank, Orbit HR, Helios Marketplace',
    action: 'Review migration guidance before rollout.',
    detailTitle: 'OAuth scope migration may affect 3 partners',
    detailBody:
      'The current release includes scope migration activity that maps to multiple partner records and should be reviewed before wider exposure.',
    detailJson: `{
  "severity": "medium",
  "change_type": "authentication",
  "impacted_partners": ["Northstar Bank", "Orbit HR", "Helios Marketplace"],
  "recommended_action": "Review migration guidance before rollout",
  "status": "needs_guidance"
}`,
  },
  {
    id: 'notif-3',
    severity: 'low',
    summary: 'Sandbox activity remains within expected test volume',
    partners: 'Internal workspace',
    action: 'No action required.',
    detailTitle: 'Sandbox activity remains within expected test volume',
    detailBody:
      'Usage is healthy and no unusual burst behavior is currently visible in the workspace.',
    detailJson: `{
  "severity": "low",
  "change_type": "sandbox",
  "impacted_partners": [],
  "recommended_action": "No action required",
  "status": "healthy"
}`,
  },
  {
    id: 'notif-4',
    severity: 'medium',
    summary: 'Partner map has stale records that should be refreshed',
    partners: 'Acme Payroll',
    action: 'Upload a new CSV or raw JSON payload.',
    detailTitle: 'Partner map has stale records that should be refreshed',
    detailBody:
      'One or more partner mappings appear stale compared with recent change patterns. Refreshing the partner map is recommended.',
    detailJson: `{
  "severity": "medium",
  "change_type": "partner_map",
  "impacted_partners": ["Acme Payroll"],
  "recommended_action": "Upload a new CSV or raw JSON payload",
  "status": "refresh_recommended"
}`,
  },
  {
    id: 'notif-5',
    severity: 'high',
    summary: 'Client secret rotation recommended for one sandbox app',
    partners: 'None',
    action: 'Regenerate credentials before wider sharing.',
    detailTitle: 'Client secret rotation recommended for one sandbox app',
    detailBody:
      'One sandbox app credential appears old enough that rotation is recommended before broader internal sharing.',
    detailJson: `{
  "severity": "high",
  "change_type": "credential_hygiene",
  "impacted_partners": [],
  "recommended_action": "Regenerate credentials before wider sharing",
  "status": "rotation_recommended"
}`,
  },
];

function generateId() {
  return `app-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function generateClientId() {
  return `cli_sbx_${Math.random().toString(36).slice(2, 12)}`;
}

function generateClientSecret() {
  return `sec_sbx_${Math.random().toString(36).slice(2, 18)}`;
}

function normalizeCsvRowWrapper(line: string): string {
  const trimmed = line.trim();

  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    const inner = trimmed.slice(1, -1);
    return inner.replace(/""/g, '"');
  }

  return trimmed;
}

function parseCsvLine(line: string): string[] {
  const normalized = normalizeCsvRowWrapper(line);
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < normalized.length; i += 1) {
    const char = normalized[i];
    const next = normalized[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      cells.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  cells.push(current.trim());

  return cells.map((cell) => cell.replace(/^"(.*)"$/, '$1').trim());
}

function parseCsv(text: string): PartnerMapRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());

  const aliasMap: Record<string, string[]> = {
    partner: ['partner', 'partner_name', 'name', 'partnername', 'customer', 'client'],
    scopes: ['scopes', 'scope', 'permissions', 'products', 'features'],
    area: ['area', 'product_area', 'productarea', 'domain', 'group', 'category'],
    status: ['status', 'state'],
  };

  const findHeaderIndex = (aliases: string[]) =>
    headers.findIndex((header) => aliases.includes(header));

  return lines.slice(1).map((line, index) => {
    const values = parseCsvLine(line);

    const getValue = (aliases: string[]) => {
      const idx = findHeaderIndex(aliases);
      return idx >= 0 ? values[idx] ?? '' : '';
    };

    const partner = getValue(aliasMap.partner) || `Partner ${index + 1}`;
    const scopes = getValue(aliasMap.scopes) || '—';
    const area = getValue(aliasMap.area) || 'General';
    const status = getValue(aliasMap.status) || 'Mapped';

    const knownIndices = new Set(
      Object.values(aliasMap)
        .map((aliases) => findHeaderIndex(aliases))
        .filter((idx) => idx >= 0)
    );

    const extra: Record<string, string> = {};
    headers.forEach((header, idx) => {
      if (!knownIndices.has(idx)) {
        extra[header] = values[idx] ?? '';
      }
    });

    return {
      id: `csv-${index}-${partner}`,
      partner,
      scopes,
      area,
      status,
      updated: 'Just now',
      extra,
    };
  });
}

function normalizeJsonRows(value: unknown): PartnerMapRow[] {
  if (!Array.isArray(value)) return [];

  return value.map((item, index) => {
    const row = typeof item === 'object' && item !== null ? (item as Record<string, unknown>) : {};

    const partner = String(row.partner ?? row.partner_name ?? row.name ?? `Partner ${index + 1}`);
    const scopesValue = row.scopes ?? row.scope ?? row.permissions ?? '—';
    const scopes = Array.isArray(scopesValue) ? scopesValue.join(', ') : String(scopesValue || '—');

    return {
      id: `json-${index}-${partner}`,
      partner,
      scopes,
      area: String(row.area ?? row.product_area ?? 'General'),
      status: String(row.status ?? 'Mapped'),
      updated: 'Just now',
      extra: {},
    };
  });
}

function splitScopes(scopes: string): string[] {
  return scopes
    .split(',')
    .map((scope) => scope.trim())
    .filter(Boolean)
    .filter((scope) => scope !== '—');
}

export default function AppHomePage() {
  const [apps, setApps] = useState<AppRow[]>(initialApps);
  const [expandedAppId, setExpandedAppId] = useState<string | null>(initialApps[0]?.id ?? null);
  const [selectedNotification, setSelectedNotification] = useState<NotificationRow | null>(null);
  const [jsonModalOpen, setJsonModalOpen] = useState(false);
  const [createAppModalOpen, setCreateAppModalOpen] = useState(false);
  const [confirmRegenerateAppId, setConfirmRegenerateAppId] = useState<string | null>(null);
  const [jsonInput, setJsonInput] = useState('');
  const [appSearchTerm, setAppSearchTerm] = useState('');
  const [partnerSearchTerm, setPartnerSearchTerm] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterSearchTerm, setFilterSearchTerm] = useState('');
  const [selectedScopeFilters, setSelectedScopeFilters] = useState<string[]>([]);
  const [selectedAreaFilters, setSelectedAreaFilters] = useState<string[]>([]);
  const [selectedStatusFilters, setSelectedStatusFilters] = useState<string[]>([]);
  const [newAppName, setNewAppName] = useState('');
  const [newAppRedirectUri, setNewAppRedirectUri] = useState('');
  const [newAppDescription, setNewAppDescription] = useState('');
  const [partnerRows, setPartnerRows] = useState<PartnerMapRow[]>([]);
  const [appDrafts, setAppDrafts] = useState<AppDrafts>(
    Object.fromEntries(
      initialApps.map((app) => [
        app.id,
        {
          redirectUri: app.redirectUri,
          description: app.description,
          showSecret: false,
        },
      ])
    )
  );

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const activeNotificationCount = notifications.length;
  const highPriorityCount = notifications.filter((item) => item.severity === 'high').length;
  const hasApps = apps.length > 0;
  const hasPartnerMap = partnerRows.length > 0;

  const availableScopes = useMemo(() => {
    return [...new Set(partnerRows.flatMap((row) => splitScopes(row.scopes)))].sort((a, b) =>
      a.localeCompare(b)
    );
  }, [partnerRows]);

  const availableAreas = useMemo(() => {
    return [...new Set(partnerRows.map((row) => row.area).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b)
    );
  }, [partnerRows]);

  const availableStatuses = useMemo(() => {
    return [...new Set(partnerRows.map((row) => row.status).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b)
    );
  }, [partnerRows]);

  const filteredScopeOptions = useMemo(() => {
    const term = filterSearchTerm.trim().toLowerCase();
    if (!term) return availableScopes;
    return availableScopes.filter((scope) => scope.toLowerCase().includes(term));
  }, [availableScopes, filterSearchTerm]);

  const filteredAreaOptions = useMemo(() => {
    const term = filterSearchTerm.trim().toLowerCase();
    if (!term) return availableAreas;
    return availableAreas.filter((area) => area.toLowerCase().includes(term));
  }, [availableAreas, filterSearchTerm]);

  const filteredStatusOptions = useMemo(() => {
    const term = filterSearchTerm.trim().toLowerCase();
    if (!term) return availableStatuses;
    return availableStatuses.filter((status) => status.toLowerCase().includes(term));
  }, [availableStatuses, filterSearchTerm]);

  const filteredApps = useMemo(() => {
    const term = appSearchTerm.trim().toLowerCase();
    if (!term) return apps;
    return apps.filter((app) => {
      const redirect = appDrafts[app.id]?.redirectUri ?? '';
      const description = appDrafts[app.id]?.description ?? app.description;
      return (
        app.name.toLowerCase().includes(term) ||
        description.toLowerCase().includes(term) ||
        redirect.toLowerCase().includes(term) ||
        app.clientId.toLowerCase().includes(term)
      );
    });
  }, [apps, appDrafts, appSearchTerm]);

  const filteredPartnerRows = useMemo(() => {
    const term = partnerSearchTerm.trim().toLowerCase();

    return partnerRows.filter((row) => {
      const extraValues = Object.values(row.extra ?? {}).join(' ').toLowerCase();

      const matchesSearch =
        !term ||
        row.partner.toLowerCase().includes(term) ||
        row.scopes.toLowerCase().includes(term) ||
        row.area.toLowerCase().includes(term) ||
        row.status.toLowerCase().includes(term) ||
        extraValues.includes(term);

      const rowScopes = splitScopes(row.scopes);

      const matchesScope =
        selectedScopeFilters.length === 0 ||
        selectedScopeFilters.some((scope) => rowScopes.includes(scope));

      const matchesArea =
        selectedAreaFilters.length === 0 || selectedAreaFilters.includes(row.area);

      const matchesStatus =
        selectedStatusFilters.length === 0 || selectedStatusFilters.includes(row.status);

      return matchesSearch && matchesScope && matchesArea && matchesStatus;
    });
  }, [partnerRows, partnerSearchTerm, selectedScopeFilters, selectedAreaFilters, selectedStatusFilters]);

  function toggleListValue(value: string, list: string[], setter: (next: string[]) => void) {
    if (list.includes(value)) {
      setter(list.filter((item) => item !== value));
      return;
    }
    setter([...list, value]);
  }

  function clearFilters() {
    setSelectedScopeFilters([]);
    setSelectedAreaFilters([]);
    setSelectedStatusFilters([]);
    setFilterSearchTerm('');
  }

  function handleRedirectChange(appId: string, value: string) {
    setAppDrafts((prev) => ({
      ...prev,
      [appId]: {
        ...(prev[appId] ?? { redirectUri: '', description: '', showSecret: false }),
        redirectUri: value,
      },
    }));
  }

  function handleDescriptionChange(appId: string, value: string) {
    setAppDrafts((prev) => ({
      ...prev,
      [appId]: {
        ...(prev[appId] ?? { redirectUri: '', description: '', showSecret: false }),
        description: value,
      },
    }));
  }

  function toggleSecret(appId: string) {
    setAppDrafts((prev) => ({
      ...prev,
      [appId]: {
        ...(prev[appId] ?? { redirectUri: '', description: '', showSecret: false }),
        showSecret: !(prev[appId]?.showSecret ?? false),
      },
    }));
  }

  function deleteApp(appId: string) {
    const nextApps = apps.filter((app) => app.id !== appId);
    setApps(nextApps);

    setAppDrafts((prev) => {
      const next = { ...prev };
      delete next[appId];
      return next;
    });

    if (expandedAppId === appId) {
      setExpandedAppId(nextApps[0]?.id ?? null);
    }
  }

  function openCsvPicker() {
    fileInputRef.current?.click();
  }

  async function onCsvSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const parsed = parseCsv(text);
    setPartnerRows(parsed);
    setFilterOpen(false);
    event.target.value = '';
  }

  function handleCreateApp() {
    const trimmedName = newAppName.trim();
    if (!trimmedName) return;

    const newId = generateId();
    const createdApp: AppRow = {
      id: newId,
      name: trimmedName,
      description: newAppDescription.trim() || 'New sandbox app ready for configuration.',
      status: 'Sandbox',
      clientId: generateClientId(),
      clientSecret: generateClientSecret(),
      redirectUri: newAppRedirectUri.trim(),
      calls: '0',
    };

    setApps((prev) => [createdApp, ...prev]);
    setAppDrafts((prev) => ({
      ...prev,
      [newId]: {
        redirectUri: createdApp.redirectUri,
        description: createdApp.description,
        showSecret: false,
      },
    }));
    setExpandedAppId(newId);
    setCreateAppModalOpen(false);
    setNewAppName('');
    setNewAppRedirectUri('');
    setNewAppDescription('');
  }

  function handleSubmitJson() {
    try {
      const parsed = JSON.parse(jsonInput) as unknown;
      const rows = Array.isArray(parsed)
        ? normalizeJsonRows(parsed)
        : normalizeJsonRows((parsed as { partners?: unknown })?.partners ?? []);
      setPartnerRows(rows);
      setJsonModalOpen(false);
      setJsonInput('');
      setFilterOpen(false);
    } catch (error) {
      console.error('Invalid JSON', error);
      alert('Invalid JSON format. Please check your payload and try again.');
    }
  }

  function handleSaveApp(appId: string) {
    setApps((prev) =>
      prev.map((app) => {
        if (app.id !== appId) return app;
        const draft = appDrafts[appId];
        if (!draft) return app;
        return {
          ...app,
          redirectUri: draft.redirectUri,
          description: draft.description,
        };
      })
    );
  }

  function handleRegenerateCredentials(appId: string) {
    setApps((prev) =>
      prev.map((app) =>
        app.id === appId
          ? {
              ...app,
              clientId: generateClientId(),
              clientSecret: generateClientSecret(),
            }
          : app
      )
    );
    setAppDrafts((prev) => ({
      ...prev,
      [appId]: {
        ...(prev[appId] ?? { redirectUri: '', description: '', showSecret: false }),
        showSecret: false,
      },
    }));
    setConfirmRegenerateAppId(null);
  }

  return (
    <div className="app-dashboard">
      <section className="app-command-bar">
        <div className="app-command-left">
          <div className="app-command-signal-row">
            <div className="app-command-signal">
              <span className="app-signal-dot green" />
              <span>Sandbox workspace</span>
            </div>

            <div className="app-command-signal">
              <span className={`app-signal-dot ${hasApps ? 'green' : 'red'}`} />
              <span>{apps.length} apps created</span>
            </div>

            <div className="app-command-signal">
              <span className={`app-signal-dot ${hasPartnerMap ? 'green' : 'red'}`} />
              <span>{hasPartnerMap ? 'Partner map uploaded' : 'Partner map not uploaded'}</span>
            </div>
          </div>

          <div className="app-command-summary">
            <strong>{activeNotificationCount} active notifications</strong>
            <span>
              {highPriorityCount > 0
                ? `${highPriorityCount} high-priority items need review`
                : 'No high-priority items'}
            </span>
          </div>
        </div>
      </section>

      <section className="app-section app-section-priority">
        <div className="app-section-header compact">
          <div>
            <p className="app-section-kicker">Notification center</p>
          </div>
        </div>

        <div className="app-notification-feed">
          {notifications.map((notification) => (
            <button
              key={notification.id}
              type="button"
              className={`app-notification-row ${notification.severity}`}
              onClick={() => setSelectedNotification(notification)}
            >
              <span className={`app-notification-dot ${notification.severity}`} />
              <div className="app-notification-row-main">
                <strong>{notification.summary}</strong>
                <span>{notification.partners}</span>
              </div>
              <div className="app-notification-row-side">
                <span>{notification.action}</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="app-section">
        <div className="app-section-header compact">
          <div>
            <p className="app-section-kicker">Apps</p>
          </div>

          <div className="app-section-actions">
            <button
              type="button"
              className="button home-v2-button-primary"
              onClick={() => setCreateAppModalOpen(true)}
            >
              Create app
            </button>
          </div>
        </div>

        <div className="app-row-stack">
          {filteredApps.map((app) => {
            const expanded = expandedAppId === app.id;
            const draft = appDrafts[app.id] ?? {
              redirectUri: app.redirectUri,
              description: app.description,
              showSecret: false,
            };

            return (
              <div key={app.id} className="app-row-card">
                <button
                  type="button"
                  className={`app-row-summary ${expanded ? 'expanded' : ''}`}
                  onClick={() => setExpandedAppId(expanded ? null : app.id)}
                >
                  <div className="app-row-summary-main">
                    <div className="app-card-title-row">
                      <h4 className="app-card-title">{app.name}</h4>
                      <span
                        className={
                          app.status === 'Sandbox'
                            ? 'app-status-badge sandbox'
                            : 'app-status-badge review'
                        }
                      >
                        {app.status}
                      </span>
                    </div>
                    <p className="app-card-description">{draft.description}</p>
                  </div>

                  <div className="app-row-summary-meta">
                    <span>{app.calls} calls</span>
                    <span className="app-row-chevron">{expanded ? '–' : '+'}</span>
                  </div>
                </button>

                {expanded ? (
                  <div className="app-row-expanded">
                    <div className="app-field-stack">
                      <div className="app-static-field">
                        <span>Client ID</span>
                        <div className="app-static-field-value mono">{app.clientId}</div>
                      </div>

                      <div className="app-static-field">
                        <span>Client secret</span>
                        <div className="app-static-field-value mono app-static-field-secret">
                          <span>{draft.showSecret ? app.clientSecret : '••••••••••••••••••••'}</span>
                          <button
                            type="button"
                            className="app-inline-link"
                            onClick={() => toggleSecret(app.id)}
                          >
                            {draft.showSecret ? 'Hide' : 'Show'}
                          </button>
                        </div>
                      </div>

                      <label className="app-edit-field">
                        <span>Redirect URI</span>
                        <input
                          className="input"
                          type="text"
                          value={draft.redirectUri}
                          onChange={(e) => handleRedirectChange(app.id, e.target.value)}
                          placeholder="https://your-app.com/callback"
                        />
                      </label>

                      <label className="app-edit-field">
                        <span>Description</span>
                        <textarea
                          className="input app-textarea"
                          value={draft.description}
                          onChange={(e) => handleDescriptionChange(app.id, e.target.value)}
                          placeholder="Describe what this app is used for"
                        />
                      </label>
                    </div>

                    <div className="app-card-actions app-card-actions-refined">
                      <button
                        type="button"
                        className="app-ghost-action"
                        onClick={() => setConfirmRegenerateAppId(app.id)}
                      >
                        Regenerate credentials
                      </button>
                      <button
                        type="button"
                        className="button home-v2-button-primary"
                        onClick={() => handleSaveApp(app.id)}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        className="app-icon-button danger"
                        onClick={() => deleteApp(app.id)}
                        aria-label={`Delete ${app.name}`}
                        title="Delete app"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      <section className="app-section">
        <div className="app-section-header compact">
          <div>
            <p className="app-section-kicker">Map partners</p>
          </div>
        </div>

        <div className="app-upload-grid">
          <div className="app-upload-card">
            <h4>Upload CSV</h4>
            <p>Choose a raw CSV file to populate your partner map and begin impact detection.</p>
            <button type="button" className="button home-v2-button-primary" onClick={openCsvPicker}>
              Upload CSV
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="app-hidden-file-input"
              onChange={onCsvSelected}
            />
          </div>

          <div className="app-upload-card">
            <h4>Submit raw JSON</h4>
            <p>Open a JSON input box and paste partner mapping payloads directly into the workspace.</p>
            <button type="button" className="app-ghost-action" onClick={() => setJsonModalOpen(true)}>
              Submit raw JSON
            </button>
          </div>
        </div>

        <div className="app-table-shell">
          <div className="app-table-toolbar">
            <input
              type="text"
              className="input app-table-search"
              placeholder="Search partner map"
              value={partnerSearchTerm}
              onChange={(e) => setPartnerSearchTerm(e.target.value)}
            />

            <div className="app-table-filters app-filter-container">
              <button
                type="button"
                className="app-ghost-action app-filter-chip"
                onClick={() => setFilterOpen((prev) => !prev)}
              >
                Filter
              </button>

              {filterOpen ? (
                <div className="app-filter-dropdown">
                  <input
                    type="text"
                    className="input app-filter-search"
                    placeholder="Search filters"
                    value={filterSearchTerm}
                    onChange={(e) => setFilterSearchTerm(e.target.value)}
                  />

                  <div className="app-filter-actions">
                    <button type="button" className="app-inline-link" onClick={clearFilters}>
                      Clear all
                    </button>
                  </div>

                  <div className="app-filter-section">
                    <strong>Scopes</strong>
                    <div className="app-filter-options">
                      {filteredScopeOptions.length > 0 ? (
                        filteredScopeOptions.map((scope) => (
                          <label key={scope} className="app-filter-option">
                            <input
                              type="checkbox"
                              checked={selectedScopeFilters.includes(scope)}
                              onChange={() =>
                                toggleListValue(scope, selectedScopeFilters, setSelectedScopeFilters)
                              }
                            />
                            <span>{scope}</span>
                          </label>
                        ))
                      ) : (
                        <span className="app-filter-empty">No scopes found</span>
                      )}
                    </div>
                  </div>

                  <div className="app-filter-section">
                    <strong>Areas</strong>
                    <div className="app-filter-options">
                      {filteredAreaOptions.length > 0 ? (
                        filteredAreaOptions.map((area) => (
                          <label key={area} className="app-filter-option">
                            <input
                              type="checkbox"
                              checked={selectedAreaFilters.includes(area)}
                              onChange={() =>
                                toggleListValue(area, selectedAreaFilters, setSelectedAreaFilters)
                              }
                            />
                            <span>{area}</span>
                          </label>
                        ))
                      ) : (
                        <span className="app-filter-empty">No areas found</span>
                      )}
                    </div>
                  </div>

                  <div className="app-filter-section">
                    <strong>Status</strong>
                    <div className="app-filter-options">
                      {filteredStatusOptions.length > 0 ? (
                        filteredStatusOptions.map((status) => (
                          <label key={status} className="app-filter-option">
                            <input
                              type="checkbox"
                              checked={selectedStatusFilters.includes(status)}
                              onChange={() =>
                                toggleListValue(status, selectedStatusFilters, setSelectedStatusFilters)
                              }
                            />
                            <span>{status}</span>
                          </label>
                        ))
                      ) : (
                        <span className="app-filter-empty">No statuses found</span>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {hasPartnerMap ? (
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
                  {filteredPartnerRows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.partner}</td>
                      <td>{row.scopes}</td>
                      <td>{row.area}</td>
                      <td>
                        <span
                          className={
                            row.status.toLowerCase() === 'reviewing'
                              ? 'app-table-badge review'
                              : 'app-table-badge mapped'
                          }
                        >
                          {row.status}
                        </span>
                      </td>
                      <td>{row.updated}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="app-empty-state">
              <strong>Populate with partner map</strong>
              <p>
                Upload a CSV or submit raw JSON to create your searchable partner mapping table.
              </p>
            </div>
          )}
        </div>
      </section>

      {selectedNotification ? (
        <div className="app-modal-overlay" onClick={() => setSelectedNotification(null)}>
          <div className="app-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="app-modal-header">
              <div>
                <p className="app-section-kicker">Notification detail</p>
                <h3 className="app-modal-title">{selectedNotification.detailTitle}</h3>
              </div>

              <button
                type="button"
                className="app-icon-button"
                onClick={() => setSelectedNotification(null)}
                aria-label="Close notification detail"
              >
                ✕
              </button>
            </div>

            <p className="app-modal-copy">{selectedNotification.detailBody}</p>

            <div className="app-modal-meta">
              <span
                className={`app-status-badge ${
                  selectedNotification.severity === 'high'
                    ? 'review'
                    : selectedNotification.severity === 'medium'
                      ? 'review'
                      : 'sandbox'
                }`}
              >
                {selectedNotification.severity.toUpperCase()}
              </span>
              <span>{selectedNotification.partners}</span>
            </div>

            <div className="app-modal-json">
              <pre>{selectedNotification.detailJson}</pre>
            </div>
          </div>
        </div>
      ) : null}

      {jsonModalOpen ? (
        <div className="app-modal-overlay" onClick={() => setJsonModalOpen(false)}>
          <div className="app-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="app-modal-header">
              <div>
                <p className="app-section-kicker">Raw JSON input</p>
                <h3 className="app-modal-title">Submit partner mapping JSON</h3>
              </div>

              <button
                type="button"
                className="app-icon-button"
                onClick={() => setJsonModalOpen(false)}
                aria-label="Close JSON modal"
              >
                ✕
              </button>
            </div>

            <textarea
              className="input app-json-textarea"
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder={`{\n  "partners": [\n    {\n      "partner": "Northstar Bank",\n      "scopes": ["auth:legacy"],\n      "area": "Auth",\n      "status": "Mapped"\n    }\n  ]\n}`}
            />

            <div className="app-card-actions app-card-actions-refined">
              <button
                type="button"
                className="app-ghost-action"
                onClick={() => setJsonModalOpen(false)}
              >
                Cancel
              </button>
              <button type="button" className="button home-v2-button-primary" onClick={handleSubmitJson}>
                Submit JSON
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {createAppModalOpen ? (
        <div className="app-modal-overlay" onClick={() => setCreateAppModalOpen(false)}>
          <div className="app-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="app-modal-header">
              <div>
                <p className="app-section-kicker">Create app</p>
                <h3 className="app-modal-title">Add a new workspace app</h3>
              </div>

              <button
                type="button"
                className="app-icon-button"
                onClick={() => setCreateAppModalOpen(false)}
                aria-label="Close create app modal"
              >
                ✕
              </button>
            </div>

            <div className="app-field-stack">
              <label className="app-edit-field">
                <span>App name</span>
                <input
                  className="input"
                  type="text"
                  value={newAppName}
                  onChange={(e) => setNewAppName(e.target.value)}
                  placeholder="Required"
                />
              </label>

              <label className="app-edit-field">
                <span>Redirect URI</span>
                <input
                  className="input"
                  type="text"
                  value={newAppRedirectUri}
                  onChange={(e) => setNewAppRedirectUri(e.target.value)}
                  placeholder="Optional"
                />
              </label>

              <label className="app-edit-field">
                <span>Description</span>
                <textarea
                  className="input app-textarea"
                  value={newAppDescription}
                  onChange={(e) => setNewAppDescription(e.target.value)}
                  placeholder="Optional"
                />
              </label>
            </div>

            <div className="app-card-actions app-card-actions-refined">
              <button
                type="button"
                className="app-ghost-action"
                onClick={() => setCreateAppModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="button home-v2-button-primary"
                onClick={handleCreateApp}
                disabled={!newAppName.trim()}
              >
                Create app
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {confirmRegenerateAppId ? (
        <div className="app-modal-overlay" onClick={() => setConfirmRegenerateAppId(null)}>
          <div className="app-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="app-modal-header">
              <div>
                <p className="app-section-kicker">Regenerate credentials</p>
                <h3 className="app-modal-title">Are you sure you want to regenerate credentials?</h3>
              </div>

              <button
                type="button"
                className="app-icon-button"
                onClick={() => setConfirmRegenerateAppId(null)}
                aria-label="Close regenerate credentials modal"
              >
                ✕
              </button>
            </div>

            <p className="app-modal-copy">
              This will replace the current client ID and client secret for this app in the current workspace view.
            </p>

            <div className="app-card-actions app-card-actions-refined">
              <button
                type="button"
                className="app-ghost-action"
                onClick={() => setConfirmRegenerateAppId(null)}
              >
                No
              </button>
              <button
                type="button"
                className="button home-v2-button-primary"
                onClick={() => handleRegenerateCredentials(confirmRegenerateAppId)}
              >
                Yes, regenerate
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}