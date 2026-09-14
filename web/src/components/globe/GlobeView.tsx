"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Script from "next/script";
import clsx from "clsx";
import { GEO, HUB } from "@/lib/geo";

declare global {
  interface Window {
    Globe?: () => GlobeInstance;
  }
}

// globe.gl's chainable builder API — only the subset this component uses.
interface GlobeInstance {
  (el: HTMLElement): GlobeInstance;
  globeImageUrl(url: string): GlobeInstance;
  backgroundColor(color: string): GlobeInstance;
  atmosphereColor(color: string): GlobeInstance;
  atmosphereAltitude(v: number): GlobeInstance;
  width(v: number): GlobeInstance;
  height(v: number): GlobeInstance;
  arcsData(data: unknown[]): GlobeInstance;
  arcStartLat(v: string): GlobeInstance;
  arcStartLng(v: string): GlobeInstance;
  arcEndLat(v: string): GlobeInstance;
  arcEndLng(v: string): GlobeInstance;
  arcColor(fn: (d: ArcDatum) => string | string[]): GlobeInstance;
  arcStroke(fn: (d: ArcDatum) => number): GlobeInstance;
  arcAltitude(fn: (d: ArcDatum) => number): GlobeInstance;
  arcDashLength(v: number): GlobeInstance;
  arcDashGap(v: number): GlobeInstance;
  arcDashInitialGap(fn: () => number): GlobeInstance;
  arcDashAnimateTime(v: number | ((d: ArcDatum) => number)): GlobeInstance;
  arcLabel(fn: (d: ArcDatum) => string): GlobeInstance;
  arcsTransitionDuration(v: number): GlobeInstance;
  pointsData(data: unknown[]): GlobeInstance;
  pointLat(v: string): GlobeInstance;
  pointLng(v: string): GlobeInstance;
  pointColor(v: string): GlobeInstance;
  pointRadius(v: string): GlobeInstance;
  pointAltitude(v: number): GlobeInstance;
  pointLabel(v: string): GlobeInstance;
  pointsTransitionDuration(v: number): GlobeInstance;
  ringsData(data: unknown[]): GlobeInstance;
  ringColor(fn: (d: RingDatum) => (t: number) => string): GlobeInstance;
  ringMaxRadius(v: number | ((d: RingDatum) => number)): GlobeInstance;
  ringPropagationSpeed(v: number | ((d: RingDatum) => number)): GlobeInstance;
  ringRepeatPeriod(v: number): GlobeInstance;
  controls(): { autoRotate: boolean; autoRotateSpeed: number };
  pointOfView(v: { lat: number; lng: number; altitude: number }, ms: number): GlobeInstance;
}

interface ArcDatum {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  country: string;
  count: number;
  weight: number;
  color: string;
  kind: "base" | "challenge" | "submission";
}

interface RingDatum {
  lat: number;
  lng: number;
  color: string;
}

type EventKind = "challenge" | "submission";
interface LiveEvent {
  id: string;
  kind: EventKind;
  country: string;
  createdAt: number;
}

const EVENT_STYLE: Record<EventKind, { color: string; icon: string; label: string }> = {
  challenge: { color: "#ffd34f", icon: "🚀", label: "New challenge created" },
  submission: { color: "#4f8cff", icon: "📥", label: "Submission received" },
};
const ARC_LIFETIME_MS = 4200;
const RING_LIFETIME_MS = 1600;
const FEED_LIMIT = 7;

export function GlobeView({ competitions }: { competitions: { countries: string[] }[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<GlobeInstance | null>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(paused);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const { counts, countryList, maxCount, weightedPool, totalTagged } = useMemo(() => {
    const c: Record<string, number> = {};
    for (const comp of competitions) {
      for (const country of comp.countries) {
        if (GEO[country]) c[country] = (c[country] ?? 0) + 1;
      }
    }
    const list = Object.keys(c);
    const max = Math.max(1, ...Object.values(c));
    // Weighted so higher-activity countries fire simulated events more often,
    // using sqrt to keep the long tail from being drowned out entirely.
    const pool: string[] = [];
    for (const country of list) {
      const weight = Math.max(1, Math.round(Math.sqrt(c[country]) * 3));
      for (let i = 0; i < weight; i++) pool.push(country);
    }
    const tagged = competitions.filter((cm) => cm.countries.some((n) => GEO[n])).length;
    return { counts: c, countryList: list, maxCount: max, weightedPool: pool, totalTagged: tagged };
  }, [competitions]);

  const baseArcs = useMemo<ArcDatum[]>(
    () =>
      countryList
        .filter((n) => n !== "France")
        .map((n) => ({
          startLat: GEO[n][0],
          startLng: GEO[n][1],
          endLat: HUB.lat,
          endLng: HUB.lng,
          country: n,
          count: counts[n],
          weight: counts[n] / maxCount,
          color: "#4f8cff",
          kind: "base" as const,
        })),
    [countryList, counts, maxCount]
  );

  const points = useMemo(() => {
    const list = [
      { lat: HUB.lat, lng: HUB.lng, size: 0.9, color: "#ffd34f", label: `${HUB.name}: ${counts["France"] ?? 0} competitions` },
      ...countryList
        .filter((n) => n !== "France")
        .map((n) => ({
          lat: GEO[n][0],
          lng: GEO[n][1],
          size: 0.25 + 0.9 * (counts[n] / maxCount),
          color: "#4f8cff",
          label: `${n}: ${counts[n]} competition${counts[n] > 1 ? "s" : ""}`,
        })),
    ];
    return list;
  }, [countryList, counts, maxCount]);

  // --- init globe once the CDN script + container are ready ---
  useEffect(() => {
    if (!scriptReady || !containerRef.current || worldRef.current || !window.Globe) return;
    const el = containerRef.current;
    const world = window.Globe()(el)
      .globeImageUrl("https://unpkg.com/three-globe@2.31.0/example/img/earth-night.jpg")
      .backgroundColor("rgba(0,0,0,0)")
      .atmosphereColor("#4f8cff")
      .atmosphereAltitude(0.18)
      .width(el.clientWidth)
      .height(el.clientHeight)
      .arcStartLat("startLat")
      .arcStartLng("startLng")
      .arcEndLat("endLat")
      .arcEndLng("endLng")
      .arcColor((d) => (d as ArcDatum).color)
      .arcStroke((d) => ((d as ArcDatum).kind === "base" ? 0.3 + 1.2 * (d as ArcDatum).weight : 0.6))
      .arcAltitude((d) => ((d as ArcDatum).kind === "base" ? 0.15 + 0.35 * (d as ArcDatum).weight : 0.32))
      .arcDashLength(0.4)
      .arcDashGap(2)
      .arcDashInitialGap(() => Math.random() * 5)
      .arcDashAnimateTime((d) => ((d as ArcDatum).kind === "base" ? 2000 : 1400))
      .arcsTransitionDuration(0)
      .arcLabel((d) => {
        const a = d as ArcDatum;
        return a.kind === "base"
          ? `<b>${a.country} → France</b><br/>${a.count} competitions`
          : `<b>${EVENT_STYLE[a.kind].label}</b><br/>${a.country} → France`;
      })
      .pointLat("lat")
      .pointLng("lng")
      .pointColor("color")
      .pointRadius("size")
      .pointAltitude(0.01)
      .pointLabel("label")
      .pointsTransitionDuration(0)
      .ringColor((d) => (t: number) => {
        const [r, g, b] = hexToRgb((d as RingDatum).color);
        return `rgba(${r},${g},${b},${1 - t})`;
      })
      .ringMaxRadius(4)
      .ringPropagationSpeed(2.2)
      .ringRepeatPeriod(1200);

    world.controls().autoRotate = true;
    world.controls().autoRotateSpeed = 0.5;
    world.pointOfView({ lat: 30, lng: 5, altitude: 2.3 }, 0);
    worldRef.current = world;

    const ro = new ResizeObserver(() => {
      if (!containerRef.current) return;
      world.width(containerRef.current.clientWidth).height(containerRef.current.clientHeight);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [scriptReady]);

  // --- keep static layer (base arcs + points) in sync ---
  useEffect(() => {
    worldRef.current?.pointsData(points);
  }, [points]);

  // --- simulated live event generator ---
  useEffect(() => {
    if (weightedPool.length === 0) return;
    let cancelled = false;
    function schedule() {
      const delay = 1400 + Math.random() * 2200;
      window.setTimeout(() => {
        if (cancelled) return;
        if (!pausedRef.current) {
          const country = weightedPool[Math.floor(Math.random() * weightedPool.length)];
          const kind: EventKind = Math.random() < 0.6 ? "submission" : "challenge";
          const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          setEvents((prev) => [...prev.slice(-(FEED_LIMIT - 1)), { id, kind, country, createdAt: Date.now() }]);
          window.setTimeout(() => {
            setEvents((prev) => prev.filter((e) => e.id !== id));
          }, ARC_LIFETIME_MS);
        }
        schedule();
      }, delay);
    }
    schedule();
    return () => {
      cancelled = true;
    };
  }, [weightedPool]);

  // --- push arcs (base + live) and rings whenever events change ---
  const [rings, setRings] = useState<(RingDatum & { id: string })[]>([]);
  useEffect(() => {
    const eventArcs: ArcDatum[] = events.map((e) => {
      const [lat, lng] = GEO[e.country];
      return {
        startLat: lat,
        startLng: lng,
        endLat: HUB.lat,
        endLng: HUB.lng,
        country: e.country,
        count: 0,
        weight: 0,
        color: EVENT_STYLE[e.kind].color,
        kind: e.kind,
      };
    });
    worldRef.current?.arcsData([...baseArcs, ...eventArcs]);
  }, [baseArcs, events]);

  useEffect(() => {
    worldRef.current?.ringsData([{ lat: HUB.lat, lng: HUB.lng, color: "#ffd34f" }, ...rings]);
  }, [rings]);

  // spawn an arrival ring ~1.3s after each event fires (arc travel time)
  useEffect(() => {
    const latest = events[events.length - 1];
    if (!latest) return;
    const id = latest.id;
    const timer = window.setTimeout(() => {
      const ring = { id, lat: HUB.lat, lng: HUB.lng, color: EVENT_STYLE[latest.kind].color };
      setRings((prev) => [...prev, ring]);
      window.setTimeout(() => {
        setRings((prev) => prev.filter((r) => r.id !== id));
      }, RING_LIFETIME_MS);
    }, 1300);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events.length]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#070b14]">
      <Script
        src="https://unpkg.com/globe.gl@2.32.0/dist/globe.gl.min.js"
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
      />
      <div ref={containerRef} className="absolute inset-0" />

      {!scriptReady && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-[#8a97b1]">
          Loading globe…
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-black/70 to-transparent p-4 sm:p-6">
        <p className="max-w-xl text-xs leading-relaxed text-[#8a97b1] sm:text-[13px]">
          Real arcs: countries that have hosted a Codabench competition, inferred from text. The pulsing{" "}
          <span className="text-[#e6ecf5]">gold</span> and <span className="text-[#e6ecf5]">blue</span> events
          are a <b className="text-[#e6ecf5]">simulated</b> activity feed (challenge creation / submissions) —
          not live telemetry, since that data isn&apos;t collected here.
        </p>
      </div>

      <button
        type="button"
        onClick={() => setPaused((p) => !p)}
        className="pointer-events-auto absolute right-4 top-4 z-10 rounded-lg border border-[#2a3650] bg-[#182030]/80 px-3 py-1.5 text-xs font-medium text-[#e6ecf5] hover:bg-[#1f2940] sm:right-6 sm:top-6"
      >
        {paused ? "Resume simulation" : "Pause simulation"}
      </button>

      <div className="pointer-events-auto absolute bottom-4 left-4 z-10 rounded-xl border border-[#2a3650] bg-[#182030]/80 px-3.5 py-3 text-xs backdrop-blur sm:bottom-6 sm:left-6">
        <div className="flex items-center gap-2 py-0.5 text-[#8a97b1]">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#ffd34f" }} />
          <span>
            <b className="text-[#e6ecf5]">France</b> — Codabench hub
          </span>
        </div>
        <div className="flex items-center gap-2 py-0.5 text-[#8a97b1]">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#4f8cff" }} />
          Historical competition origin
        </div>
        <div className="flex items-center gap-2 py-0.5 text-[#8a97b1]">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: EVENT_STYLE.challenge.color }} />
          {EVENT_STYLE.challenge.label} (simulated)
        </div>
        <div className="flex items-center gap-2 py-0.5 text-[#8a97b1]">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: EVENT_STYLE.submission.color }} />
          {EVENT_STYLE.submission.label} (simulated)
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-4 right-4 z-10 w-64 rounded-xl border border-[#2a3650] bg-[#182030]/80 px-3.5 py-3 text-right backdrop-blur sm:bottom-6 sm:right-6">
        <div>
          <b className="text-[22px] text-[#e6ecf5]">{totalTagged.toLocaleString()}</b>{" "}
          <span className="text-xs text-[#8a97b1]">competitions</span>
        </div>
        <div>
          <b className="text-[22px] text-[#e6ecf5]">{countryList.length}</b>{" "}
          <span className="text-xs text-[#8a97b1]">countries</span>
        </div>
      </div>

      <div className="pointer-events-none absolute left-4 top-20 z-10 w-72 space-y-1 sm:left-6 sm:top-24">
        {events
          .slice()
          .reverse()
          .map((e) => (
            <div
              key={e.id}
              className={clsx(
                "flex items-center gap-2 rounded-lg border border-[#2a3650] bg-[#182030]/80 px-2.5 py-1.5 text-xs text-[#e6ecf5] backdrop-blur",
                "animate-[fadeIn_.25s_ease-out]"
              )}
            >
              <span>{EVENT_STYLE[e.kind].icon}</span>
              <span className="truncate">
                {EVENT_STYLE[e.kind].label} <span className="text-[#8a97b1]">— {e.country}</span>
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}

function hexToRgb(hex: string): [number, number, number] {
  const v = hex.replace("#", "");
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}
