#!/usr/bin/env python3
"""
PokéCity Twitter Scraper — collects tweets without API keys.

Uses twikit with browser cookies (no login needed — bypasses Cloudflare).
Outputs a JSON file that you import into PokéCity via the Import button.

Usage:
  python scraper.py auth                         # One-time: paste browser cookies
  python scraper.py scrape                       # Scrape with defaults
  python scraper.py scrape -a naval,paulg        # Override accounts
  python scraper.py scrape -k "startup advice"   # Override keywords
  python scraper.py scrape --min-likes 100       # Min likes filter
"""

import argparse
import asyncio
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path

from twikit import Client

SCRIPT_DIR = Path(__file__).parent
COOKIES_FILE = SCRIPT_DIR / "cookies.json"
OUTPUT_FILE = SCRIPT_DIR / "output.json"

DEFAULT_ACCOUNTS = [
    "naval", "paulg", "elaboratemark", "sama",
    "patrickc", "levelsio", "paborenstein",
]
DEFAULT_KEYWORDS = ["startup advice", "indie hacker", "build in public"]
DEFAULT_MAX_PER = 20
DEFAULT_MIN_LIKES = 50


def load_existing_output() -> list[dict]:
    if OUTPUT_FILE.exists():
        try:
            return json.loads(OUTPUT_FILE.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, KeyError):
            return []
    return []


def save_output(tweets: list[dict]):
    OUTPUT_FILE.write_text(
        json.dumps(tweets, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )


def tweet_to_dict(tweet, collected_at: str) -> dict:
    media_urls = []
    if tweet.media:
        for m in tweet.media:
            url = getattr(m, "media_url_https", None) or getattr(m, "url", None)
            if url:
                media_urls.append(url)

    handle = tweet.user.screen_name if tweet.user else ""
    return {
        "id": f"ct_{uuid.uuid4().hex[:12]}",
        "tweetId": str(tweet.id),
        "author": tweet.user.name if tweet.user else "",
        "authorHandle": handle,
        "content": tweet.text or "",
        "mediaUrl": ",".join(media_urls),
        "tweetUrl": f"https://x.com/{handle}/status/{tweet.id}" if handle else "",
        "likes": str(tweet.favorite_count or 0),
        "retweets": str(tweet.retweet_count or 0),
        "replies": str(tweet.reply_count or 0),
        "collectedAt": collected_at,
        "tags": "",
        "starred": "false",
        "category": "",
        "notes": "",
    }


def setup_auth():
    """Get cookies from user's browser — just 2 values needed."""
    print()
    print("=" * 55)
    print("  Twitter Cookie Auth Setup")
    print("=" * 55)
    print()
    print("  1. Open x.com in Chrome (make sure you're logged in)")
    print("  2. Press F12 to open DevTools")
    print("  3. Go to Application tab -> Cookies -> https://x.com")
    print("  4. Find and copy these 2 values:")
    print()

    auth_token = input("  auth_token: ").strip()
    ct0 = input("  ct0: ").strip()

    if not auth_token or not ct0:
        print("\n  Both values are required!")
        return

    cookies = {
        "auth_token": auth_token,
        "ct0": ct0,
    }

    COOKIES_FILE.write_text(json.dumps(cookies, indent=2), encoding="utf-8")
    print(f"\n  Saved to {COOKIES_FILE}")
    print("  You can now run: python scraper.py scrape")
    print()


def get_client() -> Client:
    """Create twikit client with browser cookies."""
    if not COOKIES_FILE.exists():
        print("No cookies found. Run `python scraper.py auth` first.")
        raise SystemExit(1)

    cookies = json.loads(COOKIES_FILE.read_text(encoding="utf-8"))
    client = Client("en-US")
    client.set_cookies(cookies)
    return client


async def scrape_accounts(client: Client, accounts: list[str], max_per: int, min_likes: int) -> list:
    all_tweets = []
    for handle in accounts:
        try:
            print(f"  @{handle}...", end=" ", flush=True)
            user = await client.get_user_by_screen_name(handle)
            tweets = await client.get_user_tweets(user.id, tweet_type="Tweets", count=max_per)
            good = [t for t in tweets if (t.favorite_count or 0) >= min_likes]
            all_tweets.extend(good)
            print(f"{len(good)}/{len(tweets)} tweets (>={min_likes} likes)")
        except Exception as e:
            print(f"ERROR: {e}")
    return all_tweets


async def scrape_keywords(client: Client, keywords: list[str], min_likes: int) -> list:
    all_tweets = []
    for kw in keywords:
        try:
            print(f'  "{kw}"...', end=" ", flush=True)
            results = await client.search_tweet(kw, product="Top", count=20)
            good = [t for t in results if (t.favorite_count or 0) >= min_likes]
            all_tweets.extend(good)
            print(f"{len(good)}/{len(results)} tweets (>={min_likes} likes)")
        except Exception as e:
            print(f"ERROR: {e}")
    return all_tweets


async def run_scrape(accounts: list[str], keywords: list[str], max_per: int, min_likes: int):
    if not accounts and not keywords:
        print("No accounts or keywords. Use -a and/or -k flags.")
        return

    print(f"\nConfig: {len(accounts)} accounts, {len(keywords)} keywords, "
          f"max {max_per}/account, min {min_likes} likes\n")

    client = get_client()
    print("Loaded browser cookies.\n")

    collected_at = datetime.now(timezone.utc).isoformat()
    raw_tweets = []

    if accounts:
        print("Scraping accounts:")
        raw_tweets.extend(await scrape_accounts(client, accounts, max_per, min_likes))

    if keywords:
        print("\nSearching keywords:")
        raw_tweets.extend(await scrape_keywords(client, keywords, min_likes))

    # Dedup
    existing = load_existing_output()
    existing_ids = {t["tweetId"] for t in existing}
    seen = set()
    new_tweets = []
    for t in raw_tweets:
        tid = str(t.id)
        if tid not in existing_ids and tid not in seen:
            new_tweets.append(tweet_to_dict(t, collected_at))
            seen.add(tid)

    print(f"\n{len(raw_tweets)} scraped, {len(new_tweets)} new (after dedup)")

    if new_tweets:
        merged = existing + new_tweets
        save_output(merged)
        print(f"Saved {len(merged)} total tweets to {OUTPUT_FILE}")
        print(f"\nOpen PokéCity -> Twitter Bot -> Feed -> Import from scraper")
    else:
        print("No new tweets to add.")


def main():
    parser = argparse.ArgumentParser(description="PokéCity Twitter Scraper")
    sub = parser.add_subparsers(dest="command")

    sub.add_parser("auth", help="Set up browser cookies (one-time)")

    sp = sub.add_parser("scrape", help="Scrape tweets to output.json")
    sp.add_argument("-a", "--accounts", help="Comma-separated handles (no @)")
    sp.add_argument("-k", "--keywords", help="Comma-separated search terms")
    sp.add_argument("--max-per", type=int, default=DEFAULT_MAX_PER)
    sp.add_argument("--min-likes", type=int, default=DEFAULT_MIN_LIKES)

    args = parser.parse_args()

    if args.command == "auth":
        setup_auth()

    elif args.command == "scrape":
        accounts = [s.strip() for s in args.accounts.split(",")] if args.accounts else DEFAULT_ACCOUNTS
        keywords = [s.strip() for s in args.keywords.split(",")] if args.keywords else DEFAULT_KEYWORDS
        asyncio.run(run_scrape(accounts, keywords, args.max_per, args.min_likes))

    else:
        parser.print_help()


if __name__ == "__main__":
    main()
