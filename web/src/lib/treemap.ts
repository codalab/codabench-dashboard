import { hierarchy, treemap, treemapSquarify } from "d3-hierarchy";

export const OTHER_LABEL = "Other";

export interface TreemapLeaf {
  name: string;
  count: number;
  group: string;
}

export interface TreemapGroup {
  group: string;
  total: number;
  leaves: TreemapLeaf[];
}

export interface TreemapRect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  name: string;
  value: number;
  group: string;
}

interface RawLeaf {
  name: string;
  value: number;
  group: string;
}
interface RawNode {
  name: string;
  children?: RawNode[];
  value?: number;
  group?: string;
}

export function layoutTreemap(groups: TreemapGroup[], width: number, height: number): TreemapRect[] {
  if (width <= 0 || height <= 0) return [];

  const data: RawNode = {
    name: "root",
    children: groups.map((g) => ({
      name: g.group,
      children: g.leaves.map((leaf) => ({ name: leaf.name, value: leaf.count, group: g.group })),
    })),
  };

  const root = hierarchy<RawNode>(data)
    .sum((d) => d.value ?? 0)
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

  const positioned = treemap<RawNode>()
    .tile(treemapSquarify)
    .size([width, height])
    .paddingOuter(2)
    .paddingInner(2)
    .round(true)(root);

  return positioned.leaves().map((leaf) => {
    const d = leaf.data as RawLeaf;
    return {
      x0: leaf.x0 ?? 0,
      y0: leaf.y0 ?? 0,
      x1: leaf.x1 ?? 0,
      y1: leaf.y1 ?? 0,
      name: d.name,
      value: leaf.value ?? 0,
      group: d.group,
    };
  });
}

/** Present groups, ordered to match a fixed color order, with any "Other" bucket pinned last. */
export function orderLegendGroups(groups: TreemapGroup[], colorOrder: string[]): string[] {
  const present = groups.map((g) => g.group);
  const ordered = colorOrder.filter((f) => present.includes(f));
  if (present.includes(OTHER_LABEL)) ordered.push(OTHER_LABEL);
  return ordered;
}
