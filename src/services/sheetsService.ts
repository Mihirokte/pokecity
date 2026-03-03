import { SHEET_HEADERS, SHEET_NAMES, NEW_SHEET_NAMES, tabName, TAB_TO_SHEET } from '../config/sheets';
import type { SheetName } from '../types';
import { useAuthStore } from '../stores/authStore';
import { getSampleData, SAMPLE_SPREADSHEET_ID } from '../data/sampleData';

const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';
const DRIVE_API = 'https://www.googleapis.com/drive/v3/files';

function getAuth(): { token: string; sheetId: string } {
  const state = useAuthStore.getState();
  const { accessToken, spreadsheetId } = state;
  if (!accessToken || !spreadsheetId) throw new Error('Not authenticated');
  if (spreadsheetId === SAMPLE_SPREADSHEET_ID) {
    return { token: accessToken, sheetId: SAMPLE_SPREADSHEET_ID };
  }
  if (!state.isTokenValid()) throw new Error('Token expired');
  return { token: accessToken, sheetId: spreadsheetId };
}

async function withRetry<T>(
  fn: () => Promise<T>,
  retryCount = 0
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    // If we get a 401, try silent refresh once
    if (error instanceof Error && error.message.includes('401') && retryCount === 0) {
      const refreshed = await useAuthStore.getState().refreshTokenSilently();
      if (refreshed) {
        return withRetry(fn, retryCount + 1);
      }
    }
    throw error;
  }
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

// Map a typed object back to a row array - accepts any object with string values
function objectToRow(sheetName: SheetName, obj: Record<string, unknown>): string[] {
  const cols = SHEET_HEADERS[sheetName];
  return cols.map(col => String(obj[col] ?? ''));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObject = Record<string, any>;

export const SheetsService = {
  // ── Bootstrap: create spreadsheet with all sheets ──
  async createSpreadsheet(title: string): Promise<{ spreadsheetId: string; sheetGids: Record<string, number> }> {
    const { accessToken } = useAuthStore.getState();
    if (!accessToken) throw new Error('Not authenticated');

    const body = {
      properties: { title },
      sheets: SHEET_NAMES.map(name => ({
        properties: { title: tabName(name) },
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

    // Map tab titles back to internal SheetName keys
    const sheetGids: Record<string, number> = {};
    for (const sheet of data.sheets) {
      const title = sheet.properties.title as string;
      const internal = TAB_TO_SHEET[title];
      if (internal) {
        sheetGids[internal] = sheet.properties.sheetId;
      }
    }

    return { spreadsheetId: data.spreadsheetId, sheetGids };
  },

  // ── Read all rows from a sheet ──
  async readAll<T>(sheetName: SheetName): Promise<T[]> {
    const { sheetId } = getAuth();
    if (sheetId === SAMPLE_SPREADSHEET_ID) {
      return Promise.resolve(getSampleData<T>(sheetName));
    }
    return withRetry(async () => {
      const { token } = getAuth();
      const tab = tabName(sheetName);
      const res = await fetch(
        `${SHEETS_API}/${sheetId}/values/${encodeURIComponent(tab)}`,
        { headers: headers(token) },
      );
      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        if (res.status === 401) {
          throw new Error(`Failed to read ${sheetName} (401): Unauthorized`);
        }
        throw new Error(`Failed to read ${sheetName} (${res.status}): ${errBody || res.statusText}`);
      }
      const data = await res.json();
      const rows: string[][] = data.values ?? [];
      // Skip header row
      return rows.slice(1).map(row => rowToObject<T>(sheetName, row));
    });
  },

  // ── Append a new row ──
  async append(sheetName: SheetName, obj: AnyObject): Promise<void> {
    const { sheetId } = getAuth();
    if (sheetId === SAMPLE_SPREADSHEET_ID) return Promise.resolve();
    return withRetry(async () => {
      const { token } = getAuth();
      const tab = tabName(sheetName);
      const row = objectToRow(sheetName, obj);
      const res = await fetch(
        `${SHEETS_API}/${sheetId}/values/${encodeURIComponent(tab)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
        {
          method: 'POST',
          headers: headers(token),
          body: JSON.stringify({ values: [row] }),
        },
      );
      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        if (res.status === 401) {
          throw new Error(`Failed to append to ${sheetName} (401): Unauthorized`);
        }
        throw new Error(`Failed to append to ${sheetName} (${res.status}): ${errBody || res.statusText}`);
      }
    });
  },

  // ── Update a specific row (find by lookup field, defaults to 'id') ──
  async update(
    sheetName: SheetName,
    obj: AnyObject,
    lookupField = 'id'
  ): Promise<void> {
    const { sheetId } = getAuth();
    if (sheetId === SAMPLE_SPREADSHEET_ID) return Promise.resolve();
    return withRetry(async () => {
      const { token } = getAuth();
      const tab = tabName(sheetName);
      // First find the row index
      const all = await this.readAll<AnyObject>(sheetName);
      const lookupValue = obj[lookupField];
      const idx = all.findIndex((r: AnyObject) => r[lookupField] === lookupValue);
      if (idx === -1) throw new Error(`Row not found in ${sheetName}: ${lookupValue}`);
      const rowNum = idx + 2; // 1-indexed, row 1 is header

      const row = objectToRow(sheetName, obj);
      const range = `${tab}!A${rowNum}`;
      const res = await fetch(
        `${SHEETS_API}/${sheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`,
        {
          method: 'PUT',
          headers: headers(token),
          body: JSON.stringify({ values: [row] }),
        },
      );
      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        if (res.status === 401) {
          throw new Error(`Failed to update ${sheetName} (401): Unauthorized`);
        }
        throw new Error(`Failed to update ${sheetName} (${res.status}): ${errBody || res.statusText}`);
      }
    });
  },

  // ── Ensure new sheets exist on legacy spreadsheets ──
  async ensureSheets(): Promise<Record<string, number>> {
    const { token, sheetId } = getAuth();
    const { sheetGids } = useAuthStore.getState();

    // Get existing sheet names
    const res = await fetch(`${SHEETS_API}/${sheetId}?fields=sheets.properties`, {
      headers: headers(token),
    });
    if (!res.ok) throw new Error(`Failed to fetch sheet metadata: ${res.status}`);
    const data = await res.json();
    const existingTitles = new Set(
      (data.sheets || []).map((s: { properties: { title: string } }) => s.properties.title)
    );

    // Find missing sheets by checking if the tab name exists
    const missing = NEW_SHEET_NAMES.filter(name => !existingTitles.has(tabName(name)));
    if (missing.length === 0) {
      // Ensure we have GIDs for all sheets
      const updatedGids = { ...sheetGids };
      for (const sheet of data.sheets) {
        const title = sheet.properties.title as string;
        const internal = TAB_TO_SHEET[title];
        if (internal) {
          updatedGids[internal] = sheet.properties.sheetId;
        }
      }
      return updatedGids;
    }

    // Add missing sheets via batchUpdate
    const requests = missing.map(name => ({
      addSheet: {
        properties: { title: tabName(name) },
      },
    }));

    const batchRes = await fetch(`${SHEETS_API}/${sheetId}:batchUpdate`, {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify({ requests }),
    });
    if (!batchRes.ok) {
      const errBody = await batchRes.text().catch(() => '');
      throw new Error(`Failed to add sheets (${batchRes.status}): ${errBody}`);
    }
    const batchData = await batchRes.json();

    // Collect GIDs — map tab titles back to internal names
    const updatedGids = { ...sheetGids };
    for (const sheet of data.sheets) {
      const title = sheet.properties.title as string;
      const internal = TAB_TO_SHEET[title];
      if (internal) {
        updatedGids[internal] = sheet.properties.sheetId;
      }
    }
    for (const reply of batchData.replies || []) {
      if (reply.addSheet) {
        const props = reply.addSheet.properties;
        const internal = TAB_TO_SHEET[props.title];
        if (internal) {
          updatedGids[internal] = props.sheetId;
        }
      }
    }

    // Add header rows to new sheets
    const headerRequests = missing.map(name => ({
      range: `${tabName(name)}!A1`,
      values: [SHEET_HEADERS[name]],
    }));

    await fetch(
      `${SHEETS_API}/${sheetId}/values:batchUpdate`,
      {
        method: 'POST',
        headers: headers(token),
        body: JSON.stringify({
          valueInputOption: 'RAW',
          data: headerRequests,
        }),
      },
    );

    return updatedGids;
  },

  // ── Drive: find or create a folder, move a file into it ──
  async ensureDriveFolder(folderName: string): Promise<string> {
    const { accessToken } = useAuthStore.getState();
    if (!accessToken) throw new Error('Not authenticated');

    // Search for existing folder
    const q = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    const searchRes = await fetch(
      `${DRIVE_API}?q=${encodeURIComponent(q)}&fields=files(id,name)`,
      { headers: headers(accessToken) },
    );
    if (searchRes.ok) {
      const data = await searchRes.json();
      if (data.files && data.files.length > 0) {
        return data.files[0].id;
      }
    }

    // Create folder
    const createRes = await fetch(DRIVE_API, {
      method: 'POST',
      headers: headers(accessToken),
      body: JSON.stringify({
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
      }),
    });
    if (!createRes.ok) {
      const errBody = await createRes.text().catch(() => '');
      throw new Error(`Failed to create Drive folder (${createRes.status}): ${errBody || createRes.statusText}`);
    }
    const folder = await createRes.json();
    return folder.id;
  },

  async moveToFolder(fileId: string, folderId: string): Promise<void> {
    const { accessToken } = useAuthStore.getState();
    if (!accessToken) throw new Error('Not authenticated');

    const res = await fetch(
      `${DRIVE_API}/${fileId}?addParents=${folderId}&removeParents=root`,
      {
        method: 'PATCH',
        headers: headers(accessToken),
      },
    );
    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`Failed to move file to folder (${res.status}): ${errBody || res.statusText}`);
    }
  },

  // ── Delete a row by ID ──
  async deleteRow(sheetName: SheetName, id: string): Promise<void> {
    const auth = getAuth();
    if (auth.sheetId === SAMPLE_SPREADSHEET_ID) return Promise.resolve();
    const { token, sheetId } = auth;
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
