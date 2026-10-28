import React from "react";
import { interpolate } from "remotion";
import { z } from "zod";
import { parseProps, type KitEntry } from "../define";
import { colorSchema } from "../primitives";
import { color, ease, fonts, sizes, type ColorName } from "../theme";
import { atSchema, resolveAt, useSceneTime, useSceneTiming } from "../timing/context";
import { RichText } from "./formula";

/* Shared: 0→1 progress from a start time, without hooks (usable in loops). */
function progressFrom(t: number, start: number, d = 0.6): number {
  return interpolate(t, [start, start + d], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
}

/* ---------------------------------------------------------------- BarChart */

const barStepSchema = z.object({
  at: atSchema,
  swap: z.tuple([z.number().int(), z.number().int()]).optional().describe("Swap two bars by their current positions (sorting with bars)"),
  set: z.array(z.object({ index: z.number().int(), value: z.number().min(0) })).optional().describe("Change bar heights (bars grow/shrink smoothly)"),
  compare: z.array(z.number().int()).optional().describe("Bars compared in this step (accent, lifted)"),
  done: z.array(z.number().int()).optional().describe("Add bars that are in place (tinted ok)"),
  tone: z.array(z.object({ index: z.number().int(), tone: colorSchema })).optional().describe("Recolor bars (kept until changed again)"),
});

export const barChartSchema = z.object({
  bars: z
    .array(
      z.object({
        label: z.string().describe("Label under the bar, supports $…$"),
        value: z.number().min(0),
        tone: colorSchema.optional().describe("Bar color; info by default, accent to emphasise"),
        at: atSchema.optional(),
        valueLabel: z.string().optional().describe("Text above the bar instead of the number, e.g. \"$O(n^2)$\""),
      }),
    )
    .min(1)
    .max(16),
  at: atSchema.default(0).describe("When the first bar grows (bars without `at` follow `gap` apart)"),
  gap: z.number().default(0.4),
  steps: z.array(barStepSchema).default([]).describe("Steps in time: swap, change height, compare, mark done"),
  max: z.number().positive().optional().describe("Value at full height; the largest value by default"),
  width: z.number().default(1300),
  height: z.number().default(560),
  showValues: z.boolean().default(true),
  unit: z.string().default("").describe("Unit written after the number, e.g. \" ms\""),
  transition: z.number().positive().default(0.6),
});

type BarState = { order: number[]; values: number[]; tones: (ColorName | null)[]; compare: Set<number>; done: Set<number>; moving: Set<number> };

export function BarChart(props: z.input<typeof barChartSchema>) {
  const p = parseProps("BarChart", barChartSchema, props);
  const timing = useSceneTiming();
  const t = useSceneTime();
  const base = resolveAt(p.at, timing);
  const n = p.bars.length;

  // States after each step; elements keep identity through swaps.
  const init: BarState = { order: p.bars.map((_, i) => i), values: p.bars.map((b) => b.value), tones: p.bars.map(() => null), compare: new Set(), done: new Set(), moving: new Set() };
  const states = [init];
  const check = (i: number, what: string) => {
    if (i < 0 || i >= n) throw new Error(`<BarChart> ${what}: index ${i} is outside 0…${n - 1}`);
  };
  for (const st of p.steps) {
    const prev = states[states.length - 1];
    const next: BarState = { order: [...prev.order], values: [...prev.values], tones: [...prev.tones], compare: new Set(), done: new Set(prev.done), moving: new Set() };
    if (st.set) for (const { index, value } of st.set) (check(index, "set"), (next.values[next.order[index]] = value));
    if (st.swap) {
      const [a, b] = st.swap;
      check(a, "swap");
      check(b, "swap");
      next.moving.add(next.order[a]).add(next.order[b]);
      [next.order[a], next.order[b]] = [next.order[b], next.order[a]];
    }
    if (st.compare) for (const i of st.compare) (check(i, "compare"), next.compare.add(i));
    if (st.done) for (const i of st.done) (check(i, "done"), next.done.add(i));
    if (st.tone) for (const x of st.tone) (check(x.index, "tone"), (next.tones[next.order[x.index]] = x.tone as ColorName));
    states.push(next);
  }
  const starts = p.steps.map((st) => resolveAt(st.at, timing));
  let k = 0;
  starts.forEach((s, i) => {
    if (t >= s) k = i + 1;
  });
  const before = states[Math.max(0, k - 1)];
  const after = states[k];
  const stepStart = k > 0 ? starts[k - 1] : 0;
  const nextStart = k < starts.length ? starts[k] : Number.POSITIVE_INFINITY;
  const dur = Math.max(0.15, Math.min(p.transition, (nextStart - stepStart) * 0.85));
  const prog = k === 0 ? 1 : progressFrom(t, stepStart, dur);

  const max = p.max ?? Math.max(...states.flatMap((st) => st.values), 1e-9);
  const slot = p.width / n;
  const barW = Math.min(180, slot * 0.62);
  const labelH = 64;
  const valueH = 52;
  const plotH = p.height - labelH - valueH;
  const fs = Math.max(26, Math.min(sizes.small, slot * 0.2));
  return (
    <div style={{ position: "relative", width: p.width, height: p.height }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: valueH + plotH, height: 3, background: color("grid") }} />
      {p.bars.map((b, el) => {
        const start = b.at !== undefined ? resolveAt(b.at, timing) : base + el * p.gap;
        const grow = progressFrom(t, start, 0.8);
        const p0 = before.order.indexOf(el);
        const p1 = after.order.indexOf(el);
        const cx = slot * (p0 + (p1 - p0) * prog) + slot / 2;
        const v = before.values[el] + (after.values[el] - before.values[el]) * prog;
        const h = (v / max) * plotH * grow;
        const now = prog < 0.5 ? before : after;
        const pos = prog < 0.5 ? p0 : p1;
        const lift = k === 0 ? 0 : after.compare.has(p1) ? prog : before.compare.has(p0) ? 1 - prog : 0;
        const hop = after.moving.has(el) && k > 0 ? Math.sin(Math.PI * prog) * 26 : 0;
        const toneName: ColorName = now.compare.has(pos) && (prog >= 0.5 || k === 0) ? "accent" : now.done.has(pos) ? "ok" : (now.tones[el] ?? (b.tone as ColorName | undefined) ?? "info");
        const tone = color(toneName);
        const label = after.values[el] !== p.bars[el].value || p.steps.some((st) => st.set) ? `${Number.isInteger(v) ? Math.round(v) : v.toFixed(1)}${p.unit}` : b.valueLabel ?? `${Number.isInteger(b.value) ? b.value : b.value.toFixed(1)}${p.unit}`;
        const dy = -lift * 18 - hop;
        return (
          <React.Fragment key={el}>
            <div style={{ position: "absolute", left: cx - barW / 2, width: barW, top: valueH + plotH - h + dy, height: h, background: tone, borderRadius: "8px 8px 0 0", opacity: 0.92, boxShadow: lift ? `0 0 ${24 * lift}px ${tone}66` : undefined }} />
            {p.showValues ? (
              <div style={{ position: "absolute", left: cx - slot / 2, width: slot, top: valueH + plotH - h - valueH + dy, height: valueH, display: "grid", placeItems: "end center", fontFamily: fonts.mono, fontSize: fs, color: color("text"), opacity: grow }}>
                <RichText text={label} />
              </div>
            ) : null}
            <div style={{ position: "absolute", left: cx - slot / 2, width: slot, top: valueH + plotH + 12, textAlign: "center", fontSize: fs, color: color("muted"), opacity: progressFrom(t, start, 0.4) }}>
              <RichText text={b.label} />
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

export const barChartMeta: KitEntry = {
  name: "BarChart",
  category: "component",
  summary: "A bar chart that grows in; with `steps` bars swap (sliding past each other), change height, lift when compared, turn green when done: sorting shown with bars.",
  useWhen: ["Comparing quantities, running times, numbers of comparisons", "Sorting algorithms shown with bar heights (bubble, selection, insertion)", "Values changing over time"],
  avoidWhen: ["A continuous function: use Graph", "More than 16 bars", "When i/j pointers and indices are needed: use ArrayViz"],
  example: "bar-sort.tsx",
  schema: barChartSchema,
};

/* ------------------------------------------------------------------- Table */

export const tableSchema = z.object({
  columns: z.array(z.string()).min(1).max(6).describe("Column header, supports $…$"),
  rows: z
    .array(
      z.object({
        cells: z.array(z.string()).describe("Content of each cell, as many as columns. Keep each cell short (≤ 6 words)"),
        at: atSchema.optional(),
        tone: colorSchema.optional().describe("Highlight this row (accent, ok, err…) from toneAt"),
        toneAt: atSchema.optional(),
      }),
    )
    .min(1)
    .max(8),
  at: atSchema.default(0).describe("When the table (column headers) appears; rows without `at` follow `gap` apart"),
  gap: z.number().default(0.5),
  width: z.number().default(1500),
  size: z.number().min(26).max(48).default(34).describe("Font size in the cells"),
});

export function Table(props: z.input<typeof tableSchema>) {
  const p = parseProps("Table", tableSchema, props);
  const timing = useSceneTiming();
  const t = useSceneTime();
  const base = resolveAt(p.at, timing);
  p.rows.forEach((r, i) => {
    if (r.cells.length !== p.columns.length) throw new Error(`<Table> row ${i + 1} has ${r.cells.length} cells, ${p.columns.length} are needed`);
  });
  const cols = `repeat(${p.columns.length}, minmax(0, 1fr))`;
  const k0 = progressFrom(t, base, 0.5);
  return (
    <div style={{ width: p.width, fontSize: p.size, lineHeight: 1.3 }}>
      <div style={{ display: "grid", gridTemplateColumns: cols, opacity: k0, borderBottom: `3px solid ${color("grid")}` }}>
        {p.columns.map((c, i) => (
          <div key={i} style={{ padding: "14px 22px", fontFamily: fonts.mono, fontSize: p.size * 0.72, letterSpacing: 1.5, textTransform: "uppercase", color: color("muted") }}>
            <RichText text={c} />
          </div>
        ))}
      </div>
      {p.rows.map((r, i) => {
        const start = r.at !== undefined ? resolveAt(r.at, timing) : base + 0.3 + i * p.gap;
        const k = progressFrom(t, start, 0.5);
        const toned = r.tone && t >= resolveAt(r.toneAt ?? r.at ?? start, timing);
        const c = r.tone ? color(r.tone as ColorName) : undefined;
        return (
          <div
            key={i}
            style={{
              display: "grid",
              gridTemplateColumns: cols,
              opacity: k,
              transform: `translateY(${(1 - k) * 16}px)`,
              borderBottom: `1px solid ${color("grid")}`,
              background: toned ? `${c}22` : undefined,
              boxShadow: toned ? `inset 6px 0 0 ${c}` : undefined,
            }}
          >
            {r.cells.map((cell, j) => (
              <div key={j} style={{ padding: "16px 22px", color: j === 0 ? color("text") : color("muted") }}>
                <RichText text={cell} />
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

export const tableMeta: KitEntry = {
  name: "Table",
  category: "component",
  summary: "Comparison table: column headers, rows appear one by one, one row can be highlighted.",
  useWhen: ["Comparing several options on a few criteria (complexity, stability, memory)", "A table of x and f(x) values"],
  avoidWhen: ["More than 8 rows or 6 columns: split the scene", "Cells with long sentences: use Cards"],
  example: "table.tsx",
  schema: tableSchema,
};

/* -------------------------------------------------------------------- Tree */

export const treeSchema = z.object({
  nodes: z
    .array(
      z.object({
        id: z.string(),
        label: z.string().describe("Node text, short (≤ 12 characters), supports $…$"),
        parent: z.string().nullable().describe("Parent node id; null for the root (exactly one root)"),
        at: atSchema.optional(),
        tone: colorSchema.optional().describe("Outline color; faint by default"),
        toneAt: atSchema.optional().describe("Switch to this tone from this moment (by default as soon as it appears)"),
      }),
    )
    .min(1)
    .max(31),
  at: atSchema.default(0).describe("Default time; nodes without `at` appear in traversal order, `gap` apart"),
  gap: z.number().default(0.35),
  width: z.number().default(1500),
  height: z.number().default(640),
  size: z.number().min(24).max(48).default(34).describe("Maximum font size in a node (shrinks when tight)"),
  visit: z
    .array(z.object({ id: z.string(), at: atSchema, tone: colorSchema.default("accent") }))
    .default([])
    .describe("Traversal: nodes bounce and light up in turn (DFS, BFS, a search path). The node being visited has a glowing ring"),
});

export function Tree(props: z.input<typeof treeSchema>) {
  const p = parseProps("Tree", treeSchema, props);
  const timing = useSceneTiming();
  const t = useSceneTime();
  const base = resolveAt(p.at, timing);

  const byId = new Map(p.nodes.map((n) => [n.id, n]));
  const roots = p.nodes.filter((n) => n.parent === null);
  if (roots.length !== 1) throw new Error(`<Tree> needs exactly one root node (parent: null), it has ${roots.length}`);
  for (const n of p.nodes) if (n.parent !== null && !byId.has(n.parent)) throw new Error(`<Tree> node "${n.id}" has a parent "${n.parent}" that does not exist`);
  const kids = new Map<string, string[]>();
  for (const n of p.nodes) if (n.parent !== null) kids.set(n.parent, [...(kids.get(n.parent) ?? []), n.id]);

  // Tidy-ish layout: leaves get consecutive slots, parents sit over their children.
  const x = new Map<string, number>();
  const depth = new Map<string, number>();
  const order: string[] = [];
  let leaf = 0;
  const walk = (id: string, d: number) => {
    depth.set(id, d);
    order.push(id);
    const c = kids.get(id) ?? [];
    if (!c.length) x.set(id, leaf++);
    else {
      c.forEach((k) => walk(k, d + 1));
      x.set(id, (x.get(c[0])! + x.get(c[c.length - 1])!) / 2);
    }
  };
  walk(roots[0].id, 0);
  const levels = Math.max(...depth.values()) + 1;
  const slotW = p.width / Math.max(1, leaf);
  const levelH = levels > 1 ? (p.height - 80) / (levels - 1) : 0;
  const maxChars = Math.max(...p.nodes.map((n) => n.label.replace(/\$/g, "").length));
  const fs = Math.max(22, Math.min(p.size, (slotW - 24) / (maxChars * 0.62 + 1.2)));
  const pos = (id: string) => ({ x: (x.get(id)! + 0.5) * slotW, y: 40 + depth.get(id)! * levelH });
  const startOf = new Map(order.map((id, i) => [id, byId.get(id)!.at !== undefined ? resolveAt(byId.get(id)!.at!, timing) : base + i * p.gap]));
  for (const v of p.visit) if (!byId.has(v.id)) throw new Error(`<Tree> visit: no node "${v.id}"`);
  const visits = p.visit.map((v) => ({ ...v, t: resolveAt(v.at, timing) }));
  const current = visits.filter((v) => t >= v.t).pop();

  return (
    <div style={{ position: "relative", width: p.width, height: p.height }}>
      <svg width={p.width} height={p.height} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        {p.nodes
          .filter((n) => n.parent !== null)
          .map((n) => {
            const a = pos(n.parent!);
            const b = pos(n.id);
            const k = progressFrom(t, startOf.get(n.id)!, 0.5);
            return <line key={n.id} x1={a.x} y1={a.y} x2={a.x + (b.x - a.x) * k} y2={a.y + (b.y - a.y) * k} stroke={color("faint")} strokeWidth={3} opacity={k > 0 ? 1 : 0} />;
          })}
      </svg>
      {p.nodes.map((n) => {
        const c = pos(n.id);
        const start = startOf.get(n.id)!;
        const k = progressFrom(t, start, 0.5);
        const visited = visits.filter((v) => v.id === n.id && t >= v.t).pop();
        const toned = n.tone && t >= resolveAt(n.toneAt ?? start, timing);
        const toneName = (visited ? visited.tone : toned ? n.tone : "faint") as ColorName;
        const tone = color(toneName);
        const pop = visited ? Math.sin(Math.PI * Math.min(1, (t - visited.t) / 0.5)) * 0.18 : 0;
        const isCurrent = current?.id === n.id;
        return (
          <div
            key={n.id}
            style={{
              position: "absolute",
              left: c.x,
              top: c.y,
              transform: `translate(-50%, -50%) scale(${(0.85 + 0.15 * k) * (1 + pop)})`,
              opacity: k,
              boxShadow: isCurrent ? `0 0 0 6px ${tone}40, 0 0 28px ${tone}66` : undefined,
              background: toned || visited ? `${tone}26` : color("surface"),
              border: `3px solid ${tone}`,
              borderRadius: 10,
              padding: `${fs * 0.3}px ${fs * 0.55}px`,
              fontFamily: fonts.mono,
              fontSize: fs,
              whiteSpace: "nowrap",
            }}
          >
            <RichText text={n.label} />
          </div>
        );
      })}
    </div>
  );
}

export const treeMeta: KitEntry = {
  name: "Tree",
  category: "component",
  summary: "A tree that lays itself out (just declare parents): recursion trees, binary trees, classification trees. Nodes grow in, edges draw themselves; `visit` makes nodes bounce and light up in traversal order.",
  useWhen: ["Recursion trees of quick sort / merge sort / Fibonacci", "Binary search trees, heaps, decision trees"],
  avoidWhen: ["Graphs with cycles or several parents: use Diagram", "More than ~20 nodes"],
  example: "tree.tsx",
  schema: treeSchema,
};

/* ------------------------------------------------------------------- Cards */

export const cardsSchema = z.object({
  cards: z
    .array(
      z.object({
        title: z.string().describe("Short name, supports $…$"),
        points: z.array(z.string()).max(4).default([]).describe("At most 4 short points (≤ 8 words each)"),
        tone: colorSchema.optional().describe("Accent color of the card"),
        at: atSchema.optional(),
      }),
    )
    .min(2)
    .max(4),
  at: atSchema.default(0),
  gap: z.number().default(0.6).describe("Delay between cards appearing (seconds)"),
  focus: z.array(z.object({ index: z.number().int().min(0), at: atSchema })).default([]).describe("Highlight one card at a time (the others dim) at these moments"),
  width: z.number().optional().describe("Width (px); fills the container by default. Cards wrap when tight"),
});

export function Cards(props: z.input<typeof cardsSchema>) {
  const p = parseProps("Cards", cardsSchema, props);
  const timing = useSceneTiming();
  const t = useSceneTime();
  const base = resolveAt(p.at, timing);
  const focusNow = p.focus.reduce<number | null>((acc, f) => (t >= resolveAt(f.at, timing) ? f.index : acc), null);
  const n = p.cards.length;
  const fs = n >= 4 ? 30 : 34;
  return (
    <div style={{ width: p.width ?? "100%", maxWidth: 1700, display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${n >= 4 ? 340 : 380}px), 1fr))`, gap: 28, alignItems: "stretch" }}>
      {p.cards.map((c, i) => {
        const start = c.at !== undefined ? resolveAt(c.at, timing) : base + i * p.gap;
        const k = progressFrom(t, start, 0.6);
        const tone = color((c.tone ?? "accent") as ColorName);
        const on = focusNow === i;
        const dim = focusNow !== null && !on ? 0.4 : 1;
        return (
          <div
            key={i}
            style={{
              background: color("surface"),
              border: `3px solid ${on ? tone : color("grid")}`,
              borderTop: `8px solid ${tone}`,
              borderRadius: 14,
              padding: "28px 30px",
              opacity: k * dim,
              transform: `translateY(${(1 - k) * 24}px) scale(${on ? 1.03 : 1})`,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div style={{ fontSize: sizes.heading * 0.8, fontWeight: 600, lineHeight: 1.15 }}>
              <RichText text={c.title} />
            </div>
            {c.points.map((pt, j) => (
              <div key={j} style={{ fontSize: fs, lineHeight: 1.3, color: color("muted"), display: "flex", gap: 12 }}>
                <span style={{ color: tone }}>•</span>
                <span><RichText text={pt} /></span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

export const cardsMeta: KitEntry = {
  name: "Cards",
  category: "component",
  summary: "2–4 cards side by side, each with a name and a few short points; cards can be highlighted in turn.",
  useWhen: ["Comparing 2–4 options, variants or strategies (Lomuto vs Hoare, pivot choices)", "Pros and cons"],
  avoidWhen: ["Just one list of points: use BulletReveal", "Comparing many criteria in a grid: use Table"],
  example: "cards.tsx",
  schema: cardsSchema,
};
