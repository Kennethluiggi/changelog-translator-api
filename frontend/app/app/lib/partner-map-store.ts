export type PartnerMapRow = {
  id: string;
  partner: string;
  scopes: string;
  area: string;
  status: string;
  updated: string;
  extra?: Record<string, string>;
};

export const PARTNER_MAP_STORAGE_KEY = 'opsentry_partner_map_v1';
export const PARTNER_MAP_UPDATED_EVENT = 'opsentry:partner-map-updated';

const defaultPartnerRows: PartnerMapRow[] = [
  {
    id: 'seed-1',
    partner: 'Northstar Bank',
    scopes: 'auth:legacy, payments:read',
    area: 'Auth',
    status: 'Mapped',
    updated: '2h ago',
  },
  {
    id: 'seed-2',
    partner: 'Orbit HR',
    scopes: 'employees:read, auth:legacy',
    area: 'Partner API',
    status: 'Mapped',
    updated: '5h ago',
  },
  {
    id: 'seed-3',
    partner: 'Helios Marketplace',
    scopes: 'orders:write, auth:token.rotate',
    area: 'Commerce',
    status: 'Reviewing',
    updated: '1d ago',
  },
  {
    id: 'seed-4',
    partner: 'Acme Payroll',
    scopes: 'profile:read, employees:read',
    area: 'HR Data',
    status: 'Mapped',
    updated: '1d ago',
  },
];

function isBrowser() {
  return typeof window !== 'undefined';
}

export function getDefaultPartnerRows() {
  return defaultPartnerRows.map((row) => ({ ...row, extra: { ...(row.extra ?? {}) } }));
}

export function readPartnerMap(): PartnerMapRow[] {
  if (!isBrowser()) return getDefaultPartnerRows();

  const stored = window.localStorage.getItem(PARTNER_MAP_STORAGE_KEY);
  if (!stored) {
    const seeded = getDefaultPartnerRows();
    window.localStorage.setItem(PARTNER_MAP_STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }

  try {
    const parsed = JSON.parse(stored) as PartnerMapRow[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : getDefaultPartnerRows();
  } catch {
    return getDefaultPartnerRows();
  }
}

export function writePartnerMap(rows: PartnerMapRow[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(PARTNER_MAP_STORAGE_KEY, JSON.stringify(rows));
  window.dispatchEvent(new CustomEvent(PARTNER_MAP_UPDATED_EVENT, { detail: rows }));
}

export function subscribePartnerMap(callback: (rows: PartnerMapRow[]) => void) {
  if (!isBrowser()) return () => {};

  const handleUpdate = (event: Event) => {
    const detail = (event as CustomEvent<PartnerMapRow[]>).detail;
    callback(Array.isArray(detail) ? detail : readPartnerMap());
  };

  const handleStorage = (event: StorageEvent) => {
    if (event.key === PARTNER_MAP_STORAGE_KEY) {
      callback(readPartnerMap());
    }
  };

  window.addEventListener(PARTNER_MAP_UPDATED_EVENT, handleUpdate as EventListener);
  window.addEventListener('storage', handleStorage);

  return () => {
    window.removeEventListener(PARTNER_MAP_UPDATED_EVENT, handleUpdate as EventListener);
    window.removeEventListener('storage', handleStorage);
  };
}

export function normalizeCsvRowWrapper(line: string): string {
  const trimmed = line.trim();

  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    const inner = trimmed.slice(1, -1);
    return inner.replace(/""/g, '"');
  }

  return trimmed;
}

export function parseCsvLine(line: string): string[] {
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

export function parseCsv(text: string): PartnerMapRow[] {
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
      id: `csv-${index}-${partner}-${Date.now()}`,
      partner,
      scopes,
      area,
      status,
      updated: 'Just now',
      extra,
    };
  });
}

export function normalizeJsonRows(value: unknown): PartnerMapRow[] {
  if (!Array.isArray(value)) return [];

  return value.map((item, index) => {
    const row = typeof item === 'object' && item !== null ? (item as Record<string, unknown>) : {};
    const partner = String(row.partner ?? row.partner_name ?? row.name ?? `Partner ${index + 1}`);
    const scopesValue = row.scopes ?? row.scope ?? row.permissions ?? '—';
    const scopes = Array.isArray(scopesValue) ? scopesValue.join(', ') : String(scopesValue || '—');

    return {
      id: `json-${index}-${partner}-${Date.now()}`,
      partner,
      scopes,
      area: String(row.area ?? row.product_area ?? 'General'),
      status: String(row.status ?? 'Mapped'),
      updated: 'Just now',
      extra: {},
    };
  });
}

export function splitScopes(scopes: string): string[] {
  return scopes
    .split(',')
    .map((scope) => scope.trim())
    .filter(Boolean)
    .filter((scope) => scope !== '—');
}

export function partnerRowsToCsv(rows: PartnerMapRow[]) {
  const headers = ['partner', 'scopes', 'area', 'status', 'updated'];
  const escapeCell = (value: string) => {
    const normalized = value ?? '';
    if (normalized.includes(',') || normalized.includes('"') || normalized.includes('\n')) {
      return `"${normalized.replace(/"/g, '""')}"`;
    }
    return normalized;
  };

  return [
    headers.join(','),
    ...rows.map((row) =>
      [row.partner, row.scopes, row.area, row.status, row.updated].map(escapeCell).join(',')
    ),
  ].join('\n');
}
