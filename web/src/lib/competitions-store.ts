import "server-only";
import fs from "node:fs";
import path from "node:path";
import Papa from "papaparse";
import { tagRow } from "./taxonomy";
import type { Competition } from "./types";

interface RawRow {
  id: string;
  title: string;
  organizer: string;
  description: string;
  url: string;
}

const CSV_PATH =
  process.env.CODABENCH_CSV_PATH ??
  path.join(process.cwd(), "..", "codabench_competitions.csv");

interface Cache {
  mtimeMs: number;
  competitions: Competition[];
}

// Survives Next.js dev hot-reloads (module re-evaluation) by living on
// globalThis instead of a module-scoped variable.
const globalForStore = globalThis as unknown as { __competitionsCache?: Cache };

function loadFromDisk(): Competition[] {
  const csv = fs.readFileSync(CSV_PATH, "utf-8");
  const parsed = Papa.parse<RawRow>(csv, {
    header: true,
    skipEmptyLines: true,
  });

  return parsed.data
    .filter((row) => row.id && row.title)
    .map((row): Competition => {
      const description = (row.description ?? "").trim();
      const tags = tagRow(row.title, description);
      return {
        id: Number(row.id),
        title: row.title,
        organizer: (row.organizer ?? "").trim(),
        description,
        url: row.url,
        ...tags,
      };
    });
}

/** Returns all competitions, re-parsing the CSV only when its mtime changes. */
export function getCompetitions(): Competition[] {
  const stat = fs.statSync(CSV_PATH);
  const cached = globalForStore.__competitionsCache;
  if (cached && cached.mtimeMs === stat.mtimeMs) {
    return cached.competitions;
  }
  const competitions = loadFromDisk();
  globalForStore.__competitionsCache = { mtimeMs: stat.mtimeMs, competitions };
  return competitions;
}
