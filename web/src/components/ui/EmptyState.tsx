import { SearchX } from "lucide-react";

export function EmptyState({
  title = "No competitions match",
  description = "Try removing a filter or broadening your search.",
  onReset,
}: {
  title?: string;
  description?: string;
  onReset?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-hairline py-16 text-center">
      <SearchX size={28} className="text-ink-muted" />
      <p className="mt-3 text-sm font-medium text-ink">{title}</p>
      <p className="mt-1 max-w-xs text-sm text-ink-muted">{description}</p>
      {onReset && (
        <button
          type="button"
          onClick={onReset}
          className="mt-4 rounded-full bg-accent-soft px-4 py-1.5 text-sm font-medium text-accent hover:bg-accent hover:text-accent-ink"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
