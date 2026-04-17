'use client';

import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  createPartner,
  deletePartner,
  fetchPartners,
  resetPartners,
  updatePartner,
  uploadPartnersCSV,
  uploadPartnersJSON,
  type PartnerRow,
} from '@/app/app/lib/partner-api';

type DraftMap = Record<number, Record<string, string>>;
type JsonPartnerInput = Record<string, unknown>;
type TableMode = 'view' | 'edit';

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

type ConfirmModalState =
  | {
      kind: 'delete-row';
      rowId: number;
      partnerLabel: string;
    }
  | {
      kind: 'dataset-required';
      actionLabel: 'add' | 'delete';
    }
  | null;

type ReplaceAction = 'csv' | 'json' | null;

type NewDraftRow = {
  tempId: string;
  values: Record<string, string>;
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

function rowsToCsv(columns: string[], rows: PartnerRow[], drafts: DraftMap, newRows: NewDraftRow[]) {
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

  for (const row of newRows) {
    const values = headers.map((column) => row.values[column] ?? '');
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

function inferSearchTextForNewRow(values: Record<string, string>) {
  return Object.values(values).join(' ').toLowerCase();
}

function normalizeImpactStatus(status: string | undefined): 'none' | 'low' | 'medium' | 'high' {
  const value = (status ?? '').toLowerCase();
  if (value === 'high') return 'high';
  if (value === 'medium') return 'medium';
  if (value === 'low') return 'low';
  return 'none';
}

function impactLabel(status: 'none' | 'low' | 'medium' | 'high') {
  if (status === 'high') return 'High';
  if (status === 'medium') return 'Medium';
  if (status === 'low') return 'Low';
  return 'Healthy';
}

function buildBlankRow(columns: string[]): Record<string, string> {
  return Object.fromEntries(columns.map((column) => [column, '']));
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

function PlusIcon() {
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
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

export default function PartnersPage() {
  const [partnerRows, setPartnerRows] = useState<PartnerRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [partnerSearchTerm, setPartnerSearchTerm] = useState('');
  const [jsonModalOpen, setJsonModalOpen] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [drafts, setDrafts] = useState<DraftMap>({});
  const [dirtyRows, setDirtyRows] = useState<number[]>([]);
  const [newRows, setNewRows] = useState<NewDraftRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState('');
  const [tableMode, setTableMode] = useState<TableMode>('view');
  const [deleteMode, setDeleteMode] = useState(false);
  const [impactModal, setImpactModal] = useState<ImpactModalState>(null);
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>(null);
  const [deleteTableModalOpen, setDeleteTableModalOpen] = useState(false);
  const [replaceModalOpen, setReplaceModalOpen] = useState(false);
  const [pendingReplaceAction, setPendingReplaceAction] = useState<ReplaceAction>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [workspaceId, setWorkspaceId] = useState<number | null>(null);

  const hasDataset = columns.length > 0;

  async function loadPartners() {
    try {
      setLoading(true);

      if (!workspaceId) {
        setPartnerRows([]);
        setColumns([]);
        setNewRows([]);
        return;
      }

      const response = await fetchPartners(workspaceId);

      if (!response.success) {
        setFeedback('Unable to load partner rows.');
        setPartnerRows([]);
        setColumns([]);
        setNewRows([]);
        return;
      }

      const nextColumns = Array.isArray(response.columns) ? response.columns : [];
      const nextRows = response.rows ?? [];

      setColumns(nextColumns);
      setPartnerRows(nextRows);
      setDrafts(buildDrafts(nextRows, nextColumns));
      setDirtyRows([]);
      setNewRows([]);
      setDeleteMode(false);
      setFeedback('');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Unable to reach the server.');
      setPartnerRows([]);
      setColumns([]);
      setNewRows([]);
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

  const filteredNewRows = useMemo(() => {
    const term = partnerSearchTerm.trim().toLowerCase();
    if (!term) return newRows;

    return newRows.filter((row) => inferSearchTextForNewRow(row.values).includes(term));
  }, [newRows, partnerSearchTerm]);

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

  function updateNewRowValue(tempId: string, column: string, value: string) {
    setNewRows((prev) =>
      prev.map((row) =>
        row.tempId === tempId
          ? {
              ...row,
              values: {
                ...row.values,
                [column]: value,
              },
            }
          : row
      )
    );
  }

  function openDatasetRequiredModal(actionLabel: 'add' | 'delete') {
    setConfirmModal({
      kind: 'dataset-required',
      actionLabel,
    });
  }

  function handleAddRow() {
    if (!hasDataset) {
      openDatasetRequiredModal('add');
      return;
    }

    const tempId = `new-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setNewRows((prev) => [
      ...prev,
      {
        tempId,
        values: buildBlankRow(columns),
      },
    ]);
    setDeleteMode(false);
  }

  function toggleDeleteMode() {
    if (!hasDataset) {
      openDatasetRequiredModal('delete');
      return;
    }

    setDeleteMode((prev) => !prev);
  }

  async function saveAllChanges() {
    if (dirtyRows.length === 0 && newRows.length === 0) return;
    if (!workspaceId) {
      setFeedback('No workspace found for current session.');
      return;
    }

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
          setFeedback(`Unable to save row ${rowId}.`);
          return;
        }
      }

      for (const row of newRows) {
        const createResponse = await createPartner({
          workspace_id: workspaceId,
          row_data: row.values,
        });

        if (!createResponse.success) {
          setFeedback('Unable to create new row.');
          return;
        }
      }

      await loadPartners();
      setFeedback('Partner changes saved.');
      setTableMode('view');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Unable to reach the server.');
    }
  }

  function exportCsv() {
    const csv = rowsToCsv(columns, partnerRows, drafts, newRows);
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

  function handleUploadCsvClick() {
    if (hasDataset) {
      setPendingReplaceAction('csv');
      setReplaceModalOpen(true);
      return;
    }
    openCsvPicker();
  }

  function handleOpenJsonClick() {
    if (hasDataset) {
      setPendingReplaceAction('json');
      setReplaceModalOpen(true);
      return;
    }
    setJsonModalOpen(true);
  }

  async function onCsvSelected(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const csvText = await file.text();

      if (!workspaceId) {
        setFeedback('No workspace found for current session.');
        return;
      }

      const response = await uploadPartnersCSV(workspaceId, csvText);

      if (!response.success) {
        setFeedback('Unable to upload CSV.');
        return;
      }

      await loadPartners();
      setFeedback('CSV uploaded.');
      event.target.value = '';
      setTableMode('view');
      setDeleteMode(false);
      setReplaceModalOpen(false);
      setPendingReplaceAction(null);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Unable to process CSV.');
    }
  }

  async function submitJson(): Promise<void> {
    try {
      const parsed = JSON.parse(jsonInput) as unknown;
      const rows = Array.isArray(parsed)
        ? normalizeJsonRows(parsed)
        : normalizeJsonRows((parsed as { partners?: unknown })?.partners ?? []);

      if (!workspaceId) {
        setFeedback('No workspace found for current session.');
        return;
      }

      const response = await uploadPartnersJSON(workspaceId, rows);

      if (!response.success) {
        setFeedback('Unable to upload JSON.');
        return;
      }

      await loadPartners();
      setJsonModalOpen(false);
      setJsonInput('');
      setFeedback('JSON uploaded.');
      setTableMode('view');
      setDeleteMode(false);
      setReplaceModalOpen(false);
      setPendingReplaceAction(null);
    } catch (error) {
      const message =
        error instanceof SyntaxError
          ? 'Invalid JSON format. Please check your payload and try again.'
          : error instanceof Error
          ? error.message
          : 'Unable to upload JSON.';

      setFeedback(message);
    }
  }

  async function handleDeleteTable() {
    try {
      if (!workspaceId) {
        setFeedback('No workspace found for current session.');
        return;
      }

      const response = await resetPartners(workspaceId);

      if (!response.success) {
        setFeedback('Unable to delete partner table.');
        return;
      }

      await loadPartners();
      setFeedback('Partner table deleted.');
      setTableMode('view');
      setDeleteMode(false);
      setDeleteTableModalOpen(false);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Unable to reach the server.');
    }
  }

  function requestDeleteRow(rowId: number, partnerLabel: string) {
    setConfirmModal({
      kind: 'delete-row',
      rowId,
      partnerLabel,
    });
  }

async function handleDeleteRow(rowId: number) {
  const shouldStayInDeleteMode = deleteMode;

  try {
    const response = await deletePartner(rowId);

    if (!response.success) {
      setFeedback('Unable to delete partner row.');
      return;
    }

    await loadPartners();

    if (shouldStayInDeleteMode) {
      setDeleteMode(true);
      setTableMode('edit');
    }

    setFeedback('Partner row deleted.');
  } catch (error) {
    setFeedback(error instanceof Error ? error.message : 'Unable to reach the server.');
  } finally {
    setConfirmModal(null);
  }
}

  function openImpactDetails(row: PartnerRow) {
    const status = normalizeImpactStatus(row.impact_status);
    setImpactModal({
      partnerName: row.partner_name || 'Unknown partner',
      status: impactLabel(status),
      reason: row.impact_reason || 'No active impact detected for this partner row.',
    });
  }

  function confirmReplaceData() {
    setReplaceModalOpen(false);

    if (pendingReplaceAction === 'csv') {
      openCsvPicker();
      return;
    }

    if (pendingReplaceAction === 'json') {
      setJsonModalOpen(true);
    }
  }

  return (
    <div className="app-dashboard">
      <section className="app-section app-partner-workspace-section">
        <div className="app-section-header compact app-section-header-inline">
          <div>
            <p className="app-section-kicker">Partners</p>
          </div>

          <div className="app-section-actions">
            <div className="app-table-mode-toggle" role="tablist" aria-label="Partner table mode">
              <button
                type="button"
                className={`app-table-mode-button ${tableMode === 'view' ? 'active' : ''}`}
                onClick={() => {
                  setTableMode('view');
                  setDeleteMode(false);
                }}
              >
                View
              </button>
              <button
                type="button"
                className={`app-table-mode-button ${tableMode === 'edit' ? 'active' : ''}`}
                onClick={() => setTableMode('edit')}
              >
                Edit
              </button>
            </div>

            <button type="button" className="button home-v2-button-primary" onClick={handleUploadCsvClick}>
              Upload CSV
            </button>
            <button type="button" className="app-ghost-action" onClick={handleOpenJsonClick}>
              Submit JSON
            </button>
            <button type="button" className="app-ghost-action" onClick={exportCsv}>
              Export CSV
            </button>
            <button
              type="button"
              className="app-ghost-action app-delete-table-button"
              onClick={() => {
                if (!hasDataset) {
                  openDatasetRequiredModal('delete');
                  return;
                }
                setDeleteTableModalOpen(true);
              }}
            >
              Delete table
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

        <div className="app-table-shell app-table-shell-fixed">
          <div className="app-table-toolbar app-partner-toolbar">
            <input
              type="text"
              className="input app-table-search"
              placeholder="Search across uploaded partner data"
              value={partnerSearchTerm}
              onChange={(e) => setPartnerSearchTerm(e.target.value)}
            />

            {tableMode === 'edit' ? (
              <div className="app-partner-inline-edit-actions">
                <button
                  type="button"
                  className="app-ghost-action app-edit-toolbar-action"
                  onClick={handleAddRow}
                >
                  <PlusIcon />
                  <span>Add row</span>
                </button>

                <button
                  type="button"
                  className={`app-ghost-action app-edit-toolbar-action ${deleteMode ? 'danger-active' : ''}`}
                  onClick={toggleDeleteMode}
                >
                  <TrashIcon />
                  <span>Delete mode</span>
                </button>

              </div>
            ) : null}
          </div>

          <div className="app-partner-table-scroll">
            <table className="app-table app-partner-data-table">
              <thead>
                <tr>
                  <th className="app-sticky-left app-sticky-impact app-sticky-top-left">Impact</th>
                  {tableMode === 'edit' && deleteMode ? (
                    <th className="app-sticky-left-secondary app-sticky-delete app-sticky-top-delete">
                      <TrashIcon />
                    </th>
                  ) : null}
                  {columns.map((column) => (
                    <th key={column}>{column}</th>
                  ))}
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => {
                  const draft = drafts[row.id] ?? {};
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

                      {tableMode === 'edit' && deleteMode ? (
                        <td className="app-sticky-left-secondary app-sticky-delete app-delete-cell">
                          <button
                            type="button"
                            className="app-icon-button danger app-delete-inline-button"
                            onClick={() => requestDeleteRow(row.id, row.partner_name || 'this row')}
                            aria-label={`Delete ${row.partner_name || 'partner row'}`}
                            title="Delete row"
                          >
                            <TrashIcon />
                          </button>
                        </td>
                      ) : null}

                      {columns.map((column) => {
                        const value = draft[column] ?? toDisplayString(row.row_data?.[column] ?? '');

                        return (
                          <td key={`${row.id}-${column}`}>
                            {tableMode === 'edit' ? (
                              <input
                                className="input app-table-input"
                                value={value}
                                onChange={(e) => updateDraft(row.id, column, e.target.value)}
                              />
                            ) : (
                              <div className="app-table-view-value" title={value}>
                                {value || '—'}
                              </div>
                            )}
                          </td>
                        );
                      })}

                      <td className="app-updated-cell">
                        {new Date(row.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}

                {filteredNewRows.map((row) => (
                  <tr key={row.tempId} className="app-partner-row app-partner-row-new">
                    <td className="app-sticky-left app-sticky-impact app-impact-cell">
                      <span className="app-new-row-pill">New</span>
                    </td>

                    {tableMode === 'edit' && deleteMode ? (
                      <td className="app-sticky-left-secondary app-sticky-delete app-delete-cell">
                        <button
                          type="button"
                          className="app-icon-button danger app-delete-inline-button"
                          onClick={() => setNewRows((prev) => prev.filter((item) => item.tempId !== row.tempId))}
                          aria-label="Remove unsaved row"
                          title="Remove unsaved row"
                        >
                          <TrashIcon />
                        </button>
                      </td>
                    ) : null}

                    {columns.map((column) => (
                      <td key={`${row.tempId}-${column}`}>
                        <input
                          className="input app-table-input"
                          value={row.values[column] ?? ''}
                          onChange={(e) => updateNewRowValue(row.tempId, column, e.target.value)}
                        />
                      </td>
                    ))}

                    <td className="app-updated-cell app-updated-cell-empty">—</td>
                  </tr>
                ))}

                {!loading && filteredRows.length === 0 && filteredNewRows.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length + (tableMode === 'edit' && deleteMode ? 3 : 2)}>
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
          {tableMode === 'edit' ? (
          <div className="app-partner-table-footer">
            <button
              type="button"
              className="button home-v2-button-primary app-save-changes-footer"
              onClick={saveAllChanges}
              disabled={dirtyRows.length === 0 && newRows.length === 0}
            >
              Save changes
            </button>
          </div>
        ) : null}
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

      {impactModal ? (
        <div className="app-modal-overlay" onClick={() => setImpactModal(null)}>
          <div className="app-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="app-modal-header">
              <div>
                <p className="app-section-kicker">Impact detail</p>
                <h3 className="app-modal-title">{impactModal.partnerName}</h3>
              </div>
              <button
                type="button"
                className="app-icon-button"
                onClick={() => setImpactModal(null)}
                aria-label="Close impact detail"
              >
                ✕
              </button>
            </div>

            <div className="app-modal-meta">
              <span className="app-impact-detail-label">Status: {impactModal.status}</span>
            </div>

            <p className="app-modal-copy">{impactModal.reason}</p>
          </div>
        </div>
      ) : null}

      {confirmModal?.kind === 'delete-row' ? (
        <div className="app-modal-overlay" onClick={() => setConfirmModal(null)}>
          <div className="app-modal-card app-confirm-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="app-modal-header">
              <div>
                <p className="app-section-kicker">Delete row</p>
                <h3 className="app-modal-title">Delete this row?</h3>
              </div>
              <button
                type="button"
                className="app-icon-button"
                onClick={() => setConfirmModal(null)}
                aria-label="Close delete row modal"
              >
                ✕
              </button>
            </div>

            <p className="app-modal-copy">
              This will permanently remove <strong>{confirmModal.partnerLabel}</strong> from the current table.
            </p>

            <div className="app-card-actions app-card-actions-refined">
              <button type="button" className="app-ghost-action" onClick={() => setConfirmModal(null)}>
                Cancel
              </button>
              <button type="button" className="button app-danger-button" onClick={() => handleDeleteRow(confirmModal.rowId)}>
                Delete row
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {confirmModal?.kind === 'dataset-required' ? (
        <div className="app-modal-overlay" onClick={() => setConfirmModal(null)}>
          <div className="app-modal-card app-confirm-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="app-modal-header">
              <div>
                <p className="app-section-kicker">Upload required</p>
                <h3 className="app-modal-title">Please upload data first</h3>
              </div>
              <button
                type="button"
                className="app-icon-button"
                onClick={() => setConfirmModal(null)}
                aria-label="Close upload required modal"
              >
                ✕
              </button>
            </div>

            <p className="app-modal-copy">
              Please upload a CSV or submit JSON before you try to {confirmModal.actionLabel} rows.
            </p>

            <div className="app-card-actions app-card-actions-refined">
              <button type="button" className="button home-v2-button-primary" onClick={() => setConfirmModal(null)}>
                Got it
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteTableModalOpen ? (
        <div className="app-modal-overlay" onClick={() => setDeleteTableModalOpen(false)}>
          <div className="app-modal-card app-confirm-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="app-modal-header">
              <div>
                <p className="app-section-kicker">Delete table</p>
                <h3 className="app-modal-title">Delete table?</h3>
              </div>
              <button
                type="button"
                className="app-icon-button"
                onClick={() => setDeleteTableModalOpen(false)}
                aria-label="Close delete table modal"
              >
                ✕
              </button>
            </div>

            <p className="app-modal-copy">
              This will permanently delete your current partner data.
            </p>

            <p className="app-modal-copy app-delete-table-warning">
              <strong>This action cannot be undone.</strong>
            </p>

            <div className="app-card-actions app-card-actions-refined">
              <button type="button" className="app-ghost-action" onClick={() => setDeleteTableModalOpen(false)}>
                Cancel
              </button>
              <button type="button" className="button app-danger-button" onClick={handleDeleteTable}>
                Delete table
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {replaceModalOpen ? (
        <div className="app-modal-overlay" onClick={() => setReplaceModalOpen(false)}>
          <div className="app-modal-card app-confirm-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="app-modal-header">
              <div>
                <p className="app-section-kicker">Replace data</p>
                <h3 className="app-modal-title">Replace existing data?</h3>
              </div>
              <button
                type="button"
                className="app-icon-button"
                onClick={() => setReplaceModalOpen(false)}
                aria-label="Close replace data modal"
              >
                ✕
              </button>
            </div>

            <p className="app-modal-copy">
              Uploading new data will overwrite your current table.
            </p>

            <p className="app-modal-copy app-replace-data-warning">
              <strong>THIS WILL OVERWRITE AND DELETE YOUR PRE-EXISTING INFORMATION.</strong>
            </p>

            <div className="app-card-actions app-card-actions-refined">
              <button type="button" className="app-ghost-action" onClick={() => setReplaceModalOpen(false)}>
                No
              </button>
              <button type="button" className="button app-replace-data-button" onClick={confirmReplaceData}>
                Yes
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}