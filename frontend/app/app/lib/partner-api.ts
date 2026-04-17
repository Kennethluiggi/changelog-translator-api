const API_BASE = 'http://127.0.0.1:8000';

export type PartnerRowData = Record<string, string>;

export type PartnerExtra = Record<string, unknown>;

export type PartnerRow = {
  id: number;
  workspace_id: number;
  upload_id: number;
  partner_name: string;
  scopes: string[];
  area: string;
  status: string;
  extra: PartnerExtra;
  created_at: string;
  row_data: PartnerRowData;
  impact_status: string;
  impact_reason: string;
};

export type FetchPartnersResponse = {
  success: boolean;
  columns: string[];
  rows: PartnerRow[];
};

export type UploadPartnersJsonResponse = {
  success: boolean;
  upload_id: number;
  row_count: number;
  columns: string[];
  rows: PartnerRow[];
};

export type UploadPartnersCsvResponse = {
  success: boolean;
  upload_id: number;
  row_count: number;
  columns: string[];
  rows: PartnerRow[];
};

export type UpdatePartnerPayload = {
  partner_name?: string;
  scopes?: string[];
  area?: string | null;
  status?: string | null;
  extra?: Record<string, unknown>;
};

export type UpdatePartnerResponse = {
  success: boolean;
  columns: string[];
  row: PartnerRow;
};

export type CreatePartnerPayload = {
  workspace_id: number;
  row_data: Record<string, unknown>;
};

export type CreatePartnerResponse = {
  success: boolean;
  row: PartnerRow;
};

export type DeletePartnerResponse = {
  success: boolean;
};

export type ResetPartnersResponse = {
  success: boolean;
};

async function parseJsonOrThrow<T>(res: Response): Promise<T> {
  const data = await res.json();

  if (!res.ok) {
    const message =
      typeof data?.detail === 'string'
        ? data.detail
        : `Partner API request failed with status ${res.status}`;
    throw new Error(message);
  }

  return data as T;
}

export async function fetchPartners(
  workspaceId: number,
): Promise<FetchPartnersResponse> {
  const res = await fetch(`${API_BASE}/partners/list/${workspaceId}`, {
    cache: 'no-store',
  });

  return parseJsonOrThrow<FetchPartnersResponse>(res);
}

export async function uploadPartnersJSON(
  workspaceId: number,
  rows: Record<string, unknown>[],
): Promise<UploadPartnersJsonResponse> {
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

  return parseJsonOrThrow<UploadPartnersJsonResponse>(res);
}

export async function uploadPartnersCSV(
  workspaceId: number,
  csvText: string,
): Promise<UploadPartnersCsvResponse> {
  const res = await fetch(`${API_BASE}/partners/upload-csv`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      workspace_id: workspaceId,
      csv_text: csvText,
    }),
  });

  return parseJsonOrThrow<UploadPartnersCsvResponse>(res);
}

export async function createPartner(
  payload: CreatePartnerPayload,
): Promise<CreatePartnerResponse> {
  const res = await fetch(`${API_BASE}/partners/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return parseJsonOrThrow<CreatePartnerResponse>(res);
}

export async function deletePartner(
  rowId: number,
): Promise<DeletePartnerResponse> {
  const res = await fetch(`${API_BASE}/partners/delete/${rowId}`, {
    method: 'DELETE',
  });

  return parseJsonOrThrow<DeletePartnerResponse>(res);
}

export async function updatePartner(
  rowId: number,
  payload: UpdatePartnerPayload,
): Promise<UpdatePartnerResponse> {
  const res = await fetch(`${API_BASE}/partners/update/${rowId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return parseJsonOrThrow<UpdatePartnerResponse>(res);
}

export async function resetPartners(
  workspaceId: number,
): Promise<ResetPartnersResponse> {
  const res = await fetch(`${API_BASE}/partners/reset/${workspaceId}`, {
    method: 'DELETE',
  });

  return parseJsonOrThrow<ResetPartnersResponse>(res);
}