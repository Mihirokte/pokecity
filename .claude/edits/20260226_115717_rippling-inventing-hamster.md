# PokéCity UI Revamp: GBA Tile Map → Modern Command Center

## Context

The current PokéCenter UI is a 640×512px GBA-style tile map where users walk a character around a Pokémon Center to interact with terminals. While thematic, it's impractical for productivity — tiny pixel fonts, slow navigation, cramped panel overlays. The user wants a **production-quality modern dashboard** inspired by tools like Linear, Vercel, and Raycast, while keeping the Pokémon personality (sprites as agent avatars, themed accents).

## Design Vision

**Dark-mode command center** with:
- Clean sidebar navigation (always-visible, icon + label)
- Spacious content area with card-based layouts
- System font stack (no pixel fonts) — readable at all sizes
- Subtle Pokémon DNA: agent sprites, gold accents, type-colored status indicators
- Smooth CSS transitions, hover effects, micro-interactions
- Responsive: sidebar collapses on mobile

### Color System
```
Background:  #09090b → #111118 → #1a1a2e (depth layers)
Borders:     rgba(255,255,255, 0.06/0.10/0.15)
Text:        #f0f0f5 / #8b8b9e / #55556a (primary/secondary/muted)
Accent:      #818cf8 (indigo) with #6366f1 hover
Status:      #10b981 green, #f59e0b yellow, #ef4444 red, #3b82f6 blue
Pokémon:     #ffcd75 gold (sparingly, for Pokémon-themed touches)
```

### Typography
```
Font: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif
Sizes: 11px labels, 13px body, 15px subheadings, 20px headings, 28px page titles
Weights: 400 body, 500 medium, 600 semibold
```

## File Changes

### DELETE (15 files, ~2,200 lines removed)
- `src/pokecenter/PokeCenterHub.tsx` — 695-line tile map game
- `src/pokecenter/gba-theme.ts` — Pixel art color palette
- `src/pokecenter/map-data.ts` — Tile map data + collision
- `src/pokecenter/hooks/useDialogue.ts` — Typewriter effect
- `src/pokecenter/hooks/useSessionPersistence.ts` — Player position save
- `src/pokecenter/panels/` — All 10 panel files (DashboardPanel, TasksPanel, CalendarPanel, TwitterBotPanel, LinkedInBotPanel, NotificationsPanel, AgentDetailPanel, KnowledgeBasePanel, AgentCreatePanel, PanelShell)

### CREATE (20 new files)

**Core Shell:**
- `src/pokecenter/theme.ts` (~60 lines) — Color/spacing/typography tokens as JS constants
- `src/pokecenter/pokecenter.css` (~600 lines) — All modern styles with CSS variables
- `src/pokecenter/AppShell.tsx` (~100 lines) — Layout: sidebar + header + routed content
- `src/pokecenter/Sidebar.tsx` (~160 lines) — Nav groups, active indicator, notification badge, user section
- `src/pokecenter/Header.tsx` (~60 lines) — Page title, breadcrumb, notification bell, user avatar

**Reusable Components:**
- `src/pokecenter/components/StatCard.tsx` (~35 lines) — Icon + value + label card
- `src/pokecenter/components/AgentCard.tsx` (~70 lines) — Dashboard agent card with sprite, status, progress
- `src/pokecenter/components/StatusBadge.tsx` (~25 lines) — Dot + status text
- `src/pokecenter/components/PageHeader.tsx` (~30 lines) — Title + description + action buttons slot

**Pages (12):**
- `pages/Dashboard.tsx` (~220 lines) — Stat row + agent grid + recent activity + today's schedule
- `pages/Tasks.tsx` (~280 lines) — Filters, task list, create form, status cycling, priority badges
- `pages/Calendar.tsx` (~200 lines) — Day navigator, event list, color bars, Google sync button
- `pages/Notes.tsx` (~300 lines) — Split list/editor, search, auto-save debounce, versioning
- `pages/TwitterBot.tsx` (~180 lines) — Queue, drafts, recent posts, engagement stats, compose
- `pages/LinkedInBot.tsx` (~170 lines) — Same pattern as Twitter
- `pages/Travel.tsx` (~280 lines) — Trip cards, itinerary timeline, packing lists, countdown
- `pages/Gym.tsx` (~250 lines) — Metric tabs, sparkline, history, quick presets
- `pages/Shopping.tsx` (~250 lines) — Multi-list, category groups, price totals, quick-add
- `pages/Notifications.tsx` (~130 lines) — Unread/read sections, mark-read actions
- `pages/KnowledgeBase.tsx` (~100 lines) — Entry cards with source + summary
- `pages/AgentDetail.tsx` (~200 lines) — Agent info header, logs list, run/stop controls

### MODIFY (4 files)
- `src/pokecenter/pokecenterStore.ts` — Add `currentPage`/`setCurrentPage`, remove `playerPos`/`playerDir`/`setPlayerPos`/`setPlayerDir`/`saveSession` (player movement gone)
- `src/App.tsx` — Import `AppShell` instead of `PokeCenterHub`, update LoadingScreen to modern style
- `index.html` — Replace VT323 font import with Inter from Google Fonts
- `src/styles/global.css` — Strip all retro/pixel-art styles, keep base resets + toast system

### KEEP (unchanged)
- `pokecenterStore.ts` core logic (agents, logs, twitter, linkedin, notifications CRUD)
- `default-agents.ts` (seed data)
- `hooks/useAgentSimulation.ts` (background agent progress)
- All stores: `authStore.ts`, `cityStore.ts`, `uiStore.ts`
- `sheetsService.ts`, `types/index.ts`, `config/sheets.ts`
- All `src/components/Modules/` (legacy modules — unused but not breaking)

## Routing

Page routing via `currentPage` string in `pokecenterStore`:
```typescript
type Page = 'dashboard' | 'tasks' | 'calendar' | 'notes' | 'twitter' | 'linkedin'
           | 'travel' | 'gym' | 'shopping' | 'notifications' | 'knowledge'
           | `agent:${string}`;  // agent:agent_scout, etc.
```

`AppShell.tsx` switches on `currentPage` to render the correct page component.
`Sidebar.tsx` calls `setCurrentPage()` on nav item click, highlights active item.

## Data Access Per Page

| Page | Store(s) | Data |
|------|----------|------|
| Dashboard | pokecenterStore + cityStore | agents, notifications, tasks, calendarEvents |
| Tasks | cityStore | tasks (all, unfiltered by resident) |
| Calendar | cityStore | calendarEvents |
| Notes | cityStore | notes |
| Twitter | pokecenterStore | twitterPosts, agents (twitter bot) |
| LinkedIn | pokecenterStore | linkedInPosts, agents (linkedin bot) |
| Travel | cityStore | tripPlans |
| Gym | cityStore | healthMetrics |
| Shopping | cityStore | shoppingItems |
| Notifications | pokecenterStore | notifications, agents |
| Knowledge | pokecenterStore | knowledgeEntries |
| AgentDetail | pokecenterStore | agents, agentLogs (filtered by agent ID) |

## Build Order

1. **theme.ts + pokecenter.css** — Foundation (no imports yet)
2. **Reusable components** — StatCard, AgentCard, StatusBadge, PageHeader
3. **AppShell + Sidebar + Header** — Shell structure
4. **Dashboard page** — Validates the layout works end-to-end
5. **Tasks + Calendar + Notes** — Core productivity pages
6. **TwitterBot + LinkedInBot** — Social pages
7. **Travel + Gym + Shopping** — Lifestyle pages
8. **Notifications + KnowledgeBase + AgentDetail** — System pages
9. **Modify pokecenterStore** — Add currentPage, remove player state
10. **Modify App.tsx** — Switch to AppShell
11. **Modify index.html + global.css** — Font swap + style cleanup
12. **Delete old files** — Remove all GBA code
13. **Build + lint verification**

## No New Dependencies

Zero npm additions. Using:
- CSS custom properties for theming
- Unicode/emoji for icons (with option to swap to SVG later)
- System font stack
- Existing React 19 + Zustand 5

## Verification

1. `npm run build` — TypeScript compilation passes
2. `npm run lint` — No ESLint errors
3. `npm run dev` — Visual check: sidebar renders, pages navigate, data displays
4. Test auth flow: login → data loads → dashboard shows agents
5. Test CRUD: create task, mark done, verify in Tasks page
6. Test responsive: resize browser, sidebar collapses
