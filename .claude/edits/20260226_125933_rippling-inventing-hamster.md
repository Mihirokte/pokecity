# Move Spreadsheet into a Google Drive Folder

## Context
The user wants the PokéCity spreadsheet to be automatically placed in a dedicated Google Drive folder so it's organized and easy to find. Drive API is already enabled in their Google Cloud project. Currently the spreadsheet is created at Drive root with no folder organization.

## Approach
Add `drive.file` scope (minimal — only accesses files the app creates), create a "PokéCity" folder in Drive on first login, and move the spreadsheet into it. All using Drive API v3 REST calls.

## Files to Change

### `src/stores/authStore.ts`
- Add `https://www.googleapis.com/auth/drive.file` to SCOPES array
- Bump `SCOPES_VERSION` from 4 → 5 (forces re-login to grant new scope)

### `src/services/sheetsService.ts` (add 2 methods)
- `createDriveFolder(name)` — Search for existing folder named "PokéCity" via `GET /drive/v3/files?q=...`. If not found, create it via `POST /drive/v3/files`. Return folder ID.
- `moveToFolder(fileId, folderId)` — Move spreadsheet into folder via `PATCH /drive/v3/files/{fileId}?addParents={folderId}&removeParents={root}`

### `src/App.tsx`
- After `SheetsService.createSpreadsheet(...)` returns, call `createDriveFolder('PokéCity')` then `moveToFolder(newId, folderId)` to place the new spreadsheet in the folder.

## Drive API Calls
```
# Find existing folder
GET https://www.googleapis.com/drive/v3/files
  ?q=name='PokéCity' and mimeType='application/vnd.google-apps.folder' and trashed=false
  &fields=files(id,name)

# Create folder (if not found)
POST https://www.googleapis.com/drive/v3/files
  body: { name: 'PokéCity', mimeType: 'application/vnd.google-apps.folder' }

# Move spreadsheet into folder
PATCH https://www.googleapis.com/drive/v3/files/{spreadsheetId}
  ?addParents={folderId}&removeParents=root
```

## Verification
1. `npm run build` passes
2. User logs out and back in (scope version bump forces re-auth)
3. On first login: spreadsheet is created inside a "PokéCity" folder in Google Drive
4. On subsequent logins: folder already exists, no duplicate created
5. Spreadsheet still works normally (read/write/delete rows)
