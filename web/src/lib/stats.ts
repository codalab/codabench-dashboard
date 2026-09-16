import type { Competition, StatsResponse } from "./types";

function tally(items: Competition[], key: "domains" | "sectors" | "conferences" | "countries") {
  const counts: Record<string, number> = {};
  for (const item of items) {
    for (const tag of item[key]) {
      counts[tag] = (counts[tag] ?? 0) + 1;
    }
  }
  return Object.entries(counts)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

export function computeStats(all: Competition[]): StatsResponse {
  const organizerCounts: Record<string, number> = {};
  for (const c of all) {
    if (!c.organizer) continue;
    organizerCounts[c.organizer] = (organizerCounts[c.organizer] ?? 0) + 1;
  }
  const topOrganizers = Object.entries(organizerCounts)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  return {
    total: all.length,
    taggedWithDomain: all.filter((c) => c.domains.length > 0).length,
    linkedToConference: all.filter((c) => c.conferences.length > 0).length,
    organizerCount: Object.keys(organizerCounts).length,
    byDomain: tally(all, "domains"),
    bySector: tally(all, "sectors"),
    byConference: tally(all, "conferences"),
    byCountry: tally(all, "countries"),
    topOrganizers,
  };
}
