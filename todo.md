Build Prompt: Codabench Competition Intelligence Dashboard

Copy everything below into your LLM / coding agent (e.g. Claude Code) to scaffold the project.

---

## Project Goal

Build a data pipeline + dashboard that, starting from a Codabench competition ID, collects all public information about the competition and its organizers, extracts and enriches structured metadata, stores it in a searchable database, and exposes it through a dashboard with both keyword/SQL search and semantic ("ask a question") search.

## Input

A list of Codabench competition IDs (or "fetch all active competitions" mode).

## Pipeline Stages

### Stage 1 — Fetch competition files

For each competition ID:

- Call the Codabench API to retrieve the competition's full page content: overview, data description, evaluation, submission format, rules, FAQ/announcements, and phase start/end dates.
- Save the raw response to a staging table/folder, keyed by `competition_id` + `fetched_at` timestamp.
- Normalize the content into structured docs:
  ```
  /competitions/{comp_id}/00-overview.md
  /competitions/{comp_id}/01-data.md
  /competitions/{comp_id}/02-evaluation.md
  /competitions/{comp_id}/03-submission.md
  /competitions/{comp_id}/04-rules.md
  /competitions/{comp_id}/05-faq-announcements.md
  /competitions/{comp_id}/metadata.json   # phase dates, status, raw org name
  ```

### Stage 2 — Extract emails and links

- Scan all 6 markdown docs for:
  - Email addresses (regex + validation)
  - URLs (regex), classified by pattern into: `github.com/*`, university domains (`.edu`, known university domains), conference sites (neurips.cc, icml.cc, aaai.org, etc.), personal/lab homepages, other.
- Deduplicate emails and links per competition.
- Store in an `extracted_links` table: `competition_id, url, url_type, source_doc`.
- Store in an `extracted_emails` table: `competition_id, email, source_doc`.

### Stage 3 — Open links and summarize

For each unique link (respecting robots.txt and rate limits):

- Fetch the page content (fallback to a cached snapshot if the page is unreachable).
- Ask an LLM to classify and summarize the page into structured fields:
  ```json
  {
    "url": "",
    "url_type": "university | professor_homepage | github_repo | huggingface_repo | data storage | conference | lab | other",
    "institution_name": "",
    "person_name": "",
    "role": "",              // e.g. professor, PhD student, research scientist
    "summary": "",           // 1-3 sentence summary of what this page is
    "related_conference": "" // if applicable
  }
  ```
- Validate this JSON against a schema before inserting (reject hallucinated fields, flag empty required fields for manual review rather than dropping silently).
- Store in a `link_profiles` table linked back to `extracted_links`.

### Stage 4 — Aggregate competition-level metadata

- Roll up `link_profiles` and `extracted_emails` per competition into a single `competition_metadata` record:

  ```json
  {
    "competition_id": "",
    "organizer_names": [],
    "organizer_emails": [],
    "affiliations": [],            // universities / companies / labs
    "affiliation_type": "",        // university | company | lab | mixed
    "github_repos": [],
    "related_conferences": [],
    "dataset_sources": [],
    "dataset_modality": [],        // e.g. image, text, audio, video, tabular, graph, multimodal
    "prize": "",                   // free text, e.g. "$10,000" or "None" if not mentioned
    "application_fields": [],      // e.g. healthcare, finance, climate, robotics, education
    "techniques": [],              // controlled vocabulary, see below
    "supervision_type": "",        // supervised | unsupervised | semi-supervised | self-supervised | reinforcement
    "challenge_type": ""
  }
  ```

  **Controlled vocabulary for `techniques`** (multi-select, extracted values must map to this list):
  `vision, nlp, classification, reasoning, reinforcement_learning, tabular, time_series, automl, writing, audio, object_detection, analysis_visualisation, optimisation`

  When extracting, instruct the LLM to only choose from this list (plus an `other: ""` free-text fallback for anything genuinely uncategorized) so the field stays queryable/filterable rather than free text.

### Stage 5 — Store in database (Postgres + pgvector)

Schema:

```sql
CREATE TABLE competitions (
  id UUID PRIMARY KEY,
  codabench_id TEXT UNIQUE,
  title TEXT,
  challenge_type TEXT,
  supervision_type TEXT,        -- supervised | unsupervised | semi-supervised | self-supervised | reinforcement
  prize TEXT,
  phase_start TIMESTAMP,
  phase_end TIMESTAMP,
  status TEXT,
  last_synced TIMESTAMP
);

CREATE TABLE organizers (
  id UUID PRIMARY KEY,
  competition_id UUID REFERENCES competitions(id),
  name TEXT,
  email TEXT,
  affiliation TEXT,
  affiliation_type TEXT          -- university | company | lab | mixed
);

CREATE TABLE techniques (
  id UUID PRIMARY KEY,
  competition_id UUID REFERENCES competitions(id),
  technique TEXT                 -- one of the controlled vocabulary values
);

CREATE TABLE application_fields (
  id UUID PRIMARY KEY,
  competition_id UUID REFERENCES competitions(id),
  field TEXT                     -- e.g. healthcare, finance, climate, robotics
);

CREATE TABLE link_profiles (
  id UUID PRIMARY KEY,
  competition_id UUID REFERENCES competitions(id),
  url TEXT,
  url_type TEXT,
  institution_name TEXT,
  person_name TEXT,
  role TEXT,
  summary TEXT,
  related_conference TEXT
);

CREATE TABLE datasets (
  id UUID PRIMARY KEY,
  competition_id UUID REFERENCES competitions(id),
  source TEXT,
  modality TEXT[],               -- e.g. image, text, audio, video, tabular, graph, multimodal
  fields TEXT[]
);

CREATE TABLE documents (
  id UUID PRIMARY KEY,
  competition_id UUID REFERENCES competitions(id),
  doc_type TEXT,
  content TEXT,
  embedding VECTOR(1536)
);
```

- Chunk and embed each of the 6 markdown docs into `documents.embedding` (pgvector, HNSW or IVFFlat index).
- Index `phase_start`, `phase_end`, `challenge_type`, `status` for fast filtering.

### Stage 6 — API layer (FastAPI)

- `GET /competitions?field=&status=&affiliation=&affiliation_type=&technique=&supervision_type=&modality=&prize_min=` — structured filter search across all extracted fields.
- `POST /ask` — natural language question → text-to-SQL → execute (read-only, validated against an allowlist of tables) → return rows.
- `GET /similar/{competition_id}` — pgvector cosine similarity search over `documents.embedding`.
- `GET /stats` — precomputed aggregates: competitions per field over time, top affiliations (with affiliation_type breakdown: university vs company vs lab), phase-status counts, most common dataset sources and modalities, technique frequency, supervision-type breakdown, prize distribution.

### Stage 7 — Dashboard

Two-tab layout:

- **Explore tab**: filter sidebar (application field, status, affiliation, affiliation type, technique, supervision type, dataset modality, prize range, date range), result cards, natural-language search box hitting `/ask`, "find similar" button per competition, and a detail view rendering the 6 docs + organizer/link profiles + technique/modality/prize tags.
- **Analytics tab**: charts for competitions-by-application-field-over-time, phase-status breakdown, top institutions (split by university/company/lab), dataset modality frequency, technique frequency (bar chart across the controlled vocabulary), supervision-type breakdown, prize distribution.

## Non-functional requirements

- Pipeline must be idempotent and incremental: re-running on an already-processed competition should only reprocess if content changed (hash/diff check), to avoid re-spending LLM calls.
- Respect robots.txt and add delays when scraping external links.
- Log every stage's success/failure per competition ID in an `ingestion_log` table for observability.
- All LLM-extracted JSON must be validated against a schema (e.g. Pydantic) before DB insertion; invalid records go to a `needs_review` queue instead of being dropped or silently inserted.
- `/ask` (text-to-SQL) must only run read-only, allowlisted queries — no arbitrary SQL execution.

## Suggested build order

1. Stage 1 (ingestion) end-to-end for a handful of competition IDs — validate raw data collection first.
2. python3 get_competition.py  id  --save-dir workdir/id
3. Stage 2 (emaillink extraction) — pure regex/parsing, no LLM needed yet.
4. Stage 3 (link summarization) — start with a small sample, check summary quality before scaling.
5. Stage 4-5 (aggregation + DB schema + embeddings).
6. Stage 6 (API: `/competitions` and `/stats` first, since they don't need LLM at query time).
7. `/ask` and `/similar` last, since they depend on a stable schema.
8. Stage 7 (dashboard) wired to the above.

## Deliverables

- A working ingestion script/job callable with a list of competition IDs.
- Database migrations for the schema above.
- FastAPI backend with the endpoints listed.
- A minimal working dashboard (Next.js) covering both explore and analytics tabs.
- A README documenting how to run the pipeline and the dashboard locally.
