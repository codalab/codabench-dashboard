"""
Scrape Codabench competitions by ID, including organizer/creator and
description (where institution/country is sometimes mentioned as free text).

IMPORTANT - read this before running:
Codabench's competition pages are a JavaScript app. A plain HTML fetch
only returns an empty page shell (the data loads afterwards via an API
call from your browser). This script instead calls Codabench's JSON API
directly: https://www.codabench.org/api/competitions/{id}/

Also important: Codabench has NO "country" field for competitions or
organizers. There is no structured place that stores a country. The
closest things are:
  - "organizer_name" / "created_by": the username/display name of whoever
    created the competition
  - "description": sometimes organizers mention their institution or
    country in free text

This script pulls organizer name + full description. It does NOT invent
a country -- if you need that, you'd have to read each description
yourself or run the output through an NLP/LLM pass afterward.

Usage:
    pip install requests
    python scrape_codabench.py --start 0 --end 17253 --out codabench_competitions.csv

If /api/competitions/{id}/ turns out to be wrong (Codabench's API may
have changed since this was written), open
https://www.codabench.org/competitions/13067/ in a browser, open
DevTools -> Network -> XHR/Fetch, reload the page, and look for the
request that returns the competition's JSON. Update API_URL below to
match what you find.
"""

import argparse
import csv
import sys
import time

import requests

API_URL = "https://www.codabench.org/api/competitions/{id}/"
s
HEADERS = {
    "User-Agent": "Mozilla/5.0 (research data collection; contact: your-email@example.com)",
    "Accept": "application/json",
}


def fetch_competition(session: requests.Session, comp_id: int, timeout: float):
    """Try the JSON API; return None if it's not a real/public competition."""
    url = API_URL.format(id=comp_id)
    resp = session.get(url, timeout=timeout)

    if resp.status_code == 404:
        return None
    if resp.status_code != 200:
        print(f"[{comp_id}] unexpected status {resp.status_code} on API", file=sys.stderr)
        return None

    try:
        data = resp.json()
    except ValueError:
        # Got HTML back instead of JSON -> the API path is wrong, stop and say so
        raise RuntimeError(
            f"API did not return JSON for id={comp_id}. The endpoint "
            f"'{API_URL}' may be wrong -- see the docstring for how to find "
            f"the correct one via browser DevTools."
        )

    if not data:
        return None

    title = data.get("title") or data.get("name")
    if not title:
        return None

    creator = data.get("creator")
    organizer = data.get("organizer_name") or data.get("created_by")
    if not organizer and isinstance(creator, dict):
        organizer = creator.get("username") or creator.get("name")

    description = data.get("description") or data.get("short_description") or ""

    return {
        "id": comp_id,
        "title": title,
        "organizer": organizer or "",
        "description": description.strip(),
        "url": PAGE_URL.format(id=comp_id),
    }


def scrape(start: int, end: int, out_path: str, delay: float, timeout: float):
    fieldnames = ["id", "title", "organizer", "description", "url"]

    with open(out_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()

        session = requests.Session()
        session.headers.update(HEADERS)

        found = 0
        for comp_id in range(start, end + 1):
            try:
                row = fetch_competition(session, comp_id, timeout)
            except RuntimeError as e:
                print(f"FATAL: {e}", file=sys.stderr)
                sys.exit(1)
            except requests.RequestException as e:
                print(f"[{comp_id}] request error: {e}", file=sys.stderr)
                time.sleep(delay)
                continue

            if row:
                writer.writerow(row)
                f.flush()
                found += 1
                print(f"[{comp_id}] OK: {row['title']} (organizer: {row['organizer']})")

            time.sleep(delay)

        print(f"\nDone. Found {found} competitions out of {end - start + 1} IDs checked.")
        print(f"Saved to {out_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Scrape Codabench competitions by ID range.")
    parser.add_argument("--start", type=int, default=0)
    parser.add_argument("--end", type=int, default=17253)
    parser.add_argument("--out", type=str, default="codabench_competitions.csv")
    parser.add_argument("--delay", type=float, default=0.5, help="seconds between requests")
    parser.add_argument("--timeout", type=float, default=15.0)
    args = parser.parse_args()

    scrape(args.start, args.end, args.out, args.delay, args.timeout)