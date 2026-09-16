import type { Competition } from "./types";

export interface CompetitionQuery {
  search?: string;
  domains?: string[];
  sectors?: string[];
  conferences?: string[];
  countries?: string[];
  matchMode?: "any" | "all";
}

function tagMatches(tags: string[], selected: string[] | undefined, mode: "any" | "all"): boolean {
  if (!selected || selected.length === 0) return true;
  const set = new Set(tags);
  return mode === "all"
    ? selected.every((s) => set.has(s))
    : selected.some((s) => set.has(s));
}

export function filterCompetitions(all: Competition[], query: CompetitionQuery): Competition[] {
  const mode = query.matchMode ?? "any";
  const search = query.search?.trim().toLowerCase();

  return all.filter((c) => {
    if (search) {
      const blob = `${c.title} ${c.organizer}`.toLowerCase();
      if (!blob.includes(search)) return false;
    }
    if (!tagMatches(c.domains, query.domains, mode)) return false;
    if (!tagMatches(c.sectors, query.sectors, mode)) return false;
    if (!tagMatches(c.conferences, query.conferences, mode)) return false;
    if (!tagMatches(c.countries, query.countries, mode)) return false;
    return true;
  });
}
