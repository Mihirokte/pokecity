# Remove Placeholder Content & Trim to 4 Core Agents

## Context
The UI has 8 agents (4 are fluff), a fake progress simulation that ticks progress bars with random log spam, canned seed data (fake logs, fake notifications, fake social posts), and a dead KnowledgeBase page. User wants only **Scout, Taskmaster, Twitter Bot, LinkedIn Bot**. Keep Travel/Gym/Shopping in sidebar. Remove all fake/placeholder content so the app starts clean.

## Files to Change

### DELETE (2 files)
- `src/pokecenter/hooks/useAgentSimulation.ts` — Fake progress ticker, random log spam
- `src/pokecenter/pages/KnowledgeBase.tsx` — Dead page, nothing populates it

### MODIFY (4 files)

**`src/pokecenter/default-agents.ts`**
- Remove 4 agents: Scribe, Sentinel, Courier, Analyst
- Keep 4 agents: Scout, Taskmaster, Twitter Bot, LinkedIn Bot
- All agents start `idle` with `progress: '0'` (no fake running state)
- Empty out DEFAULT_LOGS (no fake log messages)
- Empty out DEFAULT_NOTIFICATIONS (no fake alerts)
- Empty out DEFAULT_TWITTER_POSTS (user creates real content)
- Empty out DEFAULT_LINKEDIN_POSTS (user creates real content)

**`src/pokecenter/AppShell.tsx`**
- Remove `useAgentSimulation()` call and import
- Remove KnowledgeBase import and `case 'knowledge'` route

**`src/pokecenter/Sidebar.tsx`**
- Remove Knowledge Base from systemItems nav group

**`src/pokecenter/pokecenterStore.ts`**
- Remove seeding of logs, notifications, twitter posts, linkedin posts in `seedDefaults()`
- Only seed the 4 agents on first load

### KEEP (unchanged)
- All page components (Dashboard, Tasks, Calendar, Notes, TwitterBot, LinkedInBot, Travel, Gym, Shopping, Notifications, AgentDetail)
- All stores, services, types
- Components (StatCard, AgentCard, StatusBadge, PageHeader)

## Verification
1. `npm run build` — passes
2. `npm run lint` — no new errors
3. Dashboard shows 4 agents (all idle), zero notifications, zero fake activity
4. Twitter/LinkedIn pages start empty
5. No progress bars ticking on their own
