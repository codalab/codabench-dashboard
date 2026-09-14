# codabench-dashboard

A dashboard for Codabench to visualize, monitor, and analyze competition data, submissions, evaluations, and benchmark results through interactive analytics.

## Current status

- **`web/`** — a working Next.js dashboard (Explore + Analytics tabs) reading from
  [`codabench_competitions.csv`](codabench_competitions.csv). Run it with `cd web && npm install && npm run dev`
  — see [`web/README.md`](web/README.md) for details (including a Node 20 toolchain note, since the
  system Node here is v12).
- **`get_competition.py`**, **`get_competition_details.py`**, **`download_competition_files.py`** — Stage 1
  of the fuller pipeline below (per-competition markdown docs + file downloads via the Codabench API).
- Everything past that (LLM extraction, Postgres+pgvector, FastAPI, `/ask`, `/similar`) described below is
  **not built yet** — this section is the original planning conversation, kept for reference.

---

Good — that gives us a clear target: a continuously-updated Postgres+pgvector backend serving both a search/explore UI and an analytics view. Here's the fleshed-out build plan.

## Architecture Overview

```
┌─────────────────┐
│ Codabench API   │
└────────┬────────┘
         │ scheduled fetch (cron/Airflow, e.g. every 6-12h)
         ▼
┌─────────────────┐
│ Raw staging     │  (JSON blobs, keyed by comp_id + fetched_at)
└────────┬────────┘
         │ diff against last version → only reprocess changed comps
         ▼
┌─────────────────┐
│ Markdown builder│  → 00-overview.md ... 05-faq.md + metadata.json
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ LLM extraction  │  → structured JSON (names, emails, affiliations, etc.)
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│ Postgres + pgvector         │
│  - relational tables        │
│  - embeddings per doc chunk │
└────────┬────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│ API layer (FastAPI)          │
│  - /search (SQL filters)     │
│  - /ask (text-to-SQL)        │
│  - /similar (vector search)  │
│  - /stats (analytics agg)    │
└────────┬─────────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Dashboard (frontend)    │
└─────────────────────────┘
```

## 1. Scheduled Ingestion

- **Orchestrator:** Airflow, Prefect, or even a simple cron + Python script if scale is small. Airflow is worth it once you have multiple stages that need retries/monitoring.
- **Job:** hit `/api/competitions/`, diff each competition's `updated_at` (or hash the payload) against the last stored version. Only push changed competitions further down the pipeline — avoids re-running LLM extraction on unchanged data (saves cost).
- Log every run (comp_id, status, timestamp) in a `ingestion_log` table for observability.

## 2. Database Schema (Postgres + pgvector)

```sql
-- Core entity
CREATE TABLE competitions (
  id UUID PRIMARY KEY,
  codabench_id TEXT UNIQUE,
  title TEXT,
  challenge_type TEXT,
  phase_start TIMESTAMP,
  phase_end TIMESTAMP,
  status TEXT,          -- upcoming / active / closed
  last_synced TIMESTAMP
);

CREATE TABLE organizers (
  id UUID PRIMARY KEY,
  competition_id UUID REFERENCES competitions(id),
  name TEXT,
  email TEXT,
  affiliation TEXT
);

CREATE TABLE datasets (
  id UUID PRIMARY KEY,
  competition_id UUID REFERENCES competitions(id),
  source TEXT,
  fields TEXT[]
);

CREATE TABLE documents (
  id UUID PRIMARY KEY,
  competition_id UUID REFERENCES competitions(id),
  doc_type TEXT,        -- overview/data/evaluation/etc.
  content TEXT,
  embedding VECTOR(1536) -- pgvector
);
```

- Index `embedding` with an IVFFlat or HNSW index for fast similarity search.
- Index `phase_start`, `phase_end`, `challenge_type` for the analytics queries.

## 3. Extraction Job

- Prompt an LLM per competition with the 6 markdown docs concatenated, asking for the structured JSON schema (names, emails, affiliations, dataset sources, fields, challenge type).
- Validate with a schema (Pydantic) before insert — reject/flag malformed emails or empty required fields rather than silently inserting garbage.
- Chunk each doc (e.g. ~500 tokens) and embed each chunk into `documents.embedding` for the vector search side.

## 4. API Layer (FastAPI recommended)

- `/search?field=NLP&status=active` → plain SQL filter, backs the "explore" UI.
- `/ask` → natural language → text-to-SQL (LLM translates question → SQL against the schema above → executes → returns rows). Keep this read-only (no write access) and validate the generated SQL against an allowlist of tables before running it.
- `/similar/{comp_id}` → pgvector cosine similarity over `documents.embedding`.
- `/stats` → precomputed aggregates (competitions per field over time, top affiliations, phase-status counts) — cache these since analytics dashboards get hit often but don't need per-request freshness.

## 5. Dashboard (Frontend)

Since you want both explore and analytics with equal weight, a two-tab layout works well:

- **Explore tab:** filter sidebar (field, status, affiliation, date range) + result cards + a search box that hits `/ask` for natural-language queries + a "find similar" button per competition.
- **Analytics tab:** charts — competitions by field over time, phase-status breakdown, top organizing institutions, dataset source frequency.

Stack suggestion: Next.js + Tailwind for frontend, calling the FastAPI backend. If you want to move faster initially, Streamlit can get both tabs working with less frontend code, at the cost of less UI polish.

## Suggested build order

1. Ingestion job → raw staging (get real data flowing first)
2. Markdown builder + DB schema
3. Extraction job (start with a handful of competitions to validate schema quality)
4. `/search` and `/stats` endpoints (structured, no LLM needed at query time)
5. Embeddings + `/similar`
6. `/ask` (text-to-SQL) — build last since it depends on the schema being stable
7. Dashboard UI wired to the above

Want me to scaffold the actual project structure (FastAPI backend + DB migrations + a starter dashboard) as files you can start from?
