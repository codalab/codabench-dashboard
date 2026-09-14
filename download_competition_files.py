#!/usr/bin/env python3
"""
Download all files of a Codabench competition (the "Files" tab).

This is the API equivalent of clicking, on the competition page:
    Files -> <each listed file: public data, starting kit, programs, solutions>

How it works (mirrors the web UI):

    1. GET  /api/competitions/{id}/         -> phases/tasks carry the datasets
                                               (name, type, size, and a `key`)
    2. POST /accounts/login/                -> Django *session* login; the
                                               download view below is a plain
                                               Django view, so the API token
                                               does NOT work for it
    3. GET  /datasets/download/{key}/       -> 302 to a signed URL; save (and
                                               optionally extract) each file

Which files you can actually fetch depends on the competition settings and
your participant status (e.g. reference data is organizer-only); files you
lack access to are reported and skipped, not fatal.

Credentials are read from a local .env file (gitignored) or the environment:

    CODABENCH_USERNAME=your_user
    CODABENCH_PASSWORD=your_pass

Usage
=====
    # Download every accessible file into files/<competition_id>/
    ./download_competition_files.py --competition 16161

    # List the competition's files without downloading
    ./download_competition_files.py --competition 16161 --list

    # Only files whose type or name matches a pattern
    ./download_competition_files.py -c 16161 --only starting_kit "problem set"

Run with --help for the full list of options.
"""
from __future__ import annotations

import argparse
import io
import json
import os
import re
import sys
import zipfile
from urllib.parse import urljoin

import requests


def die(msg: str, code: int = 1) -> "None":
    print(f"error: {msg}", file=sys.stderr)
    sys.exit(code)


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


def session_login(base_url: str, username: str, password: str) -> requests.Session:
    """Log in through the Django form and return a session carrying the cookie.

    /datasets/download/<key>/ authenticates via session, not the DRF token,
    so we need a real browser-style login here.
    """
    session = requests.Session()
    login_url = urljoin(base_url, "/accounts/login/")
    resp = session.get(login_url)
    if resp.status_code != 200:
        die(f"could not open login page ({resp.status_code}).")
    csrf = session.cookies.get("csrftoken")
    if not csrf:
        die("no CSRF token on the login page; is the base URL right?")
    resp = session.post(
        login_url,
        data={"username": username, "password": password, "csrfmiddlewaretoken": csrf},
        headers={"Referer": login_url},
    )
    # A successful Django form login redirects away; staying on the form = failure.
    if resp.status_code != 200 or "/accounts/login" in resp.url:
        die("session login failed. Check CODABENCH_USERNAME / CODABENCH_PASSWORD.")
    print(f"[ok] logged in as {username}.")
    return session


def get_competition(base_url: str, competition_id: int, session: requests.Session) -> dict:
    resp = session.get(urljoin(base_url, f"/api/competitions/{competition_id}/"))
    if resp.status_code != 200:
        die(f"could not fetch competition {competition_id} ({resp.status_code}): {resp.text}")
    return resp.json()


def collect_files(competition: dict) -> list:
    """Walk phases/tasks and collect every dataset shown in the Files tab.

    Same sources as the frontend (_tabs.tag): per-phase public_data and
    starting_kit, per-task public_datasets (input/reference data, scoring/
    ingestion programs), and per-task solutions.
    """
    files, seen = [], set()

    def add(key: str, name: str, ftype: str, phase: str, task: str = "", size=None):
        if not key or key in seen:
            return
        seen.add(key)
        files.append({"key": key, "name": name or ftype, "type": ftype,
                      "phase": phase, "task": task, "size": size})

    for phase in competition.get("phases", []):
        phase_name = phase.get("name", "")
        for attr in ("public_data", "starting_kit"):
            ds = phase.get(attr)
            if ds:
                add(ds.get("key"), ds.get("name"), attr, phase_name,
                    size=ds.get("file_size"))
        for task in phase.get("tasks", []):
            task_name = task.get("name", "")
            for ds in task.get("public_datasets") or []:
                add(ds.get("key"), ds.get("name"), ds.get("type", "dataset"),
                    phase_name, task_name, ds.get("file_size"))
            for sol in task.get("solutions") or []:
                add(sol.get("data"), sol.get("name"), "solution",
                    phase_name, task_name, sol.get("size"))
    return files


def pretty_size(size) -> str:
    try:
        size = float(size)
    except (TypeError, ValueError):
        return "?"
    for unit in ("B", "KB", "MB", "GB"):
        if size < 1024 or unit == "GB":
            return f"{size:,.1f} {unit}"
        size /= 1024
    return "?"


def print_files(files: list) -> None:
    print("\n--------------------------------- Files ---------------------------------")
    print("  # |  type              |  size      |  phase / task        |  name")
    print("--------------------------------------------------------------------------")
    for i, f in enumerate(files, 1):
        where = f["phase"] + (f" / {f['task']}" if f["task"] else "")
        print(f"{i:>3} |  {f['type']:<17} |  {pretty_size(f['size']):>9} |  "
              f"{where[:20]:<20} |  {f['name']}")
    print()


def safe_filename(entry: dict) -> str:
    name = re.sub(r"[^\w.\- ]+", "_", entry["name"].strip()).strip() or entry["key"]
    if not name.lower().endswith(".zip"):
        name += ".zip"
    return name


def download_file(base_url: str, session: requests.Session, entry: dict,
                  out_dir: str, extract: bool) -> bool:
    """Fetch one dataset through the redirecting download view."""
    url = urljoin(base_url, f"/datasets/download/{entry['key']}/")
    print(f"[..] downloading {entry['name']} ({entry['type']}) ...")
    try:
        resp = session.get(url, timeout=600, allow_redirects=True)
    except requests.RequestException as exc:
        print(f"[!!] download failed: {exc}")
        return False
    if resp.status_code in (403, 404):
        print(f"[!!] no access to this file ({resp.status_code}) — likely "
              "organizer-only or requires approved participation.")
        return False
    if resp.status_code != 200:
        print(f"[!!] download failed ({resp.status_code}).")
        return False
    dest_path = os.path.join(out_dir, safe_filename(entry))
    with open(dest_path, "wb") as fh:
        fh.write(resp.content)
    print(f"[ok] saved -> {dest_path} ({len(resp.content):,} bytes)")
    if extract and zipfile.is_zipfile(io.BytesIO(resp.content)):
        extract_dir = os.path.splitext(dest_path)[0]
        with zipfile.ZipFile(io.BytesIO(resp.content)) as zf:
            zf.extractall(extract_dir)
        print(f"     extracted -> {extract_dir}/")
    return True


def parse_args(argv: list) -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Download all files of a Codabench competition (Files tab).",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    p.add_argument("-c", "--competition", type=int, required=True,
                   help="Competition ID whose files to download.")
    p.add_argument("--list", action="store_true",
                   help="Only list the available files, then exit.")
    p.add_argument("--only", nargs="+", metavar="PATTERN",
                   help="Only download files whose type or name matches one of "
                        "these substrings (case-insensitive).")
    p.add_argument("-o", "--out-dir", default="files",
                   help="Directory to download into (a per-competition subfolder "
                        "is created).")
    p.add_argument("--no-extract", action="store_true",
                   help="Keep downloaded archives zipped instead of extracting them.")
    p.add_argument("--url", default=os.environ.get("CODABENCH_URL", "https://www.codabench.org/"),
                   help="Codabench base URL (or set CODABENCH_URL).")
    p.add_argument("--username", default=os.environ.get("CODABENCH_USERNAME"),
                   help="Username (or set CODABENCH_USERNAME).")
    p.add_argument("--password", default=os.environ.get("CODABENCH_PASSWORD"),
                   help="Password (or set CODABENCH_PASSWORD).")
    return p.parse_args(argv)


def main(argv: list) -> None:
    load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))
    args = parse_args(argv)

    if not args.username or not args.password:
        die("missing credentials: set CODABENCH_USERNAME and CODABENCH_PASSWORD "
            "(or pass --username/--password).")

    session = session_login(args.url, args.username, args.password)
    competition = get_competition(args.url, args.competition, session)
    print(f"[ok] competition {args.competition}: {competition.get('title', '?')}")

    files = collect_files(competition)
    if not files:
        die(f"no files found on competition {args.competition}.")

    if args.only:
        patterns = [p.lower() for p in args.only]
        files = [f for f in files
                 if any(p in f["type"].lower() or p in f["name"].lower()
                        for p in patterns)]
        if not files:
            die(f"no files match --only {args.only}.")

    print_files(files)
    if args.list:
        return

    out_dir = os.path.join(args.out_dir, str(args.competition))
    os.makedirs(out_dir, exist_ok=True)
    with open(os.path.join(out_dir, "files.json"), "w", encoding="utf-8") as fh:
        json.dump(files, fh, indent=2, ensure_ascii=False)

    ok = 0
    for entry in files:
        if download_file(args.url, session, entry, out_dir, extract=not args.no_extract):
            ok += 1
    print(f"\n[ok] downloaded {ok}/{len(files)} file(s) -> {out_dir}/")


if __name__ == "__main__":
    main(sys.argv[1:])
