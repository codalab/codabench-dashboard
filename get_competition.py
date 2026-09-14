#!/usr/bin/env python3
"""
Get everything about a Codabench competition from one API call.

Given a competition *link* (``https://www.codabench.org/competitions/17363/``)
or a bare id, this reads ``GET /api/competitions/{id}/`` and shows:

    * title, organizer, participation stats,
    * the prose pages (Overview, Data, Evaluation, ...) as readable text,
    * phases and their tasks (the ids you need for make_submission.py),
    * the files each phase/task exposes (the "Files" tab),
    * the leaderboard definition (metric, sort direction) and current best.

No credentials are needed for public competitions; private ones read
CODABENCH_USERNAME / CODABENCH_PASSWORD from the environment or a local
.env file (gitignored).

Usage
=====
    # Show a competition (works with a URL or a bare id)
    ./get_competition.py https://www.codabench.org/competitions/17363/
    ./get_competition.py 17363

    # Also write description.md + pages/*.md AND download the accessible
    # files (starting kit, public data) into workdir/17363/input/
    ./get_competition.py 17363 --save-dir workdir/17363

    # Save the description only, skip the file downloads
    ./get_competition.py 17363 --save-dir workdir/17363 --no-download

    # Dump the raw API payload
    ./get_competition.py 17363 --json

Related scripts
===============
    get_competition_details.py      list competitions / phases / tasks
    download_competition_files.py   download the Files-tab datasets
    make_submission.py              submit a zip to a phase
    download_submission_outputs.py  fetch a submission's outputs
"""
from __future__ import annotations

import argparse
import io
import json
import os
import re
import sys
import zipfile
from pathlib import Path
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


def session_login(base_url: str, username: "str | None",
                  password: "str | None") -> "requests.Session | None":
    """Browser-style (Django form) login, or None if it cannot log in.

    /datasets/download/<key>/ — the route behind the Files tab — is a plain
    Django view authenticated by session cookie, not the DRF token, so
    downloading participant-visible files needs this.
    """
    if not (username and password):
        return None
    session = requests.Session()
    login_url = urljoin(base_url, "/accounts/login/")
    resp = session.get(login_url, timeout=30)
    csrf = session.cookies.get("csrftoken")
    if resp.status_code != 200 or not csrf:
        return None
    resp = session.post(
        login_url,
        data={"username": username, "password": password, "csrfmiddlewaretoken": csrf},
        headers={"Referer": login_url},
        timeout=30,
    )
    # A successful Django form login redirects away; staying on the form = failure.
    if resp.status_code != 200 or "/accounts/login" in resp.url:
        return None
    return session


def download_files(base_url: str, session: "requests.Session | None",
                   files: list, save_dir: str) -> None:
    """Download every accessible Files-tab dataset into <save_dir>/input/.

    Zips are extracted in place; files Codabench refuses (reference data,
    unpublished programs) are reported and skipped.
    """
    if not files:
        return
    if session is None:
        print("[!!] skipping file downloads: no session (set CODABENCH_USERNAME "
              "/ CODABENCH_PASSWORD to download the starting kit & public data).")
        return
    input_dir = Path(save_dir) / "input"
    input_dir.mkdir(parents=True, exist_ok=True)
    got = []
    for f in files:
        url = urljoin(base_url, f"/datasets/download/{f['key']}/")
        try:
            resp = session.get(url, timeout=600, allow_redirects=True)
        except requests.RequestException as exc:
            print(f"[!!] {f['name']}: download failed: {exc}")
            continue
        if resp.status_code != 200:
            continue  # not authorized for this account (organizer-only) — skip quietly
        if zipfile.is_zipfile(io.BytesIO(resp.content)):
            dest = input_dir / re.sub(r"[^\w.\- ]+", "_", f["name"]).removesuffix(".zip")
            with zipfile.ZipFile(io.BytesIO(resp.content)) as zf:
                zf.extractall(dest)
        else:
            dest = input_dir / re.sub(r"[^\w.\- ]+", "_", f["name"])
            dest.write_bytes(resp.content)
        got.append(f["name"])
        print(f"[ok] file -> {dest} ({len(resp.content):,} bytes)")
    if not got:
        print("[!!] no files were downloadable for this account.")


def parse_competition_id(link: str) -> int:
    """Extract the numeric competition id from a URL or a bare id string."""
    link = link.strip()
    if link.isdigit():
        return int(link)
    m = re.search(r"/competitions/(\d+)", link)
    if m:
        return int(m.group(1))
    raise ValueError(f"could not find a competition id in {link!r}")


# ---- HTML -> readable text --------------------------------------------------
_TAG_RE = re.compile(r"<[^>]+>")
_BLANKS_RE = re.compile(r"[ \t]*\n[ \t]*\n[ \t]*\n+")


def strip_html(text: str) -> str:
    """Best-effort HTML -> readable text: drop tags, collapse blank runs."""
    if not text:
        return ""
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.I)
    text = re.sub(r"</p>", "\n\n", text, flags=re.I)
    text = _TAG_RE.sub("", text)
    text = (text.replace("&nbsp;", " ").replace("&amp;", "&")
                .replace("&lt;", "<").replace("&gt;", ">").replace("&#39;", "'"))
    return _BLANKS_RE.sub("\n\n", text).strip()


def slug(text: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", (text or "").lower()).strip("-")
    return s or "page"


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


# ---- report sections --------------------------------------------------------
def show_header(comp: dict) -> None:
    print(f"\n{'=' * 70}")
    print(comp.get("title", "?"))
    print(f"{'=' * 70}")
    print(f"  id           : {comp.get('id')}")
    print(f"  organizer    : {comp.get('owner_display_name') or comp.get('created_by')}")
    print(f"  created      : {str(comp.get('created_when', ''))[:10]}")
    print(f"  participants : {comp.get('participants_count')}")
    print(f"  submissions  : {comp.get('submissions_count')}")
    print(f"  docker image : {comp.get('docker_image')}")
    print(f"  data public  : input={comp.get('make_input_data_available')} "
          f"programs={comp.get('make_programs_available')}")


def show_pages(comp: dict, full: bool) -> None:
    pages = sorted(comp.get("pages") or [], key=lambda p: p.get("index", 0))
    if not pages:
        return
    print(f"\n----- Pages ({len(pages)}) -----")
    for page in pages:
        body = strip_html(page.get("content") or "")
        if full:
            print(f"\n## {page.get('title', '?')}\n")
            print(body)
        else:
            preview = " ".join(body.split())[:100]
            print(f"  {page.get('index', '?'):>2}. {page.get('title', '?'):<24} {preview}...")


def show_phases(comp: dict) -> None:
    phases = sorted(comp.get("phases") or [], key=lambda p: p.get("index", 0))
    print(f"\n----- Phases ({len(phases)}) -----")
    for ph in phases:
        print(f"\n  phase id={ph.get('id')}  index={ph.get('index')}  "
              f"status={ph.get('status')!r}  name={ph.get('name')!r}")
        print(f"    window   : {str(ph.get('start', ''))[:10]} -> {str(ph.get('end', ''))[:10]}")
        print(f"    quota    : {ph.get('max_submissions_per_day')}/day, "
              f"{ph.get('max_submissions_per_person')} total "
              f"(used: {ph.get('used_submissions_per_person', '?')})")
        for task in ph.get("tasks", []):
            print(f"    task id={task.get('id')}  {task.get('name')!r}")


def collect_files(comp: dict) -> list:
    """Every dataset the Files tab shows: phase-level kits + task-level datasets."""
    files, seen = [], set()

    def add(key, name, ftype, phase, task="", size=None):
        if key and key not in seen:
            seen.add(key)
            files.append({"key": key, "name": name or ftype, "type": ftype,
                          "phase": phase, "task": task, "size": size})

    for ph in comp.get("phases") or []:
        for attr in ("public_data", "starting_kit"):
            ds = ph.get(attr)
            if ds:
                add(ds.get("key"), ds.get("name"), attr, ph.get("name", ""),
                    size=ds.get("file_size"))
        for task in ph.get("tasks", []):
            for ds in task.get("public_datasets") or []:
                add(ds.get("key"), ds.get("name"), ds.get("type", "dataset"),
                    ph.get("name", ""), task.get("name", ""), ds.get("file_size"))
            for sol in task.get("solutions") or []:
                add(sol.get("data"), sol.get("name"), "solution",
                    ph.get("name", ""), task.get("name", ""), sol.get("size"))
    return files


def show_files(comp: dict) -> None:
    files = collect_files(comp)
    print(f"\n----- Files ({len(files)}) -----")
    if not files:
        print("  (none listed)")
        return
    for f in files:
        print(f"  {f['type']:<17} {pretty_size(f['size']):>9}  {f['name']}")
    print("  -> download with: ./download_competition_files.py -c", comp.get("id"))


def show_leaderboard(base_url: str, comp: dict, headers: dict) -> None:
    lbs = comp.get("leaderboards") or []
    if not lbs:
        return
    lb = lbs[0]
    cols = lb.get("columns") or []
    pi = lb.get("primary_index") or 0
    pcol = cols[pi] if pi < len(cols) else (cols[0] if cols else {})
    higher = pcol.get("sorting") == "desc"
    print(f"\n----- Leaderboard: {lb.get('title')} -----")
    print(f"  primary metric : {pcol.get('title')} ({pcol.get('key')}), "
          f"{'higher' if higher else 'lower'} is better")
    resp = requests.get(urljoin(base_url, f"/api/leaderboards/{lb.get('id')}/"),
                        headers=headers, timeout=60)
    if resp.status_code != 200:
        print("  entries        : (not visible)")
        return
    subs = resp.json().get("submissions") or []
    print(f"  entries        : {len(subs)}")
    scores = []
    for s in subs:
        for sc in s.get("scores", []):
            if sc.get("is_primary") or sc.get("column_key") == pcol.get("key"):
                try:
                    scores.append((float(sc["score"]), s.get("owner")))
                except (TypeError, ValueError, KeyError):
                    pass
                break
    if scores:
        best = max(scores) if higher else min(scores)
        print(f"  current best   : {best[0]:.5f} by {best[1]}")


def save_pages(comp: dict, save_dir: str) -> None:
    """Write description.md plus one markdown file per page under save_dir."""
    dest = Path(save_dir)
    pages_dir = dest / "pages"
    pages_dir.mkdir(parents=True, exist_ok=True)

    pages = sorted(comp.get("pages") or [], key=lambda p: p.get("index", 0))
    parts = [f"# {comp.get('title', '?')}", ""]
    for i, page in enumerate(pages):
        title = page.get("title") or f"page-{i}"
        body = page.get("content") or ""
        parts += [f"## {title}", strip_html(body), ""]
        idx = page.get("index", i)
        path = pages_dir / f"{int(idx):02d}-{slug(title)}.md"
        header = "" if body.lstrip().startswith("#") else f"# {title}\n\n"
        path.write_text(header + body, encoding="utf-8")
        print(f"[ok] page -> {path}")
    (dest / "description.md").write_text("\n".join(parts).strip() + "\n", encoding="utf-8")
    print(f"[ok] description -> {dest / 'description.md'}")


def parse_args(argv: list) -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Show a Codabench competition: pages, phases, files, leaderboard.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    p.add_argument("link", help="Competition URL or bare numeric id.")
    p.add_argument("--pages", action="store_true",
                   help="Print the full text of every page (default: one-line previews).")
    p.add_argument("--save-dir",
                   help="Also write description.md, pages/*.md, and download the "
                        "accessible files into <save-dir>/input/.")
    p.add_argument("--no-download",
                   action="store_true",
                   help="With --save-dir: save the description only, skip file downloads.")
    p.add_argument("--json", action="store_true",
                   help="Dump the raw API payload instead of the report.")
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

    try:
        competition_id = parse_competition_id(args.link)
    except ValueError as exc:
        die(str(exc))

    headers = auth_headers(args.url, args.username, args.password)
    resp = requests.get(urljoin(args.url, f"/api/competitions/{competition_id}/"),
                        headers=headers, timeout=60)
    if resp.status_code != 200:
        die(f"could not fetch competition {competition_id} ({resp.status_code}): {resp.text}")
    comp = resp.json()

    if args.json:
        print(json.dumps(comp, indent=2, ensure_ascii=False))
        return

    show_header(comp)
    show_pages(comp, full=args.pages)
    show_phases(comp)
    show_files(comp)
    show_leaderboard(args.url, comp, headers)

    if args.save_dir:
        print()
        save_pages(comp, args.save_dir)
        if not args.no_download:
            session = session_login(args.url, args.username, args.password)
            download_files(args.url, session, collect_files(comp), args.save_dir)
    print()


if __name__ == "__main__":
    main(sys.argv[1:])
