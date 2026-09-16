"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { FilterSidebar, type ActiveFilters } from "./FilterSidebar";
import type { FacetCounts } from "@/lib/types";

export function MobileFilterDrawer({
  open,
  onClose,
  search,
  onSearchChange,
  matchMode,
  onMatchModeChange,
  facets,
  active,
  onToggle,
  onClear,
  resultCount,
}: {
  open: boolean;
  onClose: () => void;
  search: string;
  onSearchChange: (value: string) => void;
  matchMode: "any" | "all";
  onMatchModeChange: (mode: "any" | "all") => void;
  facets: FacetCounts | null;
  active: ActiveFilters;
  onToggle: (group: keyof ActiveFilters, label: string) => void;
  onClear: () => void;
  resultCount: number;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 lg:hidden">
      <button
        type="button"
        aria-label="Close filters"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />
      <div className="absolute inset-y-0 left-0 flex w-[85%] max-w-sm flex-col bg-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
          <span className="text-sm font-semibold">Filters</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1.5 text-ink-secondary hover:bg-surface-hover"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3">
          <FilterSidebar
            search={search}
            onSearchChange={onSearchChange}
            matchMode={matchMode}
            onMatchModeChange={onMatchModeChange}
            facets={facets}
            active={active}
            onToggle={onToggle}
            onClear={onClear}
          />
        </div>
        <div className="border-t border-hairline p-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-accent-ink hover:bg-accent-hover"
          >
            Show {resultCount.toLocaleString()} results
          </button>
        </div>
      </div>
    </div>
  );
}
