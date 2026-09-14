#!/usr/bin/env python3
"""
List Codabench competition information: competitions -> phases -> tasks.

Its main purpose is to discover the phase ID (and optionally task IDs) you need
for make_submission.py.

No credentials are required for public competitions; if a competition is private,
set CODABENCH_USERNAME / CODABENCH_PASSWORD (or use a submission/.env file) and the
script will authenticate automatically.

Usage
=====
    # List all competitions
    ./get_competition_details.py

    # Show the phases of a competition
    ./get_competition_details.py --competition 17220

    # Show the tasks of a phase
    ./get_competition_details.py --competition 17220 --phase 28742
"""
from __future__ import annotations

import argparse
import os
import sys
from operator import itemgetter
from urllib.parse import urljoin

import requests


def load_dotenv(path: str) -> None:
    """Minimal .env loader: KEY=VALUE lines, optional quotes, '#' comments.

    Existing environment variables take precedence (never overwritten).
    """
    if not os.path.isfile(path):
        return
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def auth_headers(base_url: str, username: "str | None", password: "str | None") -> dict:
    """Return token headers if credentials are present, else empty headers."""
    if not (username and password):
        return {}
    resp = requests.post(urljoin(base_url, "/api/api-token-auth/"),
                         {"username": username, "password": password})
    if resp.status_code != 200:
        print(f"warning: login failed ({resp.status_code}); continuing unauthenticated.",
              file=sys.stderr)
        return {}
    return {"Authorization": f"Token {resp.json()['token']}"}


def list_competitions(base_url: str, headers: dict) -> None:
    resp = requests.get(urljoin(base_url, "/api/competitions/"), headers=headers)
    resp.raise_for_status()
    data = resp.json()
    competitions = sorted(data.get("results", data) if isinstance(data, dict) else data,
                          key=itemgetter("id"))
    print("\n------------------ Competitions ------------------")
    print("  id  |  creator               |  name")
    print("--------------------------------------------------")
    for c in competitions:
        print(f"{c['id']:>4}  |  {str(c.get('created_by','')):<20}  |  {c.get('title','')}")
    print()


def show_phases(base_url: str, competition_id: int, headers: dict) -> None:
    resp = requests.get(urljoin(base_url, f"/api/competitions/{competition_id}/"), headers=headers)
    resp.raise_for_status()
    data = resp.json()
    phases = sorted(data["phases"], key=itemgetter("index"))
    print(f"\nCompetition: {data['title']}\n")
    print("------------------- Phases -------------------")
    print(" index |  id   |  status      |  name")
    print("----------------------------------------------")
    for p in phases:
        print(f"{p.get('index',''):>6} | {p['id']:>5} | {str(p.get('status','')):<12} | {p.get('name','')}")
    print()


def show_tasks(base_url: str, competition_id: int, phase_id: int, headers: dict) -> None:
    resp = requests.get(urljoin(base_url, f"/api/competitions/{competition_id}/"), headers=headers)
    resp.raise_for_status()
    data = resp.json()
    phase = next((p for p in data["phases"] if p["id"] == phase_id), None)
    if phase is None:
        print(f"error: phase {phase_id} not found in competition {competition_id}", file=sys.stderr)
        sys.exit(1)
    print(f"\nCompetition: {data['title']}  /  Phase: {phase.get('name','')}\n")
    print("----------------- Tasks ------------------")
    print("  id  |  name")
    print("------------------------------------------")
    for t in phase.get("tasks", []):
        print(f"{t['id']:>4}  |  {t.get('name','')}")
    print()


def parse_args(argv: list) -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="List Codabench competitions, phases, and tasks.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    p.add_argument("-c", "--competition", type=int, help="Competition ID (show its phases).")
    p.add_argument("-p", "--phase", type=int, help="Phase ID (show its tasks; needs --competition).")
    p.add_argument("--url", default=os.environ.get("CODABENCH_URL", "https://www.codabench.org/"),
                   help="Codabench base URL (or set CODABENCH_URL).")
    p.add_argument("--username", default=os.environ.get("CODABENCH_USERNAME"),
                   help="Username for private competitions (or set CODABENCH_USERNAME).")
    p.add_argument("--password", default=os.environ.get("CODABENCH_PASSWORD"),
                   help="Password for private competitions (or set CODABENCH_PASSWORD).")
    return p.parse_args(argv)


def main(argv: list) -> None:
    load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))
    args = parse_args(argv)
    headers = auth_headers(args.url, args.username, args.password)

    if args.phase:
        if not args.competition:
            print("error: --phase requires --competition", file=sys.stderr)
            sys.exit(1)
        show_tasks(args.url, args.competition, args.phase, headers)
    elif args.competition:
        show_phases(args.url, args.competition, headers)
    else:
        list_competitions(args.url, headers)


if __name__ == "__main__":
    main(sys.argv[1:])
