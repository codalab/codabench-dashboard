import type { Competition } from "./types";
import { computeStats } from "./stats";
import { OTHER_LABEL, type TreemapGroup } from "./treemap";

const MAX_COLORED_GROUPS = 7;

/**
 * The fixed field → color-slot order, ranked once from the *full* dataset
 * so it never changes as the top-N organizer filter changes — colors stay
 * pinned to a field identity rather than being reassigned by whatever
 * happens to be visible.
 */
export function getFieldColorOrder(competitions: Competition[]): string[] {
  return computeStats(competitions).byDomain.slice(0, MAX_COLORED_GROUPS).map((d) => d.label);
}

/**
 * Groups organizers by their most common research field (the mode of
 * `domains` across their competitions), folding every field past the 7
 * most prominent — plus organizers with no field tag at all — into a
 * single "Other" group. Mirrors the dataviz categorical-palette ceiling:
 * past ~7-8 series, fold the tail rather than generating more hues.
 */
export function groupOrganizersByField(
  competitions: Competition[],
  topN: number | "all",
  fieldColorOrder: string[]
): TreemapGroup[] {
  const byOrganizer = new Map<string, { count: number; domainCounts: Map<string, number> }>();

  for (const c of competitions) {
    if (!c.organizer) continue;
    const entry = byOrganizer.get(c.organizer) ?? { count: 0, domainCounts: new Map<string, number>() };
    entry.count += 1;
    for (const d of c.domains) {
      entry.domainCounts.set(d, (entry.domainCounts.get(d) ?? 0) + 1);
    }
    byOrganizer.set(c.organizer, entry);
  }

  const topFields = new Set(fieldColorOrder);

  let organizers = Array.from(byOrganizer.entries()).map(([name, entry]) => {
    let primaryField: string | null = null;
    let bestCount = 0;
    for (const [field, count] of entry.domainCounts) {
      if (count > bestCount) {
        bestCount = count;
        primaryField = field;
      }
    }
    const group = primaryField && topFields.has(primaryField) ? primaryField : OTHER_LABEL;
    return { name, count: entry.count, group };
  });

  organizers = organizers.sort((a, b) => b.count - a.count);
  if (topN !== "all") organizers = organizers.slice(0, topN);

  const groups = new Map<string, TreemapGroup>();
  for (const org of organizers) {
    const g = groups.get(org.group) ?? { group: org.group, total: 0, leaves: [] };
    g.total += org.count;
    g.leaves.push(org);
    groups.set(org.group, g);
  }

  return Array.from(groups.values()).sort((a, b) => b.total - a.total);
}
