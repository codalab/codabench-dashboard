"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";

export interface BarDatum {
  label: string;
  count: number;
}

function niceScale(maxValue: number, tickCount = 4) {
  if (maxValue <= 0) return { niceMax: 1, ticks: [0, 1] };
  const rawStep = maxValue / tickCount;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const normalized = rawStep / magnitude;
  let step: number;
  if (normalized < 1.5) step = 1;
  else if (normalized < 3) step = 2;
  else if (normalized < 7) step = 5;
  else step = 10;
  step *= magnitude;

  const niceMax = Math.ceil(maxValue / step) * step;
  const ticks: number[] = [];
  for (let t = 0; t <= niceMax + step * 1e-6; t += step) ticks.push(Math.round(t));
  return { niceMax, ticks };
}

/**
 * A single-series (sequential-hue) horizontal bar chart — the default form
 * for "compare magnitude across categories" per the dataviz method:
 * thin bars, 4px rounded tip / square baseline, hairline gridlines,
 * value labeled at the tip, no legend needed for one series.
 */
export function HorizontalBarChart({
  title,
  data,
  formatValue = (n: number) => n.toLocaleString(),
  emptyLabel = "No data for the current selection.",
}: {
  title: string;
  data: BarDatum[];
  formatValue?: (n: number) => string;
  emptyLabel?: string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);

  const maxValue = useMemo(() => Math.max(1, ...data.map((d) => d.count)), [data]);
  const { niceMax, ticks } = useMemo(() => niceScale(maxValue), [maxValue]);

  return (
    <div className="rounded-xl border border-hairline bg-surface p-4">
      <h3 className="text-sm font-semibold text-ink">{title}</h3>

      {data.length === 0 ? (
        <p className="mt-6 text-center text-xs text-ink-muted">{emptyLabel}</p>
      ) : (
        <div
          className="mt-4 grid pr-10"
          style={{
            gridTemplateColumns: "168px 1fr",
            columnGap: "12px",
            rowGap: "2px",
          }}
        >
          {/* row hover highlight, painted first so bars/labels sit on top */}
          {hovered !== null && (
            <div
              aria-hidden
              className="rounded-md bg-surface-2"
              style={{ gridColumn: "1 / span 2", gridRow: hovered + 1 }}
            />
          )}

          {/* gridlines, spanning every row within the track column */}
          <div
            aria-hidden
            className="relative"
            style={{ gridColumn: 2, gridRow: `1 / ${data.length + 1}` }}
          >
            {ticks.map((t) => (
              <div
                key={t}
                className="absolute top-0 bottom-0 w-px bg-hairline"
                style={{ left: `${(t / niceMax) * 100}%` }}
              />
            ))}
          </div>

          {data.map((row, i) => {
            return (
              <div
                key={row.label}
                role="img"
                aria-label={`${row.label}: ${formatValue(row.count)}`}
                className="flex min-w-0 items-center truncate py-1.5 text-xs text-ink-secondary"
                style={{ gridColumn: 1, gridRow: i + 1 }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                title={row.label}
              >
                {row.label}
              </div>
            );
          })}

          {data.map((row, i) => {
            const pct = (row.count / niceMax) * 100;
            return (
              <div
                key={row.label + "-bar"}
                className="relative flex items-center"
                style={{ gridColumn: 2, gridRow: i + 1, height: 26 }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              >
                <div
                  className={clsx(
                    "absolute rounded-r-[4px] bg-[var(--chart-series-1)] transition-[filter]",
                    hovered === i && "brightness-110"
                  )}
                  style={{ left: 0, width: `${pct}%`, height: 10 }}
                />
                <span
                  className="whitespace-nowrap text-xs tabular-nums text-ink-muted"
                  style={{ marginLeft: `calc(${pct}% + 8px)` }}
                >
                  {formatValue(row.count)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
