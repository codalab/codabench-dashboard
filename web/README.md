# Codabench Competition Intelligence — Dashboard

A Next.js dashboard for exploring and analyzing scraped Codabench competitions, with keyword-derived
tags for research field, application sector, conference/venue, and country.

This is the **frontend-first** slice of the full pipeline described in [`../todo.md`](../todo.md): it
reads directly from [`../codabench_competitions.csv`](../codabench_competitions.csv) (the same data
`taxonomy.py` / `dashboard.py` / `generate_data.py` use) instead of a Postgres+pgvector backend and
LLM extraction pipeline, which haven't been built yet.

The UI is a from-scratch, typed rebuild of the earlier static prototype ([`../dist/index.html`](../dist/index.html)):
same single-page layout and dark-navy visual identity, now in Next.js/TypeScript/Tailwind with a proper
component structure, a light theme option, and accessible chart markup (see [Architecture](#architecture)).

## Requirements

Node.js **20.9+** (the repo's system Node is v12, which is too old for Next.js 16 — see
[Toolchain](#toolchain-note) below if `node -v` shows anything older than 20).

## Getting started

```bash
cd web
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Four pages, linked from the header:

- **Dashboard** (`/`) — a filter sidebar (search, match any/all, research field, application sector,
  conference/venue, country) drives KPI tiles, bar charts, and a sortable table, all recomputed live,
  client-side, as you filter. Dark navy is the default theme; the header toggle switches to light.
- **Organizers** (`/organizers`) — a treemap (in the style of AI World's NeurIPS-2025 leadership
  chart): each rectangle is an organizer, sized by number of competitions run, colored by their most
  common research field (a fixed 7-color palette + "Other" for the long tail — we don't have real
  institution/company/country data per organizer, so field is the closest honest analogue). Hover for
  exact counts; a Top 50 / Top 100 / All toggle controls density.
- **Conferences** (`/conferences`) — the same treemap style, flat this time: one rectangle per
  conference/venue, sized by linked competition count, colored individually for the top 7 (CVPR, ACL,
  MICCAI, ...) with the rest sharing a neutral "Other" tone.
- **Globe** (`/globe`) — a 3D globe (`globe.gl`, loaded from CDN like the original prototype) showing
  real arcs from every inferred competition-origin country to the Codabench/France hub, plus a
  **simulated** live feed of "challenge created" / "submission received" pulses — simulated because
  this repo has no real submission telemetry, only the static competition list. Clearly labeled as such
  in the UI so it doesn't read as live data.

## Architecture

```text
codabench_competitions.csv
        │
        ▼
src/lib/taxonomy.ts             keyword → tag rules (ported from ../taxonomy.py)
src/lib/competitions-store.ts   reads + parses the CSV, caches in memory (invalidated on file mtime change)
        │
        ▼
src/app/page.tsx                server component: loads the full tagged dataset once
        │
        ▼
src/components/dashboard/Dashboard.tsx   client component: owns filter/search/sort state,
                                          re-filters `data` in-memory (src/lib/query.ts) and
                                          re-aggregates it (src/lib/stats.ts) on every change —
                                          no network round-trip, since the whole dataset (~1,370
                                          rows) already lives on the client
        │
        ├── FilterSidebar / FilterGroup / MobileFilterDrawer   sidebar + responsive drawer
        ├── CompetitionsTable                                   sortable table, tag-pill cells
        └── ../analytics/{StatTile,HorizontalBarChart}          KPI tiles + bar charts

src/lib/treemap.ts           generic squarified-treemap layout (d3-hierarchy) + shared types
src/lib/organizers.ts        groups organizers by primary field → src/components/treemap/OrganizerTreemap.tsx
src/lib/conferences.ts       groups conferences (flat)         → src/components/treemap/ConferenceTreemap.tsx
        └── both render through the shared components/treemap/TreemapChart.tsx
```

There's no API layer in this slice — filtering/aggregation happen entirely in the browser, which is
the same model the static prototype used (`data.js` loaded once, everything else computed client-side).
To point this at a real backend later (Postgres, paginated `/api/competitions`, server-side faceting for
a much larger dataset), reintroduce route handlers that return the same shapes as `src/lib/types.ts` and
have `Dashboard` fetch instead of receiving `data` as a prop — `query.ts` and `stats.ts` are pure
functions with no client/server dependency either way.

## Toolchain note

If your system Node is older than 20, don't touch the system install — a self-contained Node 20
runtime is checked into `../.toolchain/node20` (gitignored) for this purpose:

```bash
export PATH="$(pwd)/../.toolchain/node20/bin:$PATH"
node -v   # v20.18.1
```

Add that `export` to your shell profile, or prefix commands with it, whenever working in `web/`.

## Known build warning

`npm run build` prints a Turbopack warning about `competitions-store.ts` reading a file outside
`web/`. It's expected (the CSV lives in the repo root, not inside the app) and harmless for
`npm run start` / local use; it would only matter if this were deployed to a serverless platform
that bundles by trace (e.g. Vercel), which isn't the current target.

## Data freshness

The CSV is re-parsed automatically whenever its mtime changes (no restart needed) — re-run the
scraper/taxonomy scripts in the repo root and refresh the browser.

## Scripts

```bash
npm run dev     # start the dev server on :3000
npm run build   # production build
npm run start   # run the production build
npm run lint    # eslint
```
