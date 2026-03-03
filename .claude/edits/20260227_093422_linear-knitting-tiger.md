# Task Master Enhancement Plan

## Context
The TasksModule currently has basic CRUD (add/edit/delete, status cycling, priority, due date, tabs). It needs to become a full "Task Master" with time support and calendar integration — both a mini calendar view inside the module AND push-to-Google-Calendar.

## Files to Modify

| File | Change |
|------|--------|
| `src/types/index.ts` | Add `dueTime` and `gcalEventId` to Task interface |
| `src/config/sheets.ts` | Append `dueTime`, `gcalEventId` to Tasks headers (at end for backward compat) |
| `src/stores/authStore.ts` | Change `calendar.readonly` → `calendar` scope, bump SCOPES_VERSION 5→6 |
| `src/components/Modules/TasksModule.tsx` | Major enhancement (time input, calendar view, GCal push) |
| `src/styles/global.css` | Minimal hover CSS for calendar day cells |

## Step 1: Task Type + Sheet Headers
- Add `dueTime: string` (HH:MM) and `gcalEventId: string` to `Task` interface — placed **after** `updatedAt` to keep existing column indices intact
- Append `'dueTime', 'gcalEventId'` to end of `SHEET_HEADERS.Tasks` array
- Backward-compatible: existing rows read empty string for new columns

## Step 2: Auth Scope Upgrade
- Change `calendar.readonly` → `calendar` in SCOPES (enables write access to Google Calendar)
- Bump `SCOPES_VERSION` to 6 — forces re-login so users consent to new permission
- **Note:** Google Cloud Console needs Calendar API enabled (already is) — no console changes needed

## Step 3: TasksModule Enhancements

### 3a. Time Support
- Add `dueTime` field to `emptyForm()` and `openEdit()`
- Add time `<input type="time">` next to the date input in the form (disabled when no date set)
- Display formatted time (12h AM/PM) next to due date in task cards
- Helper: `formatTime("14:30")` → `"2:30 PM"`

### 3b. Mini Calendar View
- New state: `viewMode` (`'list'` | `'calendar'`), `calMonth`, `calYear`, `selectedDate`
- Toggle button in header: "Calendar" / "List"
- Calendar grid: 7-column CSS grid, month navigation (prev/next arrows)
- Tasks with due dates shown as small dots on their date cells (max 3 dots)
- Today highlighted in gold, selected date highlighted in indigo
- Clicking a date filters the task list below to that date; clicking again clears filter
- Status tabs hidden in calendar mode (filtering is by date instead)

### 3c. Google Calendar Push
- Three helper functions (top of file): `createGcalEvent`, `updateGcalEvent`, `deleteGcalEvent`
  - Create: POST to Calendar API v3, returns event ID. Timed events get 1hr duration. Date-only tasks become all-day events.
  - Update: PATCH to Calendar API v3
  - Delete: DELETE to Calendar API v3 (tolerates 410 Gone)
- "→ GCal" button on each task card (only if task has a due date)
  - If not yet synced: creates event, stores `gcalEventId` on the task
  - If already synced: updates the existing event, button shows "↻ GCal"
- "GCal" badge on task cards that are synced (blue pill)
- When editing a synced task: auto-updates the Calendar event
- When deleting a synced task: auto-deletes the Calendar event
- When status cycles on a synced task: silently updates Calendar event
- Loading state: button shows "..." while pushing

## Step 4: CSS
- Add `.task-cal-day:hover` style for calendar cell hover effect (can't do hover in inline styles)

## Verification
1. `npm run build` — TypeScript strict mode must pass (no unused vars, etc.)
2. `npm run dev` — Test manually:
   - Create task with date + time → verify time shows in card
   - Switch to calendar view → verify month grid, dots on dates, date filtering
   - Click "→ GCal" on a task → verify event appears in Google Calendar
   - Edit a synced task → verify Calendar event updates
   - Delete a synced task → verify Calendar event removed
   - Toggle between list/calendar views
