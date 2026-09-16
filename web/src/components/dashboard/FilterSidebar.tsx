"use client";

import { Search } from "lucide-react";
import clsx from "clsx";
import { FilterGroup, type FilterOption } from "./FilterGroup";
import type { FacetCounts } from "@/lib/types";

export interface ActiveFilters {
  domains: string[];
  sectors: string[];
  conferences: string[];
  countries: string[];
}

function toOptions(counts: Record<string, number> | undefined): FilterOption[] {
  if (!counts) return [];
  return Object.entries(counts)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

export function FilterSidebar({
  search,
  onSearchChange,
  matchMode,
  onMatchModeChange,
  facets,
  active,
  onToggle,
  onClear,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  matchMode: "any" | "all";
  onMatchModeChange: (mode: "any" | "all") => void;
  facets: FacetCounts | null;
  active: ActiveFilters;
  onToggle: (group: keyof ActiveFilters, label: string) => void;
  onClear: () => void;
}) {
  const activeCount =
    active.domains.length + active.sectors.length + active.conferences.length + active.countries.length;

  return (
    <div>
      <h2 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-muted">Search</h2>
      <div className="relative">
        <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="title / organizer…"
          className="w-full rounded-lg border border-hairline bg-surface-2 py-2 pl-8 pr-3 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>

      <h2 className="mb-1.5 mt-4 text-xs font-semibold uppercase tracking-wide text-ink-muted">
        Tag match mode
      </h2>
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={() => onMatchModeChange("any")}
          className={clsx(
            "flex-1 rounded-lg border py-1.5 text-xs font-medium",
            matchMode === "any"
              ? "border-accent bg-accent text-accent-ink"
              : "border-hairline bg-surface-2 text-ink-secondary hover:bg-surface-hover"
          )}
        >
          Any (OR)
        </button>
        <button
          type="button"
          onClick={() => onMatchModeChange("all")}
          className={clsx(
            "flex-1 rounded-lg border py-1.5 text-xs font-medium",
            matchMode === "all"
              ? "border-accent bg-accent text-accent-ink"
              : "border-hairline bg-surface-2 text-ink-secondary hover:bg-surface-hover"
          )}
        >
          All (AND)
        </button>
      </div>

      <div className="mt-1">
        <FilterGroup
          title="Research field"
          options={toOptions(facets?.domains)}
          selected={active.domains}
          onToggle={(label) => onToggle("domains", label)}
        />
        <FilterGroup
          title="Application sector"
          options={toOptions(facets?.sectors)}
          selected={active.sectors}
          onToggle={(label) => onToggle("sectors", label)}
        />
        <FilterGroup
          title="Conference / venue"
          options={toOptions(facets?.conferences)}
          selected={active.conferences}
          onToggle={(label) => onToggle("conferences", label)}
        />
        <FilterGroup
          title="Country (inferred)"
          options={toOptions(facets?.countries)}
          selected={active.countries}
          onToggle={(label) => onToggle("countries", label)}
          searchable
          defaultOpen={false}
        />
      </div>

      <button
        type="button"
        onClick={onClear}
        disabled={activeCount === 0 && !search}
        className="mt-4 w-full rounded-lg border border-hairline bg-surface-2 py-2 text-xs font-medium text-ink-secondary hover:border-accent hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
      >
        ↺ Reset all filters
      </button>
    </div>
  );
}
