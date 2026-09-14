"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { OTHER_LABEL, layoutTreemap, orderLegendGroups, type TreemapGroup, type TreemapRect } from "@/lib/treemap";

const SERIES_VARS = [
  "var(--series-1)",
  "var(--series-2)",
  "var(--series-3)",
  "var(--series-4)",
  "var(--series-5)",
  "var(--series-6)",
  "var(--series-7)",
];
const OTHER_VAR = "var(--series-other)";

function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const observerRef = useRef<ResizeObserver | null>(null);

  // useCallback keeps this ref's identity stable across renders — a fresh
  // function every render makes React re-invoke the ref (null, then node)
  // on every render, and calling setState from inside it loops forever.
  const setNode = useCallback((node: T | null) => {
    observerRef.current?.disconnect();
    (ref as React.MutableRefObject<T | null>).current = node;
    if (!node) return;
    setSize({ width: node.clientWidth, height: node.clientHeight });
    observerRef.current = new ResizeObserver(([entry]) => {
      const box = entry.contentRect;
      setSize({ width: box.width, height: box.height });
    });
    observerRef.current.observe(node);
  }, []);

  return { setNode, size };
}

export function TreemapChart({
  groups,
  colorOrder,
  groupLabel,
  valueNoun = "competition",
}: {
  groups: TreemapGroup[];
  colorOrder: string[];
  /** How to describe a rect's group in the tooltip, e.g. "Field" or "Venue". */
  groupLabel: string;
  valueNoun?: string;
}) {
  const [hovered, setHovered] = useState<TreemapRect | null>(null);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const { setNode, size } = useElementSize<HTMLDivElement>();

  const colorOf = useMemo(() => {
    const map = new Map<string, string>();
    colorOrder.forEach((name, i) => map.set(name, SERIES_VARS[i] ?? OTHER_VAR));
    return map;
  }, [colorOrder]);

  const rects = useMemo(() => layoutTreemap(groups, size.width, size.height), [groups, size.width, size.height]);
  const total = useMemo(() => rects.reduce((sum, r) => sum + r.value, 0), [rects]);
  const legendGroups = useMemo(() => orderLegendGroups(groups, colorOrder), [groups, colorOrder]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 px-4 pb-4 pt-3 sm:px-6">
        <div
          ref={setNode}
          className="relative h-full w-full overflow-hidden rounded-xl border border-hairline bg-surface"
          onMouseMove={(e) => setMouse({ x: e.clientX, y: e.clientY })}
        >
          <svg width={size.width} height={size.height} className="block">
            {rects.map((r) => {
              const w = r.x1 - r.x0;
              const h = r.y1 - r.y0;
              const showValue = w > 44 && h > 18;
              const showName = w > 60 && h > 32;
              const isHovered = hovered?.name === r.name && hovered.group === r.group;
              return (
                <g
                  key={`${r.group}-${r.name}`}
                  transform={`translate(${r.x0},${r.y0})`}
                  onMouseEnter={() => setHovered(r)}
                  onMouseLeave={() => setHovered((prev) => (prev === r ? null : prev))}
                >
                  <rect
                    width={w}
                    height={h}
                    fill={colorOf.get(r.group) ?? OTHER_VAR}
                    opacity={isHovered ? 1 : 0.88}
                    stroke="var(--bg-surface)"
                    strokeWidth={2}
                    rx={2}
                  />
                  {showName && (
                    <text x={6} y={16} className="pointer-events-none select-none" fill="#fff" fontSize={11} fontWeight={600}>
                      {truncate(r.name, w)}
                    </text>
                  )}
                  {showValue && (
                    <text
                      x={6}
                      y={showName ? 30 : 15}
                      className="pointer-events-none select-none"
                      fill="rgba(255,255,255,0.85)"
                      fontSize={showName ? 12 : 10}
                    >
                      {r.value}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {hovered && (
            <div
              className="pointer-events-none fixed z-20 max-w-xs rounded-lg border border-hairline bg-surface-2 px-3 py-2 text-xs shadow-lg"
              style={{ left: mouse.x + 14, top: mouse.y + 14 }}
            >
              <div className="font-semibold text-ink">{hovered.name}</div>
              <div className="mt-0.5 text-ink-secondary">
                {groupLabel}: {hovered.group === OTHER_LABEL ? "Other / uncategorized" : hovered.group}
              </div>
              <div className="mt-1 tabular-nums text-ink-muted">
                {hovered.value} {valueNoun}
                {hovered.value === 1 ? "" : "s"}
                {total > 0 && <> · {((hovered.value / total) * 100).toFixed(1)}% of shown</>}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-hairline px-4 py-3 text-xs text-ink-secondary sm:px-6">
        {legendGroups.map((name) => (
          <div key={name} className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: name === OTHER_LABEL ? OTHER_VAR : colorOf.get(name) }}
            />
            {name}
          </div>
        ))}
      </div>
    </div>
  );
}

function truncate(text: string, widthPx: number): string {
  const maxChars = Math.max(3, Math.floor(widthPx / 6.5));
  return text.length > maxChars ? `${text.slice(0, maxChars - 1)}…` : text;
}
