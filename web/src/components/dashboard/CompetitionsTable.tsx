"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, ExternalLink } from "lucide-react";
import clsx from "clsx";
import { Tag } from "@/components/ui/Tag";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Competition } from "@/lib/types";

export type SortKey = "id" | "title" | "organizer";

function TagCell({ values, tone }: { values: string[]; tone?: "accent" | "neutral" }) {
  if (values.length === 0) return <span className="text-ink-muted">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {values.map((v) => (
        <Tag key={v} tone={tone}>
          {v}
        </Tag>
      ))}
    </div>
  );
}

function SortableHeader({
  label,
  sortKey,
  activeKey,
  dir,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  dir: 1 | -1;
  onSort: (key: SortKey) => void;
}) {
  const active = sortKey === activeKey;
  return (
    <th
      scope="col"
      className="sticky top-0 z-10 select-none bg-surface px-3 py-2.5 text-left font-semibold text-ink-secondary"
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={clsx(
          "flex items-center gap-1 hover:text-ink",
          active && "text-ink"
        )}
      >
        {label}
        {active ? (
          dir === 1 ? (
            <ArrowUp size={12} />
          ) : (
            <ArrowDown size={12} />
          )
        ) : (
          <ArrowUpDown size={12} className="opacity-40" />
        )}
      </button>
    </th>
  );
}

export function CompetitionsTable({
  rows,
  total,
  sortKey,
  sortDir,
  onSort,
  onReset,
}: {
  rows: Competition[];
  total: number;
  sortKey: SortKey;
  sortDir: 1 | -1;
  onSort: (key: SortKey) => void;
  onReset?: () => void;
}) {
  return (
    <div className="rounded-xl border border-hairline bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink">
          Competitions <span className="font-normal text-ink-muted">({rows.length.toLocaleString()})</span>
        </h3>
      </div>

      {rows.length === 0 ? (
        <EmptyState onReset={total > 0 ? onReset : undefined} />
      ) : (
        <div className="max-h-[560px] overflow-auto rounded-lg border border-hairline">
          <table className="w-full min-w-[900px] border-collapse text-xs">
            <thead>
              <tr>
                <SortableHeader label="ID" sortKey="id" activeKey={sortKey} dir={sortDir} onSort={onSort} />
                <SortableHeader label="Title" sortKey="title" activeKey={sortKey} dir={sortDir} onSort={onSort} />
                <SortableHeader
                  label="Organizer"
                  sortKey="organizer"
                  activeKey={sortKey}
                  dir={sortDir}
                  onSort={onSort}
                />
                <th className="sticky top-0 z-10 bg-surface px-3 py-2.5 text-left font-semibold text-ink-secondary">
                  Field
                </th>
                <th className="sticky top-0 z-10 bg-surface px-3 py-2.5 text-left font-semibold text-ink-secondary">
                  Sector
                </th>
                <th className="sticky top-0 z-10 bg-surface px-3 py-2.5 text-left font-semibold text-ink-secondary">
                  Conference
                </th>
                <th className="sticky top-0 z-10 bg-surface px-3 py-2.5 text-left font-semibold text-ink-secondary">
                  Country
                </th>
                <th className="sticky top-0 z-10 bg-surface px-3 py-2.5 text-left font-semibold text-ink-secondary">
                  Link
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-t border-hairline hover:bg-surface-hover">
                  <td className="px-3 py-2.5 tabular-nums text-ink-muted">{c.id}</td>
                  <td className="max-w-xs px-3 py-2.5 text-ink">{c.title}</td>
                  <td className="px-3 py-2.5 text-ink-secondary">{c.organizer || "—"}</td>
                  <td className="px-3 py-2.5">
                    <TagCell values={c.domains} tone="accent" />
                  </td>
                  <td className="px-3 py-2.5">
                    <TagCell values={c.sectors} />
                  </td>
                  <td className="px-3 py-2.5">
                    <TagCell values={c.conferences} />
                  </td>
                  <td className="px-3 py-2.5">
                    <TagCell values={c.countries} />
                  </td>
                  <td className="px-3 py-2.5">
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-1 font-medium text-accent hover:text-accent-hover"
                    >
                      open <ExternalLink size={11} />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
