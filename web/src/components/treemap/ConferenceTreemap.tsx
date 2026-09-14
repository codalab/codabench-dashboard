"use client";

import { useMemo } from "react";
import { getConferenceColorOrder, groupConferences } from "@/lib/conferences";
import type { Competition } from "@/lib/types";
import { TreemapChart } from "./TreemapChart";

export function ConferenceTreemap({ competitions }: { competitions: Competition[] }) {
  const colorOrder = useMemo(() => getConferenceColorOrder(competitions), [competitions]);
  const groups = useMemo(() => groupConferences(competitions, colorOrder), [competitions, colorOrder]);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-hairline px-4 py-3 sm:px-6">
        <h1 className="text-sm font-semibold text-ink">Competitions by conference / venue</h1>
        <p className="mt-0.5 text-xs text-ink-muted">
          Each rectangle is a conference or venue, sized by linked competition count. Only the top 7
          get their own color — the rest share a neutral tone rather than adding more hues.
        </p>
      </div>

      <div className="min-h-0 flex-1">
        <TreemapChart groups={groups} colorOrder={colorOrder} groupLabel="Venue" />
      </div>
    </div>
  );
}
