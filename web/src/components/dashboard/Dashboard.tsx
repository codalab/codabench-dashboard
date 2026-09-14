"use client";

import { useMemo, useState } from "react";
import { Download, SlidersHorizontal } from "lucide-react";
import { FilterSidebar, type ActiveFilters } from "./FilterSidebar";
import { MobileFilterDrawer } from "./MobileFilterDrawer";
import { CompetitionsTable, type SortKey } from "./CompetitionsTable";
import { StatTile } from "@/components/analytics/StatTile";
import { HorizontalBarChart } from "@/components/analytics/HorizontalBarChart";
import { filterCompetitions } from "@/lib/query";
import { computeStats } from "@/lib/stats";
import type { Competition, FacetCounts } from "@/lib/types";

const EMPTY_FILTERS: ActiveFilters = { domains: [], sectors: [], conferences: [], countries: [] };

function toFacetCounts(entries: { label: string; count: number }[]): Record<string, number> {
  return Object.fromEntries(entries.map((e) => [e.label, e.count]));
}

function downloadCsv(rows: Competition[]) {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const header = ["id", "title", "organizer", "url", "domains", "sectors", "conferences", "countries"];
  const lines = [header.join(",")].concat(
    rows.map((c) =>
      [
        c.id,
        esc(c.title),
        esc(c.organizer),
        esc(c.url),
        esc(c.domains.join("; ")),
        esc(c.sectors.join("; ")),
        esc(c.conferences.join("; ")),
        esc(c.countries.join("; ")),
      ].join(",")
    )
  );
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "codabench_filtered.csv";
  a.click();
  URL.revokeObjectURL(a.href);
}

export function Dashboard({ data }: { data: Competition[] }) {
  const [search, setSearch] = useState("");
  const [matchMode, setMatchMode] = useState<"any" | "all">("any");
  const [active, setActive] = useState<ActiveFilters>(EMPTY_FILTERS);
  const [sortKey, setSortKey] = useState<SortKey>("id");
  const [sortDir, setSortDir] = useState<1 | -1>(-1);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Sidebar checkbox counts are static totals over the full dataset (not
  // re-computed per selection) — filtering is fast enough client-side at
  // this data size that a live "faceted" recount isn't needed.
  const facetTotals = useMemo(() => computeStats(data), [data]);
  const facets: FacetCounts = useMemo(
    () => ({
      domains: toFacetCounts(facetTotals.byDomain),
      sectors: toFacetCounts(facetTotals.bySector),
      conferences: toFacetCounts(facetTotals.byConference),
      countries: toFacetCounts(facetTotals.byCountry),
    }),
    [facetTotals]
  );

  const filtered = useMemo(
    () => filterCompetitions(data, { search, matchMode, ...active }),
    [data, search, matchMode, active]
  );

  const sorted = useMemo(() => {
    const rows = [...filtered];
    rows.sort((a, b) => {
      if (sortKey === "id") return (a.id - b.id) * sortDir;
      return a[sortKey].localeCompare(b[sortKey]) * sortDir;
    });
    return rows;
  }, [filtered, sortKey, sortDir]);

  const stats = useMemo(() => computeStats(filtered), [filtered]);

  const activeCount =
    active.domains.length + active.sectors.length + active.conferences.length + active.countries.length;

  function toggleFilter(group: keyof ActiveFilters, label: string) {
    setActive((prev) => {
      const current = prev[group];
      const next = current.includes(label) ? current.filter((l) => l !== label) : [...current, label];
      return { ...prev, [group]: next };
    });
  }

  function resetAll() {
    setActive(EMPTY_FILTERS);
    setSearch("");
    setMatchMode("any");
  }

  function onSort(key: SortKey) {
    setSortDir((dir) => (sortKey === key ? ((dir * -1) as 1 | -1) : 1));
    setSortKey(key);
  }

  return (
    <div className="mx-auto flex max-w-[1600px] gap-6 px-4 py-6 sm:px-6">
      <aside className="hidden w-72 shrink-0 lg:block">
        <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pb-6">
          <FilterSidebar
            search={search}
            onSearchChange={setSearch}
            matchMode={matchMode}
            onMatchModeChange={setMatchMode}
            facets={facets}
            active={active}
            onToggle={toggleFilter}
            onClear={resetAll}
          />
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => setMobileFiltersOpen(true)}
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-lg border border-hairline bg-surface px-3.5 py-2.5 text-sm font-medium text-ink-secondary hover:bg-surface-hover lg:hidden"
        >
          <SlidersHorizontal size={15} />
          Filters
          {activeCount > 0 && (
            <span className="rounded-full bg-accent-soft px-1.5 text-xs font-semibold text-accent">
              {activeCount}
            </span>
          )}
        </button>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Competitions (filtered)" value={stats.total.toLocaleString()} />
          <StatTile label="Distinct organizers" value={stats.organizerCount.toLocaleString()} />
          <StatTile label="Tagged with a field" value={stats.taggedWithDomain.toLocaleString()} />
          <StatTile label="Linked to a conference" value={stats.linkedToConference.toLocaleString()} />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
          <HorizontalBarChart title="By research field" data={stats.byDomain} />
          <HorizontalBarChart title="By application sector" data={stats.bySector} />
          <HorizontalBarChart title="Top organizers" data={stats.topOrganizers} />
          <HorizontalBarChart title="By conference / venue" data={stats.byConference} />
        </div>
        <div className="mt-4">
          <HorizontalBarChart
            title="By country (inferred from text)"
            data={stats.byCountry}
            emptyLabel="No country mentions found."
          />
        </div>

        <div className="mt-4 flex items-center justify-end">
          <button
            type="button"
            onClick={() => downloadCsv(sorted)}
            className="flex items-center gap-1.5 rounded-lg border border-hairline bg-surface px-3 py-1.5 text-xs font-medium text-ink-secondary hover:bg-surface-hover"
          >
            <Download size={13} />
            Download filtered CSV
          </button>
        </div>

        <div className="mt-3">
          <CompetitionsTable
            rows={sorted}
            total={data.length}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={onSort}
            onReset={resetAll}
          />
        </div>
      </div>

      <MobileFilterDrawer
        open={mobileFiltersOpen}
        onClose={() => setMobileFiltersOpen(false)}
        search={search}
        onSearchChange={setSearch}
        matchMode={matchMode}
        onMatchModeChange={setMatchMode}
        facets={facets}
        active={active}
        onToggle={toggleFilter}
        onClear={resetAll}
        resultCount={stats.total}
      />
    </div>
  );
}
