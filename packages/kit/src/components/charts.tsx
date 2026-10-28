import React, { useId, useMemo } from "react";
import { z } from "zod";
import { parseProps, type KitEntry } from "../define";
import { localizeDecimal } from "../locale";
import { colorSchema, linear } from "../primitives";
import { color, ease, fonts, sizes, type ColorName } from "../theme";
import { evalTrack, trackSchema, type Track } from "../math/track";
import { atSchema, resolveAt, useSceneTime, useSceneTiming } from "../timing/context";
import { renderTex, RichText } from "./richtext";

/*
 * Venn diagrams, pie charts, 2D grids (DP tables, matrices) and live values
 * (sliders, formulas with numbers that update).
 */

/* -------------------------------------------------------------------- Venn */

/** Evaluate a set expression ("A&B", "A|B", "A-B", "!A", "(A|B)&!C") for a zone given by membership flags. */
function setExpr(expr: string, member: Record<string, boolean>): boolean {
  const src = expr.replace(/∩/g, "&").replace(/∪/g, "|").replace(/\\/g, "-").replace(/\s+/g, "");
  let i = 0;
  const atom = (): boolean => {
    const ch = src[i];
    if (ch === "!") {
      i++;
      return !atom();
    }
    if (ch === "(") {
      i++;
      const v = union();
      i++;
      return v;
    }
    const m = /^[A-Z]/.exec(src.slice(i));
    if (!m) throw new Error(`<Venn> expression "${expr}" is invalid at "${src.slice(i)}". Use A, B, C, U with & | - ! ( ).`);
    i++;
    if (m[0] === "U") return true;
    if (!(m[0] in member)) throw new Error(`<Venn> has no set "${m[0]}" (sets are named A, B, C in order).`);
    return member[m[0]];
  };
  const inter = (): boolean => {
    let v = atom();
    while (src[i] === "&" || src[i] === "-") {
      const op = src[i++];
      const r = atom();
      v = op === "&" ? v && r : v && !r;
    }
    return v;
  };
  const union = (): boolean => {
    let v = inter();
    while (src[i] === "|") {
      i++;
      v = union() || v;
    }
    return v;
  };
  return union();
}

export const vennSchema = z.object({
  sets: z
    .array(z.object({ label: z.string().describe("Set name, supports $…$"), color: colorSchema.optional() }))
    .min(2)
    .max(3)
    .describe("2 or 3 sets; in expressions they are A, B, C in order"),
  at: atSchema.default(0),
  universe: z.string().optional().describe("Label of the universal set (outer rectangle), e.g. \"Class 10A\""),
  steps: z
    .array(z.object({ at: atSchema, shade: z.string().describe('Region to shade: "A", "A&B" (intersection), "A|B" (union), "A-B" (difference), "!A" (complement), "A&B&!C". "" to clear'), color: colorSchema.default("accent") }))
    .default([])
    .describe("Each step shades one region (replacing the previous one)"),
  values: z
    .array(z.object({ in: z.string().describe("Region for the text, same syntax as shade (usually the smallest region, e.g. \"A&!B\")"), text: z.string(), at: atSchema }))
    .default([])
    .describe("A number or text placed in a region: element count, probability, a typical member"),
  width: z.number().min(500).max(1400).default(1000),
  height: z.number().min(400).max(820).default(680),
});

export function Venn(props: z.input<typeof vennSchema>) {
  const p = parseProps("Venn", vennSchema, props);
  const timing = useSceneTiming();
  const t = useSceneTime();
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const W = p.width;
  const H = p.height;
  const n = p.sets.length;
  const names = ["A", "B", "C"].slice(0, n);
  // Leave room above the circles for the set names and below for the universe name.
  const r = n === 2 ? Math.min(W * 0.25, H * 0.34) : Math.min(W * 0.2, H * 0.27);
  const cx = W / 2;
  const cy = H / 2 + (n === 3 ? r * 0.12 : 0);
  const centers: [number, number][] =
    n === 2
      ? [[cx - r * 0.62, cy], [cx + r * 0.62, cy]]
      : [[cx - r * 0.6, cy - r * 0.38], [cx + r * 0.6, cy - r * 0.38], [cx, cy + r * 0.66]];
  const tones = p.sets.map((s, i) => (s.color ?? (["info", "ok", "warn"] as const)[i]) as ColorName);
  const k0 = ease(linear(t, resolveAt(p.at, timing), 0.8));
  const zones = Array.from({ length: 1 << n }, (_, m) => m);
  const memberOf = (m: number) => Object.fromEntries(names.map((nm, i) => [nm, ((m >> i) & 1) === 1]));
  const inside = (x: number, y: number) => centers.reduce((m, c, i) => (Math.hypot(x - c[0], y - c[1]) <= r ? m | (1 << i) : m), 0);
  // Label anchor of each zone: the sampled point farthest from every boundary (a centroid can fall
  // outside a ring-shaped zone such as "outside every set").
  const anchors = useMemo(() => {
    const best = zones.map(() => ({ x: W / 2, y: H / 2, d: -1 }));
    for (let x = 30; x < W - 30; x += 8)
      for (let y = 30; y < H - 30; y += 8) {
        const m = inside(x, y);
        let d = Math.min(x - 20, W - 20 - x, y - 20, H - 20 - y);
        for (const c of centers) d = Math.min(d, Math.abs(Math.hypot(x - c[0], y - c[1]) - r));
        if (d > best[m].d) best[m] = { x, y, d };
      }
    return best.map((b) => [b.x, b.y]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [W, H, n]);

  // Shading: the current step's zones, cross-fading from the previous step's.
  const starts = p.steps.map((s) => resolveAt(s.at, timing));
  let cur = -1;
  starts.forEach((s, i) => {
    if (t >= s) cur = i;
  });
  const sel = (i: number) => (i < 0 || !p.steps[i].shade ? new Set<number>() : new Set(zones.filter((m) => setExpr(p.steps[i].shade, memberOf(m)))));
  const now = sel(cur);
  const before = sel(cur - 1);
  const tk = cur >= 0 ? ease(linear(t, starts[cur], 0.6)) : 0;
  const zoneFill = (m: number) => {
    const a = before.has(m) ? 1 - tk : 0;
    const b = now.has(m) ? tk : 0;
    const prevTone = cur > 0 ? p.steps[cur - 1].color : "accent";
    return [
      a > 0 ? { o: a, c: prevTone } : null,
      b > 0 ? { o: b, c: p.steps[cur].color } : null,
    ].filter(Boolean) as { o: number; c: ColorName }[];
  };
  const box = { x: 20, y: 20, w: W - 40, h: H - 40 };
  return (
    <div style={{ position: "relative", width: W, height: H, flex: "none", opacity: k0 }}>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <defs>
          {centers.map((c, i) => (
            <clipPath key={i} id={`${id}c${i}`}>
              <circle cx={c[0]} cy={c[1]} r={r} />
            </clipPath>
          ))}
          {zones.map((m) => (
            <mask key={m} id={`${id}m${m}`}>
              <rect x={0} y={0} width={W} height={H} fill="white" />
              {centers.map((c, i) => (((m >> i) & 1) === 0 ? <circle key={i} cx={c[0]} cy={c[1]} r={r} fill="black" /> : null))}
            </mask>
          ))}
        </defs>
        {p.universe ? <rect {...{ x: box.x, y: box.y, width: box.w, height: box.h }} rx={18} fill="none" stroke={color("muted")} strokeWidth={3} /> : null}
        {zones.map((m) => {
          if (m === 0 && !p.universe) return null;
          return zoneFill(m).map((f, j) => {
            let shape: React.ReactNode = <rect x={p.universe ? box.x : 0} y={p.universe ? box.y : 0} width={p.universe ? box.w : W} height={p.universe ? box.h : H} rx={18} fill={color(f.c)} fillOpacity={0.42 * f.o} />;
            names.forEach((_, i) => {
              if ((m >> i) & 1) shape = <g clipPath={`url(#${id}c${i})`}>{shape}</g>;
            });
            return (
              <g key={`${m}-${j}`} mask={`url(#${id}m${m})`}>
                {shape}
              </g>
            );
          });
        })}
        {centers.map((c, i) => {
          const k = ease(linear(t, resolveAt(p.at, timing) + i * 0.3, 0.8));
          return <circle key={i} cx={c[0]} cy={c[1]} r={r} fill={color(tones[i])} fillOpacity={0.08 * k} stroke={color(tones[i])} strokeWidth={4} pathLength={1} strokeDasharray={`${k} 1`} />;
        })}
      </svg>
      {p.universe ? <div style={{ position: "absolute", left: box.x + 22, bottom: H - box.y - box.h + 12, fontSize: 30, color: color("muted") }}><RichText text={p.universe} /></div> : null}
      {p.sets.map((s, i) => {
        const c = centers[i];
        const dx = c[0] - cx;
        const dy = c[1] - cy;
        const L = Math.hypot(dx, dy) || 1;
        const lx = c[0] + (dx / L) * r * 0.95;
        const ly = n === 2 ? c[1] - r - 26 : c[1] + (dy / L) * r * 1.05;
        const k = ease(linear(t, resolveAt(p.at, timing) + i * 0.3 + 0.4, 0.5));
        return (
          <div key={i} style={{ position: "absolute", left: lx, top: ly, transform: "translate(-50%, -50%)", fontSize: 36, fontWeight: 600, color: color(tones[i]), whiteSpace: "nowrap", opacity: k }}>
            <RichText text={s.label} />
          </div>
        );
      })}
      {p.values.map((v, i) => {
        const ms = zones.filter((m) => setExpr(v.in, memberOf(m)));
        if (!ms.length) return null;
        const pt = ms.map((m) => anchors[m]).reduce((a, b) => [a[0] + b[0] / ms.length, a[1] + b[1] / ms.length], [0, 0]);
        const k = ease(linear(t, resolveAt(v.at, timing), 0.5));
        return (
          <div key={i} style={{ position: "absolute", left: pt[0], top: pt[1], transform: `translate(-50%, -50%) scale(${0.6 + 0.4 * k})`, opacity: k, fontSize: 36, fontFamily: fonts.mono, color: color("text"), whiteSpace: "nowrap" }}>
            <RichText text={v.text} />
          </div>
        );
      })}
    </div>
  );
}

export const vennMeta: KitEntry = {
  name: "Venn",
  category: "component",
  summary: "Venn diagram of 2–3 sets: circles draw themselves, regions are shaded by expression (A&B, A|B, A-B, !A) step by step, with counts in each region.",
  useWhen: ["Sets: intersection, union, difference, complement", "Probability: intersections and unions of events, the addition rule", "Comparing two concepts: what is unique and what is shared (biology, literature, history)"],
  avoidWhen: ["More than 3 sets", "Comparing on many criteria: use Table"],
  example: "venn-sets.tsx",
  schema: vennSchema,
};

/* ---------------------------------------------------------------- PieChart */

export const pieChartSchema = z.object({
  slices: z.array(z.object({ label: z.string(), value: z.number().positive(), color: colorSchema.optional() })).min(1).max(8),
  at: atSchema.default(0).describe("When the slices sweep in one after another"),
  size: z.number().min(300).max(720).default(560),
  donut: z.boolean().default(true),
  center: z.string().optional().describe("Text in the middle of the ring (donut)"),
  percent: z.boolean().default(true).describe("Show percentages in the legend"),
  focus: z.array(z.object({ at: atSchema, index: z.number().int().nullable() })).default([]).describe("Pull a slice out and dim the others"),
});

const PIE_TONES: ColorName[] = ["info", "accent", "ok", "warn", "err", "muted", "text", "faint"];

export function PieChart(props: z.input<typeof pieChartSchema>) {
  const p = parseProps("PieChart", pieChartSchema, props);
  const timing = useSceneTiming();
  const t = useSceneTime();
  const total = p.slices.reduce((s, x) => s + x.value, 0);
  const S = p.size;
  const R = S / 2 - 24;
  const r0 = p.donut ? R * 0.55 : 0;
  const start = resolveAt(p.at, timing);
  const sweep = ease(linear(t, start, 1.4));
  let fi = -1;
  p.focus.forEach((f, i) => {
    if (t >= resolveAt(f.at, timing)) fi = i;
  });
  const focus = fi >= 0 ? p.focus[fi].index : null;
  const fk = fi >= 0 ? ease(linear(t, resolveAt(p.focus[fi].at, timing), 0.5)) : 0;
  let acc = 0;
  const arcs = p.slices.map((s, i) => {
    const a0 = -Math.PI / 2 + (2 * Math.PI * acc) / total;
    acc += s.value;
    const a1full = -Math.PI / 2 + (2 * Math.PI * acc) / total;
    const end = -Math.PI / 2 + 2 * Math.PI * sweep;
    if (end <= a0) return null;
    const a1 = Math.min(a1full, end);
    const mid = (a0 + a1full) / 2;
    const out = focus === i ? 22 * fk : 0;
    const ox = Math.cos(mid) * out;
    const oy = Math.sin(mid) * out;
    const P = (a: number, rr: number) => `${(S / 2 + ox + rr * Math.cos(a)).toFixed(1)} ${(S / 2 + oy + rr * Math.sin(a)).toFixed(1)}`;
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const d = r0 > 0 ? `M${P(a0, R)} A${R} ${R} 0 ${large} 1 ${P(a1, R)} L${P(a1, r0)} A${r0} ${r0} 0 ${large} 0 ${P(a0, r0)} Z` : `M${S / 2 + ox} ${S / 2 + oy} L${P(a0, R)} A${R} ${R} 0 ${large} 1 ${P(a1, R)} Z`;
    const tone = (s.color ?? PIE_TONES[i % PIE_TONES.length]) as ColorName;
    return <path key={i} d={d} fill={color(tone)} fillOpacity={focus !== null && focus !== i ? 0.3 + 0.7 * (1 - fk) : 0.9} stroke={color("bg")} strokeWidth={4} />;
  });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 56 }}>
      <div style={{ position: "relative", width: S, height: S, flex: "none" }}>
        <svg width={S} height={S} style={{ display: "block" }}>
          {arcs}
        </svg>
        {p.center && p.donut ? (
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center", fontSize: 34, fontWeight: 600, opacity: sweep, padding: r0 * 0.5 }}>
            <RichText text={p.center} />
          </div>
        ) : null}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {p.slices.map((s, i) => {
          const k = ease(linear(t, start + (1.4 * i) / p.slices.length, 0.5));
          const tone = (s.color ?? PIE_TONES[i % PIE_TONES.length]) as ColorName;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, opacity: k * (focus !== null && focus !== i ? 0.45 : 1), fontSize: sizes.small }}>
              <span style={{ width: 26, height: 26, borderRadius: 6, background: color(tone), flex: "none" }} />
              <span>
                <RichText text={s.label} />
              </span>
              {p.percent ? <span style={{ fontFamily: fonts.mono, color: color(tone), marginLeft: "auto", paddingLeft: 16 }}>{localizeDecimal(((s.value / total) * 100).toFixed(s.value / total < 0.1 ? 1 : 0))}%</span> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const pieChartMeta: KitEntry = {
  name: "PieChart",
  category: "component",
  summary: "Pie / donut chart: slices sweep in one by one, legend with percentages, `focus` pulls a slice out.",
  useWhen: ["Shares and structure: economic sectors, composition of air, population structure", "Percentages of a whole"],
  avoidWhen: ["Comparing sizes between items or over time: use BarChart / Scatter connect"],
  example: "pie-economy.tsx",
  schema: pieChartSchema,
};

/* ----------------------------------------------------------------- GridViz */

const cell = z.tuple([z.number().int(), z.number().int()]);

export const gridVizSchema = z.object({
  values: z.array(z.array(z.union([z.number(), z.string(), z.null()]))).min(1).describe("Values by row; null = empty cell (filled later with steps.set)"),
  rowLabels: z.array(z.string()).optional(),
  colLabels: z.array(z.string()).optional(),
  at: atSchema.default(0),
  reveal: z.enum(["all", "rows", "cells"]).default("all").describe("How the table appears: all at once, row by row, cell by cell"),
  matrix: z.boolean().default(false).describe("Matrix style: no cell borders, square brackets on both sides"),
  width: z.number().min(200).max(1600).default(1000),
  cell: z.number().min(48).max(160).optional().describe("Cell size (px); computed from width by default"),
  steps: z
    .array(
      z.object({
        at: atSchema,
        set: z.array(z.object({ r: z.number().int(), c: z.number().int(), v: z.union([z.number(), z.string()]) })).optional().describe("Fill / change cell values (the cell flips to its new value)"),
        focus: z.array(cell).optional().describe("Cells being considered [row, column] (accent, this step only)"),
        from: z.array(cell).optional().describe("Cells used to compute the first focus cell: arrows point from them to it (dynamic programming)"),
        rows: z.array(z.number().int()).optional().describe("Highlight whole rows (matrix product: row i)"),
        cols: z.array(z.number().int()).optional().describe("Highlight whole columns"),
        done: z.array(cell).optional().describe("Add finished cells (tinted ok, kept to the end)"),
        note: z.string().optional().describe("Note line under the table, \"\" to clear"),
      }),
    )
    .default([]),
});

export function GridViz(props: z.input<typeof gridVizSchema>) {
  const p = parseProps("GridViz", gridVizSchema, props);
  const timing = useSceneTiming();
  const t = useSceneTime();
  const R = p.values.length;
  const C = Math.max(...p.values.map((r) => r.length));
  const labW = p.rowLabels ? 110 : 0;
  const labH = p.colLabels ? 56 : 0;
  const cs = p.cell ?? Math.max(48, Math.min(120, Math.floor((p.width - labW - (p.matrix ? 60 : 0)) / C)));
  const bx = labW + (p.matrix ? 30 : 0);
  const W = bx + C * cs + (p.matrix ? 30 : 0);
  const H = labH + R * cs + 70;
  const start = resolveAt(p.at, timing);
  // Replay steps up to now.
  const vals = p.values.map((r) => [...r]);
  const changed = new Map<string, number>();
  const done = new Set<string>();
  let focus: [number, number][] = [];
  let from: [number, number][] = [];
  let rows: number[] = [];
  let cols: number[] = [];
  let note = "";
  let stepStart = -Infinity;
  for (const s of p.steps) {
    const st = resolveAt(s.at, timing);
    if (t < st) break;
    stepStart = st;
    for (const u of s.set ?? []) {
      if (u.r < 0 || u.r >= R || u.c < 0 || u.c >= C) throw new Error(`<GridViz> cell [${u.r}, ${u.c}] is outside the ${R}×${C} table`);
      vals[u.r][u.c] = u.v;
      changed.set(`${u.r},${u.c}`, st);
    }
    for (const d of s.done ?? []) done.add(`${d[0]},${d[1]}`);
    focus = (s.focus ?? []) as [number, number][];
    from = (s.from ?? []) as [number, number][];
    rows = s.rows ?? [];
    cols = s.cols ?? [];
    if (s.note !== undefined) note = s.note;
  }
  const sk = ease(linear(t, stepStart, 0.45));
  const isFocus = (r: number, c: number) => focus.some((f) => f[0] === r && f[1] === c);
  const cellShow = (r: number, c: number) => {
    const delay = p.reveal === "rows" ? r * 0.35 : p.reveal === "cells" ? (r * C + c) * 0.08 : 0;
    return ease(linear(t, start + delay, 0.5));
  };
  const center = (r: number, c: number): [number, number] => [bx + c * cs + cs / 2, labH + r * cs + cs / 2];
  return (
    <div style={{ position: "relative", width: W, height: H, flex: "none" }}>
      {p.matrix ? (
        <svg width={W} height={labH + R * cs + 8} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", opacity: cellShow(0, 0) }}>
          <path d={`M${bx - 6} ${labH} h-18 v${R * cs} h18`} fill="none" stroke={color("text")} strokeWidth={4} />
          <path d={`M${bx + C * cs + 6} ${labH} h18 v${R * cs} h-18`} fill="none" stroke={color("text")} strokeWidth={4} />
        </svg>
      ) : null}
      {p.colLabels?.map((l, c) => (
        <div key={`cl${c}`} style={{ position: "absolute", left: bx + c * cs, width: cs, top: 0, height: labH, display: "grid", placeItems: "center", fontSize: 28, fontFamily: fonts.mono, color: cols.includes(c) ? color("info") : color("muted"), opacity: cellShow(0, c) }}>
          <RichText text={l} />
        </div>
      ))}
      {p.rowLabels?.map((l, r) => (
        <div key={`rl${r}`} style={{ position: "absolute", left: 0, width: labW - 12, top: labH + r * cs, height: cs, display: "flex", alignItems: "center", justifyContent: "flex-end", fontSize: 28, fontFamily: fonts.mono, color: rows.includes(r) ? color("info") : color("muted"), opacity: cellShow(r, 0) }}>
          <RichText text={l} />
        </div>
      ))}
      {vals.map((row, r) =>
        Array.from({ length: C }, (_, c) => {
          const k = cellShow(r, c);
          if (k <= 0) return null;
          const v = row[c];
          const key = `${r},${c}`;
          const f = isFocus(r, c);
          const hl = rows.includes(r) || cols.includes(c);
          const isDone = done.has(key);
          const ch = changed.get(key);
          const flip = ch !== undefined ? ease(linear(t, ch, 0.45)) : 1;
          const tone: ColorName | null = f ? "accent" : isDone ? "ok" : hl ? "info" : null;
          const fromHere = from.some((q) => q[0] === r && q[1] === c);
          return (
            <div
              key={key}
              style={{
                position: "absolute",
                left: bx + c * cs + 3,
                top: labH + r * cs + 3,
                width: cs - 6,
                height: cs - 6,
                borderRadius: p.matrix ? 8 : 10,
                display: "grid",
                placeItems: "center",
                background: tone ? `color-mix(in srgb, ${color(tone)} ${f ? 30 * sk : 22}%, ${color("surface")})` : p.matrix ? "transparent" : color("surface"),
                border: p.matrix && !tone ? "none" : `${f || fromHere ? 3 : 2}px solid ${tone ? color(tone) : fromHere ? color("warn") : color("grid")}`,
                fontFamily: fonts.mono,
                fontSize: Math.min(44, cs * 0.42),
                color: v === null ? color("faint") : color("text"),
                opacity: k,
                transform: `scale(${0.85 + 0.15 * k}) ${ch !== undefined && flip < 1 ? `perspective(400px) rotateX(${(1 - flip) * 90}deg)` : ""}`,
              }}
            >
              {v === null ? "" : <RichText text={String(v)} />}
            </div>
          );
        }),
      )}
      {from.length && focus.length ? (
        <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none" }}>
          {from.map((q, i) => {
            const a = center(q[0], q[1]);
            const b = center(focus[0][0], focus[0][1]);
            const dx = b[0] - a[0];
            const dy = b[1] - a[1];
            const L = Math.hypot(dx, dy) || 1;
            const s0 = cs * 0.32;
            const A = [a[0] + (dx / L) * s0, a[1] + (dy / L) * s0];
            const B = [b[0] - (dx / L) * s0, b[1] - (dy / L) * s0];
            const ex = A[0] + (B[0] - A[0]) * sk;
            const ey = A[1] + (B[1] - A[1]) * sk;
            const ux = dx / L;
            const uy = dy / L;
            return (
              <g key={i}>
                <line x1={A[0]} y1={A[1]} x2={ex} y2={ey} stroke={color("warn")} strokeWidth={4} strokeLinecap="round" />
                {sk > 0.8 ? <path d={`M${ex} ${ey} L${ex - ux * 16 - uy * 9} ${ey - uy * 16 + ux * 9} L${ex - ux * 16 + uy * 9} ${ey - uy * 16 - ux * 9} Z`} fill={color("warn")} /> : null}
              </g>
            );
          })}
        </svg>
      ) : null}
      <div style={{ position: "absolute", left: 0, right: 0, top: labH + R * cs + 18, textAlign: "center", fontSize: sizes.small, color: color("muted"), whiteSpace: "nowrap" }}>
        <RichText text={note} />
      </div>
    </div>
  );
}

export const gridVizMeta: KitEntry = {
  name: "GridViz",
  category: "component",
  summary: "A 2D grid of cells driven by steps: fill values (cells flip), highlight the cell being computed, arrows from the cells it depends on, highlight rows/columns, mark cells done; `matrix` for a bracketed matrix.",
  useWhen: ["Dynamic programming: LCS, knapsack, counting paths (from → focus)", "Matrices: row × column products, Gaussian elimination", "Game boards, Punnett squares (genetics), multiplication tables"],
  avoidWhen: ["Tables of text comparing criteria: use Table", "One-dimensional arrays: use ArrayViz"],
  example: "grid-dp.tsx",
  schema: gridVizSchema,
};

/* ------------------------------------------------------------------ Slider */

export const sliderSchema = z.object({
  label: z.string().describe("Parameter name, supports $…$, e.g. \"$a$\""),
  value: trackSchema.describe("Value (keyframes): use the SAME keyframes as the Plot params so slider and graph move together"),
  min: z.number(),
  max: z.number(),
  at: atSchema.default(0),
  width: z.number().min(240).max(1200).default(520),
  decimals: z.number().int().min(0).max(3).default(1),
  color: colorSchema.default("accent"),
});

export function Slider(props: z.input<typeof sliderSchema>) {
  const p = parseProps("Slider", sliderSchema, props);
  const timing = useSceneTiming();
  const t = useSceneTime();
  const v = evalTrack(p.value as Track, t, timing);
  const k = ease(linear(t, resolveAt(p.at, timing), 0.5));
  const f = Math.max(0, Math.min(1, (v - p.min) / (p.max - p.min || 1)));
  const c = color(p.color as ColorName);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 24, opacity: k, transform: `translateY(${(1 - k) * 12}px)` }}>
      <div style={{ fontSize: 40, color: c, minWidth: 40, textAlign: "right" }}>
        <RichText text={p.label} />
      </div>
      <div style={{ position: "relative", width: p.width, height: 36 }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: 15, height: 6, borderRadius: 3, background: color("grid") }} />
        <div style={{ position: "absolute", left: 0, width: `${f * 100}%`, top: 15, height: 6, borderRadius: 3, background: c }} />
        <div style={{ position: "absolute", left: `${f * 100}%`, top: 2, width: 32, height: 32, marginLeft: -16, borderRadius: "50%", background: color("text"), border: `5px solid ${c}` }} />
      </div>
      <div style={{ fontFamily: fonts.mono, fontSize: 38, minWidth: 130, color: color("text"), fontVariantNumeric: "tabular-nums" }}>{localizeDecimal(v.toFixed(p.decimals))}</div>
    </div>
  );
}

export const sliderMeta: KitEntry = {
  name: "Slider",
  category: "primitive",
  summary: "A slider showing a parameter as it changes (knob + number), following the same keyframes as the graph.",
  useWhen: ["Exploring a parameter: \"as a grows, the graph …\" (next to the Axes, same keyframes as Plot params)", "A physical quantity that changes: slope angle, mass, temperature"],
  avoidWhen: ["A big number on its own: use Counter"],
  example: "plot-params.tsx",
  schema: sliderSchema,
};

/* ----------------------------------------------------------------- LiveTex */

export const liveTexSchema = z.object({
  tex: z.string().describe('TeX formula with {name} slots: "a = {a}", "S = {s}\\text{ cm}^2"'),
  values: z.record(z.string(), trackSchema).describe("Value for each slot (keyframes), updated every frame"),
  decimals: z.number().int().min(0).max(4).default(2),
  at: atSchema.default(0),
  size: z.number().min(28).max(120).default(64),
  color: colorSchema.default("text"),
});

export function LiveTex(props: z.input<typeof liveTexSchema>) {
  const p = parseProps("LiveTex", liveTexSchema, props);
  const timing = useSceneTiming();
  const t = useSceneTime();
  const k = ease(linear(t, resolveAt(p.at, timing), 0.5));
  const tex = p.tex.replace(/\{(\w+)\}/g, (m, name: string) => {
    if (!(name in p.values)) return m;
    const v = evalTrack(p.values[name] as Track, t, timing);
    return localizeDecimal(v.toFixed(p.decimals), true);
  });
  return <div style={{ fontSize: p.size, color: color(p.color as ColorName), opacity: k, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }} dangerouslySetInnerHTML={{ __html: renderTex(tex, true) }} />;
}

export const liveTexMeta: KitEntry = {
  name: "LiveTex",
  category: "primitive",
  summary: "A formula with live numbers: each {name} slot is filled with the current value of its keyframes, every frame.",
  useWhen: ["Quantities computed from a moving picture: slope, area, sin θ = 0.71", "Results that update as a parameter changes"],
  avoidWhen: ["A static formula: use Formula"],
  example: "plot-params.tsx",
  schema: liveTexSchema,
};
