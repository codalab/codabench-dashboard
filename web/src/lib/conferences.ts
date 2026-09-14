import type { Competition } from "./types";
import { computeStats } from "./stats";
import { OTHER_LABEL, type TreemapGroup } from "./treemap";

const MAX_COLORED_CONFERENCES = 7;

/** The fixed conference → color-slot order, ranked once from the full dataset. */
export function getConferenceColorOrder(competitions: Competition[]): string[] {
  return computeStats(competitions).byConference.slice(0, MAX_COLORED_CONFERENCES).map((d) => d.label);
}

/**
 * One group per conference/venue, each holding a single leaf (itself) — a
 * flat treemap, unlike the organizers page's field→organizer nesting.
 * Conferences past the top 7 keep their own rectangle (there are only
 * ~17 total, all worth showing) but share the neutral "Other" color
 * rather than consuming another palette slot.
 */
export function groupConferences(competitions: Competition[], colorOrder: string[]): TreemapGroup[] {
  const topConferences = new Set(colorOrder);
  return computeStats(competitions).byConference.map(({ label, count }) => ({
    group: topConferences.has(label) ? label : OTHER_LABEL,
    total: count,
    leaves: [{ name: label, count, group: topConferences.has(label) ? label : OTHER_LABEL }],
  }));
}
