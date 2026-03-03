# Twitter Curation Bot — Plan

## Context

PokéCity already has a TwitterBot agent with UI, types, store, and Google Sheet — but it's built for **outgoing posts** (compose, schedule, track engagement). The goal is to add **incoming tweet curation**: automated scraping of Twitter feeds/accounts, collecting good tweets, organizing them for inspiration and reference. No Twitter API keys — use `twikit` (Python library that uses Twitter's internal API with cookie auth).

## Architecture Overview

```
Python Scraper (local CLI)          PokéCity React UI
        │                                  │
        │ writes collected tweets          │ reads for curation
        ▼                                  ▼
   Google Sheets ← ── same spreadsheet ── → Google Sheets
   (CuratedTweets sheet)                   (CuratedTweets sheet)
```

Two independent pieces sharing the same Google Sheet:
1. **Python scraper** — runs locally, scrapes Twitter, writes to Sheets
2. **PokéCity UI** — reads from Sheets, displays for curation/inspiration

---

## Part 1: Python Scraper (`scripts/twitter-scraper/`)

### Files to create

| File | Purpose |
|---|---|
| `scripts/twitter-scraper/scraper.py` | Main CLI — login, scrape, write to Sheets |
| `scripts/twitter-scraper/config.yaml` | Accounts to follow, keywords, scrape settings |
| `scripts/twitter-scraper/requirements.txt` | `twikit`, `gspread`, `google-auth-oauthlib`, `pyyaml` |
| `scripts/twitter-scraper/.gitignore` | Ignore `cookies.json`, `token.json`, `credentials.json` |

### How it works

1. **Twitter auth (no API keys)**: `twikit` logs in with username/password on first run, saves cookies locally. Subsequent runs reuse cookies.
2. **Google Sheets auth**: Uses `gspread` + OAuth (same Google account as PokéCity). First run opens browser for consent, saves `token.json`.
3. **Scraping logic**:
   - Reads `config.yaml` for target accounts and search keywords
   - Fetches recent tweets from each account's timeline
   - Searches for keyword matches
   - Deduplicates against already-collected tweet IDs in the Sheet
   - Appends new tweets to the `CuratedTweets` sheet
4. **CLI interface**:
   - `python scraper.py login` — initial Twitter + Google auth setup
   - `python scraper.py scrape` — run one scrape cycle
   - `python scraper.py scrape --accounts elonmusk,naval` — override config

### config.yaml example

```yaml
spreadsheet_id: "paste-your-pokecity-spreadsheet-id"
accounts:
  - naval
  - paulg
  - elonmusk
keywords:
  - "startup advice"
  - "productivity tip"
max_tweets_per_account: 20
min_likes: 50  # only collect tweets with 50+ likes
```

---

## Part 2: New Google Sheet — `CuratedTweets`

### Schema (new sheet headers)

```
id, tweetId, author, authorHandle, content, mediaUrl, tweetUrl,
likes, retweets, replies, collectedAt, tags, starred, category, notes
```

- `tweetId` — Twitter's own tweet ID (for dedup)
- `tags` — comma-separated, editable from UI
- `starred` — boolean, for marking favorites
- `category` — user-assigned (e.g., "startup", "tech", "humor")
- `notes` — personal notes/inspiration ideas

### Files to modify

- `src/config/sheets.ts` — add `CuratedTweets` to `SHEET_NAMES`, `TAB_NAMES`, `SHEET_HEADERS`
- `src/types/index.ts` — add `CuratedTweet` interface + add `'CuratedTweets'` to `SheetName` union

---

## Part 3: PokéCity UI — Redesign TwitterBot Page

### Transform from posting UI → curation hub with two tabs

**Tab 1: "Feed" (new — primary)**
- Card-based feed of collected tweets
- Each card shows: author avatar/handle, tweet content, engagement stats, collected date
- Actions per card: star, tag, categorize, add notes, open original tweet
- Filters: by author, by tag, by category, starred only
- Search bar across tweet content
- Stats row: total collected, starred count, top authors

**Tab 2: "Compose" (existing — secondary)**
- Keep existing compose/schedule/draft functionality as-is
- Add "Use as template" button on Feed cards → copies text to compose textarea

### Files to modify

- `src/pokecenter/pages/TwitterBot.tsx` — full redesign with Feed + Compose tabs
- `src/pokecenter/pokecenterStore.ts` — add `curatedTweets` state, `loadCuratedTweets()`, `updateCuratedTweet()`, `deleteCuratedTweet()`
- `src/types/index.ts` — add `CuratedTweet` type
- `src/pokecenter/pokecenter.css` — styles for tweet cards, filter bar

---

## Implementation Order

1. Add `CuratedTweets` sheet schema + types (sheets.ts, types/index.ts)
2. Add store methods for curated tweets (pokecenterStore.ts)
3. Redesign TwitterBot.tsx UI with Feed + Compose tabs
4. Add CSS for tweet cards and curation UI
5. Create Python scraper (`scripts/twitter-scraper/`)
6. Test end-to-end: run scraper → check Sheets → verify UI displays tweets

## Verification

1. `npm run build` — ensure no TS errors after schema/type/store changes
2. `npm run dev` — verify TwitterBot page loads with new Feed tab
3. Manually add a test row to CuratedTweets sheet → confirm it appears in UI
4. `pip install -r requirements.txt` in scraper dir
5. `python scraper.py login` → authenticate both Twitter and Google
6. `python scraper.py scrape` → verify tweets appear in Sheet and UI
