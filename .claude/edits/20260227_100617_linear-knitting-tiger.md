# Unify Agents & Module Pages

## Context
Currently there are two ways to access features: sidebar module pages (Tasks, Calendar, Notes, etc.) AND agent cards on the dashboard. These are disconnected — clicking "Taskmaster" agent shows a generic status/logs view, while clicking "Tasks" in the sidebar shows the actual task management UI. The user wants ONE entry point: agents. Each agent opens a tabbed view with its module content + logs.

## Files to Modify

| File | Change |
|------|--------|
| `src/pokecenter/default-agents.ts` | Add 5 new agents (Calendar, Notes, Travel, Gym, Shopping) |
| `src/pokecenter/pokecenterStore.ts` | Update `seedDefaults` to merge missing agents for existing users |
| `src/pokecenter/Sidebar.tsx` | Remove Productivity, Social, Lifestyle sections — keep only Dashboard + Notifications |
| `src/pokecenter/pages/AgentDetail.tsx` | Rewrite: agent header + tabbed view (Module \| Logs) |
| `src/pokecenter/AppShell.tsx` | Remove direct page routes — only agent: + dashboard + notifications |
| `src/pokecenter/Header.tsx` | Remove old module PAGE_TITLES |

## Step 1: Add New Default Agents (`default-agents.ts`)

Add 5 new agents to `DEFAULT_AGENTS`:

| Agent ID | Name | Pokemon | PokemonId | Type | Icon |
|----------|------|---------|-----------|------|------|
| agent_calendar | Celebi | Celebi | 251 | Scheduler | 📅 |
| agent_notes | Smeargle | Smeargle | 235 | Note Keeper | 📝 |
| agent_travel | Pidgeot | Pidgeot | 18 | Travel Agent | ✈️ |
| agent_gym | Primeape | Primeape | 57 | Trainer | 🏋️ |
| agent_shopping | Meowth | Meowth | 52 | Shopkeeper | 🛒 |

## Step 2: Merge Missing Agents (`pokecenterStore.ts`)

Existing users already have 4 agents. `seedDefaults` only runs when `agents.length === 0`. Add a new check after loading: if some default agents are missing, append them. This runs after `loadPCData`.

## Step 3: Slim Down Sidebar (`Sidebar.tsx`)

Remove `moduleItems`, `socialItems`, `lifeItems` and their `renderGroup` calls. Nav becomes:
- Dashboard
- Notifications (with badge)

## Step 4: Rewrite AgentDetail (`AgentDetail.tsx`)

New layout:
- **Agent header** (compact): sprite, name, type, status badge — always visible
- **Tab bar**: "Module" | "Logs" (default to Module tab)
- **Module tab**: Renders actual module component via an `AGENT_MODULE_MAP`:
  - `agent_taskmaster` → `<Tasks />`
  - `agent_twitter` → `<TwitterBot />`
  - `agent_linkedin` → `<LinkedInBot />`
  - `agent_calendar` → `<Calendar />`
  - `agent_notes` → `<Notes />`
  - `agent_travel` → `<Travel />`
  - `agent_gym` → `<Gym />`
  - `agent_shopping` → `<Shopping />`
  - `agent_scout` → fallback info view (description, no module)
- **Logs tab**: Agent controls (Run/Stop/Restart) + logs list (current AgentDetail content)

No schema changes — mapping is a code-level config.

## Step 5: Clean Up AppShell (`AppShell.tsx`)

Remove switch cases for `tasks`, `calendar`, `notes`, `twitter`, `linkedin`, `travel`, `gym`, `shopping`. Remove their imports (they're now imported by AgentDetail). Keep only:
- `agent:*` → `<AgentDetail />`
- `notifications` → `<Notifications />`
- default → `<Dashboard />`

## Step 6: Clean Up Header (`Header.tsx`)

Remove module entries from `PAGE_TITLES` (tasks, calendar, notes, etc.). Keep `dashboard` and `notifications`.

## Verification
1. `npm run build` — TypeScript strict mode must pass
2. Sidebar shows only Dashboard + Notifications
3. Dashboard shows all 9 agents
4. Click any agent → tabbed view: Module tab has the full page content, Logs tab has controls + logs
5. Scout → shows description (no module page)
6. Back button returns to dashboard
