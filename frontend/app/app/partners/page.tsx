'use client';

import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  deletePartner,
  fetchPartners,
  resetPartners,
  updatePartner,
  uploadPartnersJSON,
} from '@/app/app/lib/partner-api';

type PartnerRow = {
  id: number;
  workspace_id: number;
  upload_id: number;
  partner_name: string;
  scopes: string[];
  area: string;
  status: string;
  extra: Record<string, unknown>;
  created_at: string;
  row_data: Record<string, unknown>;
  impact_status: string;
  impact_reason: string;
};

type DraftMap = Record<number, Record<string, string>>;

type JsonPartnerInput = Record<string, unknown>;

type StoredUser = {
  user_id: number;
  email: string;
  full_name: string;
  workspace_id: number;
  workspace_name: string;
};


function normalizeJsonRows(rows: unknown): JsonPartnerInput[] {
  if (!Array.isArray(rows)) return [];

  return rows
    .map((row) => {
      if (!row || typeof row !== 'object') return null;
      return row as JsonPartnerInput;
    })
    .filter((row): row is JsonPartnerInput => row !== null);
}

function parseCsv(text: string): JsonPartnerInput[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((header) => header.trim());

  return lines.slice(1).map((line) => {
    const values = line.split(',').map((value) => value.trim());
    const row: Record<string, string> = {};

    headers.forEach((header, index) => {
      row[header] = values[index] ?? '';
    });

    return row;
  });
}

function toDisplayString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.map((item) => String(item)).join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function buildDrafts(rows: PartnerRow[], columns: string[]): DraftMap {
  return Object.fromEntries(
    rows.map((row) => [
      row.id,
      Object.fromEntries(columns.map((column) => [column, toDisplayString(row.row_data?.[column] ?? '')])),
    ])
  );
}

function rowsToCsv(columns: string[], rows: PartnerRow[], drafts: DraftMap) {
  const headers = columns;
  const lines = [headers.join(',')];

  for (const row of rows) {
    const draft = drafts[row.id] ?? {};
    const values = headers.map((column) => draft[column] ?? toDisplayString(row.row_data?.[column] ?? ''));

    lines.push(
      values
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(',')
    );
  }

  return lines.join('\n');
}

function inferSearchText(row: PartnerRow, draft: Record<string, string>) {
  const dynamicValues = Object.values(draft).join(' ').toLowerCase();
  const helperValues = [
    row.partner_name,
    row.area,
    row.status,
    ...(row.scopes ?? []),
    Object.values(row.extra ?? {}).map((value) => String(value)),
  ]
    .flat()
    .join(' ')
    .toLowerCase();

  return `${dynamicValues} ${helperValues}`.trim();
}

export default function PartnersPage() {
  const [partnerRows, setPartnerRows] = useState<PartnerRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [partnerSearchTerm, setPartnerSearchTerm] = useState('');
  const [jsonModalOpen, setJsonModalOpen] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [drafts, setDrafts] = useState<DraftMap>({});
  const [dirtyRows, setDirtyRows] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [workspaceId, setWorkspaceId] = useState<number | null>(null);

  async function loadPartners() {
    try {
      setLoading(true);
      if (!workspaceId) return;
        const response = await fetchPartners(workspaceId);

      if (!response.success) {
        setFeedback('Unable to load partner rows.');
        setPartnerRows([]);
        setColumns([]);
        return;
      }

      const nextColumns = Array.isArray(response.columns) ? response.columns : [];
      const nextRows = (response.rows ?? []) as PartnerRow[];

      setColumns(nextColumns);
      setPartnerRows(nextRows);
      setDrafts(buildDrafts(nextRows, nextColumns));
      setDirtyRows([]);
      setFeedback('');
    } catch {
      setFeedback('Unable to reach the server.');
      setPartnerRows([]);
      setColumns([]);
    } finally {
      setLoading(false);
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

    useEffect(() => {
    if (!workspaceId) return;
    loadPartners();
    }, [workspaceId]);

  const filteredRows = useMemo(() => {
    const term = partnerSearchTerm.trim().toLowerCase();
    if (!term) return partnerRows;

    return partnerRows.filter((row) => {
      const draft = drafts[row.id] ?? {};
      return inferSearchText(row, draft).includes(term);
    });
  }, [partnerRows, drafts, partnerSearchTerm]);

  function updateDraft(rowId: number, column: string, value: string) {
    setDrafts((prev) => ({
      ...prev,
      [rowId]: {
        ...(prev[rowId] ?? {}),
        [column]: value,
      },
    }));

    setDirtyRows((prev) => (prev.includes(rowId) ? prev : [...prev, rowId]));
  }

  async function saveAllChanges() {
    if (dirtyRows.length === 0) return;

    try {
      for (const rowId of dirtyRows) {
        const row = partnerRows.find((item) => item.id === rowId);
        const draft = drafts[rowId];

        if (!row || !draft) continue;

        const nextExtra = { ...(row.extra ?? {}) };
        for (const column of columns) {
          nextExtra[column] = draft[column] ?? '';
        }

        const response = await updatePartner(rowId, {
          partner_name: row.partner_name,
          scopes: row.scopes,
          area: row.area,
          status: row.status,
          extra: nextExtra,
        });

        if (!response.success) {
          alert(response.detail || `Unable to save row ${rowId}.`);
          return;
        }
      }

      await loadPartners();
      setFeedback('Partner changes saved.');
    } catch {
      alert('Unable to reach the server.');
    }
  }

  function exportCsv() {
    const csv = rowsToCsv(columns, partnerRows, drafts);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'opsentry-partner-map.csv';
    link.click();
    window.URL.revokeObjectURL(url);
  }

  function openCsvPicker() {
    fileInputRef.current?.click();
  }

  async function onCsvSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const rows = parseCsv(text);
      if (!workspaceId) {
        alert('No workspace found for current session.');
        return;
        }

        const response = await uploadPartnersJSON(workspaceId, rows);

      if (!response.success) {
        alert(response.detail || 'Unable to upload CSV.');
        return;
      }

      await loadPartners();
      setFeedback('CSV uploaded.');
      event.target.value = '';
    } catch {
      alert('Unable to process CSV.');
    }
  }

  async function submitJson() {
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
        alert(response.detail || 'Unable to upload JSON.');
        return;
      }

      await loadPartners();
      setJsonModalOpen(false);
      setJsonInput('');
      setFeedback('JSON uploaded.');
    } catch {
      alert('Invalid JSON format. Please check your payload and try again.');
    }
  }

  async function handleResetPartnerMap() {
    const confirmed = window.confirm('This will replace/remove the current partner dataset for this workspace. Continue?');
    if (!confirmed) return;

    try {
            if (!workspaceId) {
        alert('No workspace found for current session.');
        return;
        }

        const response = await resetPartners(workspaceId);

      if (!response.success) {
        alert(response.detail || 'Unable to reset partner map.');
        return;
      }

      await loadPartners();
      setFeedback('Partner dataset reset.');
    } catch {
      alert('Unable to reach the server.');
    }
  }

  async function handleDeleteRow(rowId: number) {
    const confirmed = window.confirm('Delete this partner row?');
    if (!confirmed) return;

    try {
      const response = await deletePartner(rowId);

      if (!response.success) {
        alert(response.detail || 'Unable to delete partner row.');
        return;
      }

      await loadPartners();
      setFeedback('Partner row deleted.');
    } catch {
      alert('Unable to reach the server.');
    }
  }

  return (
    <div className="app-dashboard">
      <section className="app-section">
        <div className="app-section-header compact app-section-header-inline">
          <div>
            <p className="app-section-kicker">Partners</p>
          </div>

          <div className="app-section-actions">
            <button type="button" className="button home-v2-button-primary" onClick={openCsvPicker}>
              Upload CSV
            </button>
            <button type="button" className="app-ghost-action" onClick={() => setJsonModalOpen(true)}>
              Submit JSON
            </button>
            <button type="button" className="app-ghost-action" onClick={exportCsv}>
              Export CSV
            </button>
            <button type="button" className="app-ghost-action" onClick={handleResetPartnerMap}>
              Reset
            </button>
            <button
              type="button"
              className="button home-v2-button-primary"
              onClick={saveAllChanges}
              disabled={dirtyRows.length === 0}
            >
              Save changes
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="app-hidden-file-input"
              onChange={onCsvSelected}
            />
          </div>
        </div>

        {feedback ? <p className="small">{feedback}</p> : null}
        {loading ? <p className="small">Loading partner rows...</p> : null}

        <div className="app-table-shell">
          <div className="app-table-toolbar">
            <input
              type="text"
              className="input app-table-search"
              placeholder="Search across uploaded partner data"
              value={partnerSearchTerm}
              onChange={(e) => setPartnerSearchTerm(e.target.value)}
            />
          </div>

          <div className="app-table-wrap">
            <table className="app-table app-editable-table">
              <thead>
                <tr>
                  <th>Impact</th>
                  {columns.map((column) => (
                    <th key={column}>{column}</th>
                  ))}
                  <th>Updated</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => {
                  const draft = drafts[row.id] ?? {};

                  return (
                    <tr key={row.id}>
                      <td>
                        <button
                          type="button"
                          className="app-ghost-action"
                          title={row.impact_reason || 'No active impact detected'}
                          onClick={() =>
                            alert(row.impact_reason || 'No active impact detected for this partner row.')
                          }
                        >
                          {row.impact_status === 'high'
                            ? '🔴 High'
                            : row.impact_status === 'medium'
                            ? '🟠 Medium'
                            : row.impact_status === 'low'
                            ? '🟡 Low'
                            : '🟢 Fine'}
                        </button>
                      </td>

                      {columns.map((column) => (
                        <td key={`${row.id}-${column}`}>
                          <input
                            className="input app-table-input"
                            value={draft[column] ?? toDisplayString(row.row_data?.[column] ?? '')}
                            onChange={(e) => updateDraft(row.id, column, e.target.value)}
                          />
                        </td>
                      ))}

                      <td>{new Date(row.created_at).toLocaleDateString()}</td>

                      <td>
                        <button
                          type="button"
                          className="app-ghost-action"
                          onClick={() => handleDeleteRow(row.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {!loading && filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length + 3}>
                      <div className="app-empty-state">
                        <strong>No partner rows found</strong>
                        <p>Upload a CSV or submit raw JSON to populate this table.</p>
                      </div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </section>

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
              placeholder={`[\n  {\n    "partner": "Northstar Bank",\n    "scopes": "auth:legacy, payments:read",\n    "area": "Auth",\n    "status": "Mapped"\n  }\n]`}
            />

            <div className="app-card-actions app-card-actions-refined">
              <button type="button" className="app-ghost-action" onClick={() => setJsonModalOpen(false)}>
                Cancel
              </button>
              <button type="button" className="button home-v2-button-primary" onClick={submitJson}>
                Submit JSON
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}