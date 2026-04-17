'use client';

import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  fetchPartners,
  uploadPartnersCSV,
  uploadPartnersJSON,
  type PartnerRow,
} from '@/app/app/lib/partner-api';

type AppRow = {
  id: number;
  name: string;
  description: string;
  status: 'Sandbox' | 'Production review';
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  calls: string;
};

type AppApiRow = {
  id: number;
  name: string;
  description?: string | null;
  status: string;
  client_id: string;
  client_secret: string;
  redirect_uri?: string | null;
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

type AppDrafts = Record<
  number,
  {
    redirectUri: string;
    description: string;
    showSecret: boolean;
  }
>;

type JsonPartnerInput = {
  partner?: unknown;
  partner_name?: unknown;
  name?: unknown;
  scopes?: unknown;
  area?: unknown;
  status?: unknown;
  extra?: unknown;
};

type StoredUser = {
  user_id: number;
  email: string;
  full_name: string;
  workspace_id: number;
  workspace_name: string;
};

type ImpactModalState = {
  partnerName: string;
  status: string;
  reason: string;
} | null;

const API_BASE = 'http://127.0.0.1:8000';

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
    detailJson: `{"severity":"high","change_type":"breaking change","impacted_partners":["Northstar Bank","Orbit HR"],"recommended_action":"Escalate to partner owners and support readiness","status":"pending_review"}`,
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
    detailJson: `{"severity":"medium","change_type":"authentication","impacted_partners":["Northstar Bank","Orbit HR","Helios Marketplace"],"recommended_action":"Review migration guidance before rollout","status":"needs_guidance"}`,
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
    detailJson: `{"severity":"low","change_type":"sandbox","impacted_partners":[],"recommended_action":"No action required","status":"healthy"}`,
  },
];

function generateClientId() {
  return `cli_sbx_${Math.random().toString(36).slice(2, 12)}`;
}

function generateClientSecret() {
  return `sec_sbx_${Math.random().toString(36).slice(2, 18)}`;
}

function normalizeStatus(status: string): 'Sandbox' | 'Production review' {
  return status.toLowerCase() === 'sandbox' ? 'Sandbox' : 'Production review';
}

function mapApiAppToRow(app: AppApiRow): AppRow {
  return {
    id: app.id,
    name: app.name,
    description: app.description ?? '',
    status: normalizeStatus(app.status),
    clientId: app.client_id,
    clientSecret: app.client_secret,
    redirectUri: app.redirect_uri ?? '',
    calls: '0',
  };
}

function splitScopes(value: string[] | string | null | undefined): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean);
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeJsonRows(rows: unknown): JsonPartnerInput[] {
  if (!Array.isArray(rows)) return [];

  return rows
    .map((row) => {
      if (!row || typeof row !== 'object') return null;
      return row as JsonPartnerInput;
    })
    .filter((row): row is JsonPartnerInput => row !== null);
}

function normalizeImpactStatus(status: string | undefined): 'none' | 'low' | 'medium' | 'high' {
  const value = (status ?? '').toLowerCase();
  if (value === 'high') return 'high';
  if (value === 'medium') return 'medium';
  if (value === 'low') return 'low';
  return 'none';
}

function TrashIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

export default function AppHomePage() {
  const [apps, setApps] = useState<AppRow[]>([]);
  const [appsLoading, setAppsLoading] = useState(true);
  const [appsError, setAppsError] = useState('');
  const [expandedAppId, setExpandedAppId] = useState<number | null>(null);
  const [selectedNotification, setSelectedNotification] = useState<NotificationRow | null>(null);
  const [selectedPartnerImpact, setSelectedPartnerImpact] = useState<ImpactModalState>(null);
  const [jsonModalOpen, setJsonModalOpen] = useState(false);
  const [createAppModalOpen, setCreateAppModalOpen] = useState(false);
  const [confirmRegenerateAppId, setConfirmRegenerateAppId] = useState<number | null>(null);
  const [confirmDeleteAppId, setConfirmDeleteAppId] = useState<number | null>(null);
  const [jsonInput, setJsonInput] = useState('');
  const [partnerSearchTerm, setPartnerSearchTerm] = useState('');
  const [columnPickerOpen, setColumnPickerOpen] = useState(false);
  const [columnPickerSearch, setColumnPickerSearch] = useState('');
  const [newAppName, setNewAppName] = useState('');
  const [newAppRedirectUri, setNewAppRedirectUri] = useState('');
  const [newAppDescription, setNewAppDescription] = useState('');
  const [partnerRows, setPartnerRows] = useState<PartnerRow[]>([]);
  const [partnerColumns, setPartnerColumns] = useState<string[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const [appDrafts, setAppDrafts] = useState<AppDrafts>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [saveNotice, setSaveNotice] = useState('');
  const [workspaceId, setWorkspaceId] = useState<number | null>(null);
  const saveNoticeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function fetchApps() {
    try {
      setAppsError('');
      setAppsLoading(true);

      if (!workspaceId) {
        setApps([]);
        return;
      }

      const res = await fetch(`${API_BASE}/apps/list/${workspaceId}`);
      const data = await res.json();

      if (!res.ok) {
        setAppsError(data.detail || 'Unable to load apps.');
        setApps([]);
        return;
      }

      const nextApps: AppRow[] = ((data.apps ?? []) as AppApiRow[]).map(mapApiAppToRow);

      setApps(nextApps);
      setExpandedAppId((prev) => prev ?? nextApps[0]?.id ?? null);

      setAppDrafts(
        Object.fromEntries(
          nextApps.map((app: AppRow) => [
            app.id,
            {
              redirectUri: app.redirectUri,
              description: app.description,
              showSecret: false,
            },
          ])
        ) as AppDrafts
      );
    } catch {
      setAppsError('Unable to reach the server.');
      setApps([]);
    } finally {
      setAppsLoading(false);
    }
  }

  useEffect(() => {
    const raw = localStorage.getItem('opsentry_user');

    if (!raw) return;

    try {
      const user = JSON.parse(raw) as StoredUser;
      setWorkspaceId(user.workspace_id);
    } catch {
      localStorage.removeItem('opsentry_user');
    }
  }, []);

  async function loadPartners() {
    try {
      if (!workspaceId) {
        setPartnerRows([]);
        setPartnerColumns([]);
        setVisibleColumns([]);
        return;
      }

      const response = await fetchPartners(workspaceId);

      if (!response.success) {
        setPartnerRows([]);
        setPartnerColumns([]);
        setVisibleColumns([]);
        return;
      }

      const nextRows = response.rows ?? [];
      const nextColumns = Array.isArray(response.columns) ? response.columns : [];

      setPartnerRows(nextRows);
      setPartnerColumns(nextColumns);
      setVisibleColumns(nextColumns);
    } catch {
      setPartnerRows([]);
      setPartnerColumns([]);
      setVisibleColumns([]);
    }
  }

  function showSaveNotice(message: string) {
    setSaveNotice(message);

    if (saveNoticeTimeoutRef.current) {
      clearTimeout(saveNoticeTimeoutRef.current);
    }

    saveNoticeTimeoutRef.current = setTimeout(() => {
      setSaveNotice('');
    }, 2000);
  }

  useEffect(() => {
    if (!workspaceId) return;

    fetchApps();
    loadPartners();
  }, [workspaceId]);

  useEffect(() => {
    return () => {
      if (saveNoticeTimeoutRef.current) {
        clearTimeout(saveNoticeTimeoutRef.current);
      }
    };
  }, []);

  const hasPartnerMap = partnerRows.length > 0;

  const filteredPartnerRows = useMemo(() => {
    const term = partnerSearchTerm.trim().toLowerCase();
    if (!term) return partnerRows;

    return partnerRows.filter((row) => {
      const haystack = [
        row.partner_name,
        row.area,
        row.status,
        ...(row.scopes ?? []),
        ...Object.values(row.row_data ?? {}).map((value) => String(value)),
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [partnerRows, partnerSearchTerm]);

  const filteredColumnOptions = useMemo(() => {
    const term = columnPickerSearch.trim().toLowerCase();
    if (!term) return partnerColumns;

    return partnerColumns.filter((column) => column.toLowerCase().includes(term));
  }, [partnerColumns, columnPickerSearch]);

  function toggleVisibleColumn(column: string) {
    setVisibleColumns((prev) =>
      prev.includes(column)
        ? prev.filter((item) => item !== column)
        : partnerColumns.filter((item) => item === column || prev.includes(item))
    );
  }

  function showAllColumns() {
    setVisibleColumns(partnerColumns);
  }

  function handleRedirectChange(appId: number, value: string) {
    setAppDrafts((prev) => ({
      ...prev,
      [appId]: {
        ...(prev[appId] ?? { redirectUri: '', description: '', showSecret: false }),
        redirectUri: value,
      },
    }));
  }

  function handleDescriptionChange(appId: number, value: string) {
    setAppDrafts((prev) => ({
      ...prev,
      [appId]: {
        ...(prev[appId] ?? { redirectUri: '', description: '', showSecret: false }),
        description: value,
      },
    }));
  }

  function toggleSecret(appId: number) {
    setAppDrafts((prev) => ({
      ...prev,
      [appId]: {
        ...(prev[appId] ?? { redirectUri: '', description: '', showSecret: false }),
        showSecret: !(prev[appId]?.showSecret ?? false),
      },
    }));
  }

  async function deleteApp(appId: number) {
    try {
      const res = await fetch(`${API_BASE}/apps/delete/${appId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.detail || 'Unable to delete app.');
        return;
      }

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

      setConfirmDeleteAppId(null);
    } catch {
      alert('Unable to reach the server.');
    }
  }

  function openCsvPicker() {
    fileInputRef.current?.click();
  }

  async function onCsvSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const csvText = await file.text();

      if (!workspaceId) {
        alert('No workspace found for current session.');
        return;
      }

      const response = await uploadPartnersCSV(workspaceId, csvText);

      if (!response.success) {
        alert('Unable to upload CSV.');
        return;
      }

      await loadPartners();
      setColumnPickerOpen(false);
      event.target.value = '';
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Unable to upload CSV.');
    }
  }

  async function handleCreateApp() {
    const trimmedName = newAppName.trim();
    if (!trimmedName) return;

    if (!workspaceId) {
      alert('No workspace found for current session.');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/apps/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspaceId,
          name: trimmedName,
          description: newAppDescription.trim(),
          redirect_uri: newAppRedirectUri.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.detail || 'Unable to create app.');
        return;
      }

      const createdApp = mapApiAppToRow(data.app);
      setApps((prev) => [createdApp, ...prev]);
      setAppDrafts((prev) => ({
        ...prev,
        [createdApp.id]: {
          redirectUri: createdApp.redirectUri,
          description: createdApp.description,
          showSecret: false,
        },
      }));
      setExpandedAppId(createdApp.id);
      setCreateAppModalOpen(false);
      setNewAppName('');
      setNewAppRedirectUri('');
      setNewAppDescription('');
    } catch {
      alert('Unable to reach the server.');
    }
  }

  async function handleSubmitJson() {
    try {
      const parsed = JSON.parse(jsonInput) as unknown;
      const rows = Array.isArray(parsed)
        ? normalizeJsonRows(parsed)
        : normalizeJsonRows((parsed as { partners?: unknown })?.partners ?? []);

      if (!workspaceId) {
        alert('No workspace found for current session.');
        return;
      }

      const response = await uploadPartnersJSON(workspaceId, rows);

      if (!response.success) {
        alert('Unable to upload partner JSON.');
        return;
      }

      await loadPartners();
      setJsonModalOpen(false);
      setJsonInput('');
      setColumnPickerOpen(false);
    } catch (error) {
      const message =
        error instanceof SyntaxError
          ? 'Invalid JSON format. Please check your payload and try again.'
          : error instanceof Error
          ? error.message
          : 'Unable to upload partner JSON.';

      alert(message);
    }
  }

  async function handleSaveApp(appId: number) {
    const draft = appDrafts[appId];
    const existing = apps.find((app) => app.id === appId);
    if (!draft || !existing) return;

    try {
      const res = await fetch(`${API_BASE}/apps/update/${appId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: existing.name,
          description: draft.description,
          redirect_uri: draft.redirectUri,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.detail || 'Unable to save app.');
        return;
      }

      const updated = data.app;

      setApps((prev) =>
        prev.map((app) =>
          app.id !== appId
            ? app
            : {
                ...app,
                name: updated.name,
                description: updated.description ?? '',
                status: normalizeStatus(updated.status),
                clientId: updated.client_id,
                clientSecret: updated.client_secret,
                redirectUri: updated.redirect_uri ?? '',
              }
        )
      );

      setAppDrafts((prev) => ({
        ...prev,
        [appId]: {
          redirectUri: updated.redirect_uri ?? '',
          description: updated.description ?? '',
          showSecret: prev[appId]?.showSecret ?? false,
        },
      }));

      showSaveNotice('App saved');
    } catch {
      alert('Unable to reach the server.');
    }
  }

  function handleRegenerateCredentials(appId: number) {
    const target = apps.find((app) => app.id === appId);
    if (!target) {
      setConfirmRegenerateAppId(null);
      return;
    }

    setApps((prev) =>
      prev.map((app) =>
        app.id === appId
          ? { ...app, clientId: generateClientId(), clientSecret: generateClientSecret() }
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
    alert('Credential regeneration is UI-only right now. Backend endpoint not wired yet.');
  }

  function openImpactDetails(row: PartnerRow) {
    const status = normalizeImpactStatus(row.impact_status);
    const label =
      status === 'high' ? 'High' : status === 'medium' ? 'Medium' : status === 'low' ? 'Low' : 'Healthy';

    setSelectedPartnerImpact({
      partnerName: row.partner_name || 'Unknown partner',
      status: label,
      reason: row.impact_reason || 'No active impact detected for this partner row.',
    });
  }

  return (
    <div className="app-dashboard">
      {saveNotice ? (
        <div className="app-save-notice" role="status" aria-live="polite">
          {saveNotice}
        </div>
      ) : null}

      <section className="app-command-bar">
        <div className="app-command-left">
          <div className="app-command-signal-row">
            <div className="app-command-signal">
              <span className="app-signal-dot green" />
              <span>Sandbox workspace</span>
            </div>

            <div className="app-command-signal">
              <span className={`app-signal-dot ${apps.length > 0 ? 'green' : 'red'}`} />
              <span>{apps.length} apps created</span>
            </div>

            <div className="app-command-signal">
              <span className={`app-signal-dot ${hasPartnerMap ? 'green' : 'red'}`} />
              <span>{hasPartnerMap ? 'Partner map uploaded' : 'Partner map not uploaded'}</span>
            </div>
          </div>

          <div className="app-command-summary">
            <strong>{notifications.length} active notifications</strong>
            <span>
              {notifications.filter((item) => item.severity === 'high').length > 0
                ? `${notifications.filter((item) => item.severity === 'high').length} high-priority items need review`
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

        {appsError ? <p className="login-v2-feedback login-v2-feedback-error">{appsError}</p> : null}
        {appsLoading ? <p className="small">Loading apps...</p> : null}

        {!appsLoading && apps.length === 0 ? (
          <div className="app-empty-state compact">
            <strong>No apps yet</strong>
            <p>Create your first app to start managing credentials and sandbox workflows.</p>
          </div>
        ) : null}

        <div className="app-row-stack">
          {apps.map((app) => {
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
                        onClick={() => setConfirmDeleteAppId(app.id)}
                        aria-label={`Delete ${app.name}`}
                        title="Delete app"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      <section className="app-section app-partner-workspace-section">
        <div className="app-section-header compact">
          <div>
            <p className="app-section-kicker">Map partners</p>
          </div>
        </div>

        <div className="app-upload-grid">
          <div className="app-upload-card">
            <h4>Upload CSV</h4>
            <p>Choose a raw CSV file to populate your partner map and begin impact detection.</p>
            <button
              type="button"
              className="button home-v2-button-primary"
              onClick={openCsvPicker}
            >
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
            <button
              type="button"
              className="app-ghost-action"
              onClick={() => setJsonModalOpen(true)}
            >
              Submit raw JSON
            </button>
          </div>
        </div>

        <div className="app-table-shell app-table-shell-fixed">
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
                onClick={() => setColumnPickerOpen((prev) => !prev)}
              >
                Columns
              </button>

              {columnPickerOpen ? (
                <div className="app-filter-dropdown">
                  <input
                    type="text"
                    className="input app-filter-search"
                    placeholder="Search column headers"
                    value={columnPickerSearch}
                    onChange={(e) => setColumnPickerSearch(e.target.value)}
                  />

                  <div className="app-filter-actions">
                    <button type="button" className="app-inline-link" onClick={showAllColumns}>
                      Show all
                    </button>
                  </div>

                  <div className="app-filter-section">
                    <strong>Spreadsheet columns</strong>
                    <div className="app-filter-options">
                      {filteredColumnOptions.map((column) => (
                        <label key={column} className="app-filter-option">
                          <input
                            type="checkbox"
                            checked={visibleColumns.includes(column)}
                            onChange={() => toggleVisibleColumn(column)}
                          />
                          <span>{column}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {hasPartnerMap ? (
            <div className="app-table-wrap app-table-wrap-fixed">
              <table className="app-table app-partner-data-table">
                <thead>
                  <tr>
                    <th className="app-sticky-left app-sticky-impact">Impact</th>
                    {visibleColumns.map((column) => (
                      <th key={column}>{column}</th>
                    ))}
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPartnerRows.map((row) => {
                    const severity = normalizeImpactStatus(row.impact_status);

                    return (
                      <tr key={row.id} className={`app-partner-row app-partner-row-${severity}`}>
                        <td className="app-sticky-left app-sticky-impact app-impact-cell">
                          <button
                            type="button"
                            className={`app-impact-dot-button app-impact-${severity}`}
                            title={row.impact_reason || 'No active impact detected'}
                            onClick={() => openImpactDetails(row)}
                            aria-label={`Open impact details for ${row.partner_name || 'partner'}`}
                          >
                            <span className="app-impact-light" />
                          </button>
                        </td>

                        {visibleColumns.map((column) => {
                          const value = String(row.row_data?.[column] ?? '');

                          return (
                            <td key={`${row.id}-${column}`}>
                              <div className="app-table-view-value" title={value}>
                                {value || '—'}
                              </div>
                            </td>
                          );
                        })}

                        <td className="app-updated-cell">
                          {new Date(row.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="app-empty-state">
              <strong>Populate with partner map</strong>
              <p>Upload a CSV or submit raw JSON to create your searchable partner mapping table.</p>
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
                  selectedNotification.severity === 'low' ? 'sandbox' : 'review'
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

      {selectedPartnerImpact ? (
        <div className="app-modal-overlay" onClick={() => setSelectedPartnerImpact(null)}>
          <div className="app-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="app-modal-header">
              <div>
                <p className="app-section-kicker">Impact detail</p>
                <h3 className="app-modal-title">{selectedPartnerImpact.partnerName}</h3>
              </div>
              <button
                type="button"
                className="app-icon-button"
                onClick={() => setSelectedPartnerImpact(null)}
                aria-label="Close impact detail"
              >
                ✕
              </button>
            </div>

            <div className="app-modal-meta">
              <span className="app-impact-detail-label">Status: {selectedPartnerImpact.status}</span>
            </div>

            <p className="app-modal-copy">{selectedPartnerImpact.reason}</p>
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
              placeholder={`{\n  "partners": [\n    {\n      "partner_name": "Northstar Bank",\n      "scopes": ["auth:legacy"],\n      "area": "Auth",\n      "status": "Mapped"\n    }\n  ]\n}`}
            />

            <div className="app-card-actions app-card-actions-refined">
              <button
                type="button"
                className="app-ghost-action"
                onClick={() => setJsonModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="button home-v2-button-primary"
                onClick={handleSubmitJson}
              >
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

      {confirmDeleteAppId ? (
        <div className="app-modal-overlay" onClick={() => setConfirmDeleteAppId(null)}>
          <div className="app-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="app-modal-header">
              <div>
                <p className="app-section-kicker">Delete app</p>
                <h3 className="app-modal-title">Delete this app?</h3>
              </div>
              <button
                type="button"
                className="app-icon-button"
                onClick={() => setConfirmDeleteAppId(null)}
                aria-label="Close delete app modal"
              >
                ✕
              </button>
            </div>

            <p className="app-modal-copy">
              This will remove the app from the current workspace view. This action cannot be undone in the UI.
            </p>

            <div className="app-card-actions app-card-actions-refined">
              <button
                type="button"
                className="app-ghost-action"
                onClick={() => setConfirmDeleteAppId(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="button"
                onClick={() => confirmDeleteAppId && deleteApp(confirmDeleteAppId)}
              >
                Yes, delete app
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}