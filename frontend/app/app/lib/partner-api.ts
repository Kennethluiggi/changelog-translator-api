const API_BASE = 'http://127.0.0.1:8000';

export async function fetchPartners(workspaceId: number) {
  const res = await fetch(`${API_BASE}/partners/list/${workspaceId}`);
  return res.json();
}

export async function uploadPartnersJSON(workspaceId: number, rows: any[]) {
  const res = await fetch(`${API_BASE}/partners/upload-json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      workspace_id: workspaceId,
      rows,
    }),
  });

  return res.json();
}

export async function deletePartner(rowId: number) {
  const res = await fetch(`${API_BASE}/partners/delete/${rowId}`, {
    method: 'DELETE',
  });

  return res.json();
}

export async function updatePartner(rowId: number, payload: any) {
  const res = await fetch(`${API_BASE}/partners/update/${rowId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return res.json();
}

export async function resetPartners(workspaceId: number) {
  const res = await fetch(`${API_BASE}/partners/reset/${workspaceId}`, {
    method: 'DELETE',
  });

  return res.json();
}