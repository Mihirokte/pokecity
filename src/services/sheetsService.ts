import { SHEET_HEADERS, SHEET_NAMES } from '../config/sheets';
import type { SheetName } from '../types';
import { useAuthStore } from '../stores/authStore';

const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';

function getAuth() {
  const { accessToken, spreadsheetId } = useAuthStore.getState();
  if (!accessToken || !spreadsheetId) throw new Error('Not authenticated');
  return { token: accessToken, sheetId: spreadsheetId };
}

function headers(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

// Map a raw row array to a typed object using SHEET_HEADERS
function rowToObject<T>(sheetName: SheetName, row: string[]): T {
  const cols = SHEET_HEADERS[sheetName];
  const obj: Record<string, string> = {};
  cols.forEach((col, i) => {
    obj[col] = row[i] ?? '';
  });
  return obj as T;
}

// Map a typed object back to a row array
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function objectToRow(sheetName: SheetName, obj: any): string[] {
  const cols = SHEET_HEADERS[sheetName];
  return cols.map(col => String(obj[col] ?? ''));
}

export const SheetsService = {
  // ── Bootstrap: create spreadsheet with all sheets ──
  async createSpreadsheet(title: string): Promise<{ spreadsheetId: string; sheetGids: Record<string, number> }> {
    const { accessToken } = useAuthStore.getState();
    if (!accessToken) throw new Error('Not authenticated');

    const body = {
      properties: { title },
      sheets: SHEET_NAMES.map(name => ({
        properties: { title: name },
        data: [{
          startRow: 0,
          startColumn: 0,
          rowData: [{
            values: SHEET_HEADERS[name].map(h => ({
              userEnteredValue: { stringValue: h },
            })),
          }],
        }],
      })),
    };

    const res = await fetch(SHEETS_API, {
      method: 'POST',
      headers: headers(accessToken),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`Failed to create spreadsheet (${res.status}): ${errBody || res.statusText}`);
    }
    const data = await res.json();

    const sheetGids: Record<string, number> = {};
    for (const sheet of data.sheets) {
      sheetGids[sheet.properties.title] = sheet.properties.sheetId;
    }

    return { spreadsheetId: data.spreadsheetId, sheetGids };
  },

  // ── Read all rows from a sheet ──
  async readAll<T>(sheetName: SheetName): Promise<T[]> {
    const { token, sheetId } = getAuth();
    const res = await fetch(
      `${SHEETS_API}/${sheetId}/values/${sheetName}`,
      { headers: headers(token) },
    );
    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`Failed to read ${sheetName} (${res.status}): ${errBody || res.statusText}`);
    }
    const data = await res.json();
    const rows: string[][] = data.values ?? [];
    // Skip header row
    return rows.slice(1).map(row => rowToObject<T>(sheetName, row));
  },

  // ── Append a new row ──
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async append(sheetName: SheetName, obj: any): Promise<void> {
    const { token, sheetId } = getAuth();
    const row = objectToRow(sheetName, obj);
    const res = await fetch(
      `${SHEETS_API}/${sheetId}/values/${sheetName}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
      {
        method: 'POST',
        headers: headers(token),
        body: JSON.stringify({ values: [row] }),
      },
    );
    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`Failed to append to ${sheetName} (${res.status}): ${errBody || res.statusText}`);
    }
  },

  // ── Update a specific row (find by ID in column A) ──
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async update(sheetName: SheetName, obj: any & { id: string }): Promise<void> {
    const { token, sheetId } = getAuth();
    // First find the row index
    const all = await this.readAll<{ id: string }>(sheetName);
    const idx = all.findIndex(r => r.id === obj.id);
    if (idx === -1) throw new Error(`Row not found in ${sheetName}: ${obj.id}`);
    const rowNum = idx + 2; // 1-indexed, row 1 is header

    const row = objectToRow(sheetName, obj);
    const range = `${sheetName}!A${rowNum}`;
    const res = await fetch(
      `${SHEETS_API}/${sheetId}/values/${range}?valueInputOption=RAW`,
      {
        method: 'PUT',
        headers: headers(token),
        body: JSON.stringify({ values: [row] }),
      },
    );
    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`Failed to update ${sheetName} (${res.status}): ${errBody || res.statusText}`);
    }
  },

  // ── Delete a row by ID ──
  async deleteRow(sheetName: SheetName, id: string): Promise<void> {
    const { token, sheetId } = getAuth();
    const { sheetGids } = useAuthStore.getState();
    const gid = sheetGids[sheetName];
    if (gid === undefined) throw new Error(`No GID for ${sheetName}`);

    // Find the row index
    const all = await this.readAll<{ id: string }>(sheetName);
    const idx = all.findIndex(r => r.id === id);
    if (idx === -1) throw new Error(`Row not found in ${sheetName}: ${id}`);
    const rowIndex = idx + 1; // 0-indexed, but skip header

    const res = await fetch(`${SHEETS_API}/${sheetId}:batchUpdate`, {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify({
        requests: [{
          deleteDimension: {
            range: {
              sheetId: gid,
              dimension: 'ROWS',
              startIndex: rowIndex,
              endIndex: rowIndex + 1,
            },
          },
        }],
      }),
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`Failed to delete from ${sheetName} (${res.status}): ${errBody || res.statusText}`);
    }
  },
};
