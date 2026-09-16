"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import clsx from "clsx";

export interface FilterOption {
  label: string;
  count: number;
}

export function FilterGroup({
  title,
  options,
  selected,
  onToggle,
  searchable = false,
  collapsedCount = 8,
  defaultOpen = true,
}: {
  title: string;
  options: FilterOption[];
  selected: string[];
  onToggle: (label: string) => void;
  searchable?: boolean;
  collapsedCount?: number;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);

  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  // Selected options always stay visible, even past the collapse cut / search miss.
  const visible = useMemo(() => {
    if (expanded || filtered.length <= collapsedCount) return filtered;
    const selectedSet = new Set(selected);
    const head = filtered.slice(0, collapsedCount);
    const missingSelected = filtered
      .slice(collapsedCount)
      .filter((o) => selectedSet.has(o.label));
    return [...head, ...missingSelected];
  }, [filtered, expanded, collapsedCount, selected]);

  if (options.length === 0) return null;

  return (
    <div className="border-b border-hairline py-4 first:pt-0 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-sm font-semibold text-ink"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          {title}
          {selected.length > 0 && (
            <span className="rounded-full bg-accent-soft px-1.5 py-0.5 text-[11px] font-semibold text-accent">
              {selected.length}
            </span>
          )}
        </span>
        <ChevronDown
          size={16}
          className={clsx("text-ink-muted transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="mt-3 space-y-2">
          {searchable && options.length > collapsedCount && (
            <div className="relative">
              <Search
                size={14}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted"
              />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Filter ${title.toLowerCase()}…`}
                className="w-full rounded-md border border-hairline bg-surface py-1.5 pl-7 pr-2 text-xs text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          )}

          <ul className="max-h-64 space-y-0.5 overflow-y-auto pr-1" role="group" aria-label={title}>
            {visible.map((option) => {
              const checked = selected.includes(option.label);
              return (
                <li key={option.label}>
                  <label className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-sm hover:bg-surface-hover">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggle(option.label)}
                      className="h-3.5 w-3.5 rounded-sm border-strong text-accent accent-[var(--accent)]"
                    />
                    <span
                      className={clsx(
                        "flex-1 truncate",
                        checked ? "text-ink" : "text-ink-secondary"
                      )}
                      title={option.label}
                    >
                      {option.label}
                    </span>
                    <span className="tabular-nums text-xs text-ink-muted">{option.count}</span>
                  </label>
                </li>
              );
            })}
            {filtered.length === 0 && (
              <li className="px-1.5 py-1 text-xs text-ink-muted">No matches</li>
            )}
          </ul>

          {!expanded && filtered.length > visible.length && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="px-1.5 text-xs font-medium text-accent hover:text-accent-hover"
            >
              Show all {filtered.length}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
