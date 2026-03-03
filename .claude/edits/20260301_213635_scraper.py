#!/usr/bin/env python3
"""
PokéCity Twitter Scraper — collects tweets without API keys.

Uses twikit for Twitter scraping (cookie-based auth) and gspread for
writing to the same Google Sheet that PokéCity uses.

Usage:
  python scraper.py login          # One-time auth setup
  python scraper.py scrape         # Run one scrape cycle
  python scraper.py scrape --dry   # Preview without writing
"""

import argparse
import asyncio
import json
import os
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

import gspread
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from twikit import Client

SCRIPT_DIR = Path(__file__).parent
COOKIES_FILE = SCRIPT_DIR / "cookies.json"
GSHEET_TOKEN = SCRIPT_DIR / "token.json"
GSHEET_CREDS = SCRIPT_DIR / "credentials.json"

# Google Sheets scopes (read/write spreadsheets)
SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]

CURATED_SHEET_TAB = "18_CuratedTweets"
AGENTS_SHEET_TAB = "05_Agents"

HEADERS = [
    "id", "tweetId", "author", "authorHandle", "content", "mediaUrl",
    "tweetUrl", "likes", "retweets", "replies", "collectedAt",
    "tags", "starred", "category", "notes",
]


def get_gsheet_client() -> gspread.Client:
    """Authenticate with Google Sheets using OAuth."""
    creds = None
    if GSHEET_TOKEN.exists():
        creds = Credentials.from_authorized_user_file(str(GSHEET_TOKEN), SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not GSHEET_CREDS.exists():
                print(f"ERROR: {GSHEET_CREDS} not found.")
                print("Download OAuth client credentials from Google Cloud Console")
                print("and save as credentials.json in this directory.")
                sys.exit(1)
            flow = InstalledAppFlow.from_client_secrets_file(str(GSHEET_CREDS), SCOPES)
            creds = flow.run_local_server(port=0)
        GSHEET_TOKEN.write_text(creds.to_json())
        print("Google Sheets auth saved.")
    return gspread.authorize(creds)


def read_config_from_sheet(gc: gspread.Client, spreadsheet_id: str) -> dict:
    """Read Twitter scraper config from the agent_twitter row in Agents sheet."""
    sh = gc.open_by_key(spreadsheet_id)
    ws = sh.worksheet(AGENTS_SHEET_TAB)
    rows = ws.get_all_records()
    for row in rows:
        if row.get("id") == "agent_twitter":
            try:
                return json.loads(row.get("configJson", "{}"))
            except json.JSONDecodeError:
                return {}
    return {}


def get_existing_tweet_ids(gc: gspread.Client, spreadsheet_id: str) -> set[str]:
    """Get all tweetId values already in CuratedTweets for dedup."""
    sh = gc.open_by_key(spreadsheet_id)
    try:
        ws = sh.worksheet(CURATED_SHEET_TAB)
    except gspread.WorksheetNotFound:
        # Create the sheet with headers
        ws = sh.add_worksheet(title=CURATED_SHEET_TAB, rows=1000, cols=len(HEADERS))
        ws.append_row(HEADERS)
        return set()

    records = ws.get_all_records()
    return {str(r.get("tweetId", "")) for r in records if r.get("tweetId")}


def append_tweets(gc: gspread.Client, spreadsheet_id: str, tweets: list[dict]):
    """Append new tweets to CuratedTweets sheet."""
    sh = gc.open_by_key(spreadsheet_id)
    ws = sh.worksheet(CURATED_SHEET_TAB)
    rows = []
    for t in tweets:
        rows.append([t.get(h, "") for h in HEADERS])
    if rows:
        ws.append_rows(rows, value_input_option="USER_ENTERED")


def tweet_to_row(tweet, collected_at: str) -> dict:
    """Convert a twikit Tweet object to our row dict."""
    media_urls = []
    if tweet.media:
        for m in tweet.media:
            url = getattr(m, "media_url_https", None) or getattr(m, "url", None)
            if url:
                media_urls.append(url)

    return {
        "id": f"ct_{uuid.uuid4().hex[:12]}",
        "tweetId": str(tweet.id),
        "author": tweet.user.name if tweet.user else "",
        "authorHandle": tweet.user.screen_name if tweet.user else "",
        "content": tweet.text or "",
        "mediaUrl": ",".join(media_urls),
        "tweetUrl": f"https://x.com/{tweet.user.screen_name}/status/{tweet.id}" if tweet.user else "",
        "likes": str(tweet.favorite_count or 0),
        "retweets": str(tweet.retweet_count or 0),
        "replies": str(tweet.reply_count or 0),
        "collectedAt": collected_at,
        "tags": "",
        "starred": "false",
        "category": "",
        "notes": "",
    }


async def twitter_login(client: Client):
    """Interactive Twitter login — saves cookies for reuse."""
    print("\n--- Twitter Login ---")
    username = input("Twitter username or email: ").strip()
    password = input("Twitter password: ").strip()

    await client.login(auth_info_1=username, password=password)
    client.save_cookies(str(COOKIES_FILE))
    print(f"Twitter cookies saved to {COOKIES_FILE}")


async def scrape_accounts(client: Client, accounts: list[str], max_per: int, min_likes: int) -> list:
    """Scrape recent tweets from specified accounts."""
    all_tweets = []
    for handle in accounts:
        try:
            print(f"  Scraping @{handle}...")
            user = await client.get_user_by_screen_name(handle)
            tweets = await client.get_user_tweets(user.id, tweet_type="Tweets", count=max_per)
            for t in tweets:
                fav = t.favorite_count or 0
                if fav >= min_likes:
                    all_tweets.append(t)
            print(f"    Found {len(tweets)} tweets, {sum(1 for t in tweets if (t.favorite_count or 0) >= min_likes)} above {min_likes} likes")
        except Exception as e:
            print(f"    ERROR scraping @{handle}: {e}")
    return all_tweets


async def scrape_keywords(client: Client, keywords: list[str], min_likes: int) -> list:
    """Search tweets by keywords."""
    all_tweets = []
    for kw in keywords:
        try:
            print(f"  Searching \"{kw}\"...")
            results = await client.search_tweet(kw, product="Top", count=20)
            for t in results:
                fav = t.favorite_count or 0
                if fav >= min_likes:
                    all_tweets.append(t)
            print(f"    Found {len(results)} results, {sum(1 for t in results if (t.favorite_count or 0) >= min_likes)} above {min_likes} likes")
        except Exception as e:
            print(f"    ERROR searching \"{kw}\": {e}")
    return all_tweets


async def run_scrape(spreadsheet_id: str, dry_run: bool = False):
    """Main scrape workflow."""
    # 1. Google Sheets auth
    gc = get_gsheet_client()

    # 2. Read config from Sheets
    config = read_config_from_sheet(gc, spreadsheet_id)
    accounts = config.get("accounts", [])
    keywords = config.get("keywords", [])
    max_per = config.get("maxPerAccount", 20)
    min_likes = config.get("minLikes", 50)

    if not accounts and not keywords:
        print("No accounts or keywords configured.")
        print("Set them in PokéCity → Twitter Bot → Config tab.")
        return

    print(f"\nConfig: {len(accounts)} accounts, {len(keywords)} keywords, "
          f"max {max_per}/account, min {min_likes} likes")

    # 3. Twitter login
    client = Client("en-US")
    if COOKIES_FILE.exists():
        client.load_cookies(str(COOKIES_FILE))
        print("Loaded Twitter cookies.")
    else:
        print("No cookies found. Run `python scraper.py login` first.")
        return

    # 4. Scrape
    collected_at = datetime.now(timezone.utc).isoformat()
    raw_tweets = []

    if accounts:
        print("\nScraping accounts...")
        raw_tweets.extend(await scrape_accounts(client, accounts, max_per, min_likes))

    if keywords:
        print("\nSearching keywords...")
        raw_tweets.extend(await scrape_keywords(client, keywords, min_likes))

    # Save updated cookies
    client.save_cookies(str(COOKIES_FILE))

    # 5. Deduplicate
    existing_ids = get_existing_tweet_ids(gc, spreadsheet_id)
    new_tweets = []
    seen = set()
    for t in raw_tweets:
        tid = str(t.id)
        if tid not in existing_ids and tid not in seen:
            new_tweets.append(tweet_to_row(t, collected_at))
            seen.add(tid)

    print(f"\n{len(raw_tweets)} total scraped, {len(new_tweets)} new (after dedup)")

    if dry_run:
        print("\n[DRY RUN] Would write these tweets:")
        for t in new_tweets[:5]:
            print(f"  @{t['authorHandle']}: {t['content'][:80]}... ({t['likes']} likes)")
        if len(new_tweets) > 5:
            print(f"  ... and {len(new_tweets) - 5} more")
        return

    # 6. Write to Sheets
    if new_tweets:
        append_tweets(gc, spreadsheet_id, new_tweets)
        print(f"Wrote {len(new_tweets)} tweets to CuratedTweets sheet.")
    else:
        print("No new tweets to write.")


async def run_login():
    """Login flow for Twitter."""
    client = Client("en-US")
    await twitter_login(client)


def main():
    parser = argparse.ArgumentParser(description="PokéCity Twitter Scraper")
    sub = parser.add_subparsers(dest="command")

    sub.add_parser("login", help="One-time Twitter + Google auth setup")

    scrape_p = sub.add_parser("scrape", help="Run one scrape cycle")
    scrape_p.add_argument("--spreadsheet-id", required=True, help="Google Sheets spreadsheet ID")
    scrape_p.add_argument("--dry", action="store_true", help="Preview without writing")

    args = parser.parse_args()

    if args.command == "login":
        # Google auth
        print("Setting up Google Sheets auth...")
        get_gsheet_client()
        # Twitter auth
        asyncio.run(run_login())
        print("\nAll set! You can now run: python scraper.py scrape --spreadsheet-id YOUR_ID")

    elif args.command == "scrape":
        asyncio.run(run_scrape(args.spreadsheet_id, dry_run=args.dry))

    else:
        parser.print_help()


if __name__ == "__main__":
    main()
