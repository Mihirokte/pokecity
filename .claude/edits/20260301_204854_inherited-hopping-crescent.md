# Twitter Curation Bot — Plan

## Context

The Twitter Bot agent (`agent_twitter`) in PokéCity currently only handles **outgoing posts** (compose, schedule, track engagement). We're transforming it into a **tweet curation hub**: automated scraping of Twitter feeds, collecting good tweets, organizing them for inspiration and reference. No Twitter API keys — uses `twikit` (Python lib that uses Twitter's internal API with cookie-based auth).

## Architecture

```
Python Scraper (local CLI, lives in pokecity/scripts/twitter-scraper/)
        │
        │  writes collected tweets via Google Sheets API
        ▼
   Google Sheets (CuratedTweets sheet — same spreadsheet as PokéCity)
        │
        │  reads on page load
        ▼
   PokéCity UI (TwitterBot.tsx — redesigned with Feed + Compose tabs)
```

The scraper config (accounts to follow, keywords, min likes) is stored in the Twitter agent's `configJson` field in the Agents sheet — editable from the UI, read by the Python script.

---

## Part 1: Schema & Types

### New sheet: `CuratedTweets`

**Headers:**
```
id, tweetId, author, authorHandle, content, mediaUrl, tweetUrl,
likes, retweets, replies, collectedAt, tags, starred, category, notes
```

**Files to modify:**

1. **`src/types/index.ts`**
   - Add `'CuratedTweets'` to the `SheetName` union type
   - Add `CuratedTweet` interface
   - Add `TwitterConfig` interface (for agent configJson):
     ```ts
     interface TwitterConfig {
       accounts: string[];
       keywords: string[];
       maxPerAccount: number;
       minLikes: number;
     }
     ```

2. **`src/config/sheets.ts`**
   - Add `'CuratedTweets'` to `SHEET_NAMES` and `NEW_SHEET_NAMES`
   - Add `CuratedTweets: '18_CuratedTweets'` to `TAB_NAMES`
   - Add headers array to `SHEET_HEADERS`

---

## Part 2: Store Changes

**File: `src/pokecenter/pokecenterStore.ts`**

Add to state:
- `curatedTweets: CuratedTweet[]`
- `updateCuratedTweet(id, updates)` — for starring, tagging, adding notes from UI
- `deleteCuratedTweet(id)` — remove uninteresting tweets
- Load `CuratedTweets` in `loadPCData()` alongside existing reads

Also add:
- `updateAgentConfig(agentId, configJson)` — save scraper config to Agents sheet (generic, works for any agent)

---

## Part 3: Redesign TwitterBot.tsx

Transform from post-only → curation hub with **3 tabs**:

### Tab 1: "Feed" (new, default)
- Card-based feed of collected tweets from `curatedTweets`
- Each card: author handle, content, engagement stats (likes/RT/replies), collected date
- Per-card actions: star toggle, add/edit tags, set category, add notes, "Open on X" link, "Use as template" (copies to Compose)
- Top filter bar: search, filter by author/tag/category/starred
- Stats row: total collected, starred count, unique authors

### Tab 2: "Compose" (existing)
- Keep current compose/schedule/draft functionality as-is
- Minor: add "Use as template" flow from Feed

### Tab 3: "Config" (new)
- Edit scraper settings stored in agent's `configJson`
- Fields: accounts list (comma-separated input), keywords list, max tweets per account, min likes threshold
- Save button writes to `configJson` via `updateAgentConfig()`
- Shows current config + last scrape timestamp

### UI approach
- Reuse existing CSS classes: `.card`, `.tabs`, `.tab`, `.stat-row`, `.stat-card`, `.empty-state`, `.btn`, `.priority-badge`
- New CSS for tweet cards: `.tweet-card`, `.tweet-card__author`, `.tweet-card__content`, `.tweet-card__stats`, `.tweet-card__actions`

---

## Part 4: Python Scraper (`scripts/twitter-scraper/`)

### Files to create

| File | Purpose |
|---|---|
| `scripts/twitter-scraper/scraper.py` | Main CLI |
| `scripts/twitter-scraper/requirements.txt` | `twikit`, `gspread`, `google-auth-oauthlib`, `pyyaml` |
| `scripts/twitter-scraper/.gitignore` | `cookies.json`, `token.json`, `credentials.json` |
| `scripts/twitter-scraper/README.md` | Setup instructions |

### CLI commands

```bash
python scraper.py login          # One-time: Twitter login + Google OAuth
python scraper.py scrape         # Run one scrape cycle using config from Sheets
python scraper.py scrape --dry   # Preview what would be collected
```

### How it works

1. **Read config** from Google Sheets → Agents sheet → `agent_twitter` row → `configJson`
2. **Login to Twitter** via `twikit` (username/password → saves cookies, no API keys)
3. **Scrape** each configured account's timeline + keyword searches
4. **Filter** by min likes threshold
5. **Deduplicate** against existing `tweetId` values in CuratedTweets sheet
6. **Append** new tweets to CuratedTweets sheet
7. **Log** scrape results (count, errors) — optionally write to AgentLogs sheet

---

## Implementation Order

1. Schema + types (`sheets.ts`, `types/index.ts`)
2. Store methods (`pokecenterStore.ts`)
3. Redesign `TwitterBot.tsx` — Feed tab + Config tab
4. CSS for tweet cards (`pokecenter.css`)
5. Python scraper (`scripts/twitter-scraper/`)
6. Update agent description in `default-agents.ts`

## Verification

1. `npm run build` — no TS errors
2. `npm run dev` → navigate to Twitter Bot agent → verify 3 tabs render
3. Config tab: set accounts/keywords, save → verify `configJson` updates in Agents sheet
4. Manually add a test row to CuratedTweets sheet → verify it shows in Feed tab
5. `cd scripts/twitter-scraper && pip install -r requirements.txt`
6. `python scraper.py login` → auth flows complete
7. `python scraper.py scrape` → tweets appear in Sheet → refresh PokéCity UI → tweets in Feed
