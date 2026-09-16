"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { groupOrganizersByField, getFieldColorOrder } from "@/lib/organizers";
import type { Competition } from "@/lib/types";
import { TreemapChart } from "./TreemapChart";

const TOP_N_OPTIONS: { label: string; value: number | "all" }[] = [
  { label: "Top 50", value: 50 },
  { label: "Top 100", value: 100 },
  { label: "All", value: "all" },
];

export function OrganizerTreemap({ competitions }: { competitions: Competition[] }) {
  const [topN, setTopN] = useState<number | "all">(100);

  const colorOrder = useMemo(() => getFieldColorOrder(competitions), [competitions]);
  const groups = useMemo(
    () => groupOrganizersByField(competitions, topN, colorOrder),
    [competitions, topN, colorOrder]
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-4 py-3 sm:px-6">
        <div>
          <h1 className="text-sm font-semibold text-ink">Organizer leadership by research field</h1>
          <p className="mt-0.5 text-xs text-ink-muted">
            Each rectangle is an organizer, sized by number of competitions run; color = their most
            common research field.
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-hairline p-1 text-xs font-medium">
          {TOP_N_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => setTopN(opt.value)}
              className={clsx(
                "rounded-md px-2.5 py-1",
                topN === opt.value ? "bg-accent-soft text-accent" : "text-ink-secondary hover:bg-surface-hover"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <TreemapChart groups={groups} colorOrder={colorOrder} groupLabel="Field" />
      </div>
    </div>
  );
}
