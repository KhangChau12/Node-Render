import React, { createContext, useContext, useId, useMemo } from "react";
import { interpolate } from "remotion";
import { z } from "zod";
import { parseProps, type KitEntry } from "../define";
import { RichText } from "../components/formula";
import { axisNameStyle, color, colorNames, ease, fonts, type ColorName } from "../theme";
import { atSchema, resolveAt, useSceneTime, useSceneTiming, type At } from "../timing/context";
import type { SceneTiming } from "../timing/estimate";
import { compileExpr, fmtNumber, niceStep, toFn1, type Fn1 } from "./expr";
import { evalParams, evalTrack, trackPhase, trackSchema } from "./track";
import { ArrowShape, bracePath, dirSchema, smoothPath, Tag, type Dir } from "./svg";

/*
 * Axes: a coordinate system that other math objects live in. Children are
 * placed in math coordinates (Plot, Point, Vector, Polygon…), so a scene never
 * computes pixels. The visible window can zoom/pan (`view`) and the whole plane
 * can undergo a linear transformation (`matrix`); every child follows.
 */

const colorEnum = z.enum(colorNames);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const lin = (t: number, s: number, d: number) => (d <= 0 ? (t >= s ? 1 : 0) : interpolate(t, [s, s + d], [0, 1], clamp));
const pair = z.tuple([z.number(), z.number()]);

export const fnSchema = z
  .union([z.string(), z.custom<(...args: number[]) => number>((v) => typeof v === "function", { message: "must be an expression string or a function" })])
  .describe('Expression string ("x^2 - 1", "a*sin(x)") or a JS function ((x) => …)');

/* ------------------------------------------------------------------ context */

type Mat = [number, number, number, number];

type AxesCtx = {
  /** Math → screen px, with the current linear transformation applied. */
  toPx: (x: number, y: number) => [number, number];
  /** Math → screen px, ignoring the transformation (static background). */
  rawPx: (x: number, y: number) => [number, number];
  view: { x0: number; x1: number; y0: number; y1: number };
  plot: { l: number; t: number; w: number; h: number };
  /** px per unit along x and y. */
  unit: [number, number];
  clip: string;
  /** Second the axes appear; children default to shortly after. */
  start: number;
  t: number;
  timing: SceneTiming;
  /** True when straight lines no longer stay straight (warp): edges must be subdivided. */
  nonlinear: boolean;
};

const Ctx = createContext<AxesCtx | null>(null);

function useAxes(name: string): AxesCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error(`<${name}> must be inside <Axes> (or <Stage>).`);
  return c;
}

/** Screen path through math points; edges are subdivided when the plane is warped so they bend with it. */
function linePath(c: AxesCtx, pts: [number, number][], closed: boolean, k = 1): string {
  const seq = closed ? [...pts, pts[0]] : pts;
  const out: [number, number][] = [];
  const sub = c.nonlinear ? 24 : 1;
  for (let i = 0; i < seq.length - 1; i++) {
    const [x1, y1] = seq[i];
    const [x2, y2] = seq[i + 1];
    for (let j = 0; j < sub; j++) out.push(c.toPx(x1 + ((x2 - x1) * j) / sub, y1 + ((y2 - y1) * j) / sub));
  }
  out.push(c.toPx(...seq[seq.length - 1]));
  // Partial drawing: keep only the first fraction k of the vertices.
  const n = k >= 1 ? out.length : Math.max(1, Math.ceil(out.length * k));
  const d = `M${out.slice(0, n).map((q) => `${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join(" L")}`;
  return closed && k >= 1 ? `${d} Z` : d;
}

/**
 * Values of an element's params for this frame, plus `time`: seconds since the
 * Axes / Stage appeared. One clock for the whole figure keeps moving parts in phase.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function paramVals(c: AxesCtx, params: Record<string, z.input<typeof trackSchema>> | undefined, _start: number, t = c.t): Record<string, number> {
  return { time: Math.max(0, t - c.start), ...evalParams(params, t, c.timing) };
}

/* ======================================================================
 * Motion values: a number, keyframes, or an expression of `time`.
 * ==================================================================== */

const motionSchema = z
  .union([trackSchema, z.string()])
  .describe('A number, keyframes [{ at, value }], or an expression of `time` (seconds since the Axes / Stage appeared): "30*time", "sin(2*time)"');
type Motion = z.input<typeof motionSchema>;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function evalMotion(v: Motion | undefined, c: AxesCtx, _start: number, t = c.t, fallback = 0): number {
  if (v === undefined) return fallback;
  if (typeof v === "string") return compileExpr(v, ["time"])(Math.max(0, t - c.start));
  return evalTrack(v, t, c.timing);
}


/** Start time of a child: its own `at`, or just after the axes appear. */
const startOf = (c: AxesCtx, at: At | undefined, lag = 0.5) => (at === undefined ? c.start + lag : resolveAt(at, c.timing));

/* --------------------------------------------------------------------- Axes */

export const axesSchema = z.object({
  x: pair.default([-5, 5]).describe("x range shown [min, max]"),
  y: pair.optional().describe("y range; when empty it is chosen so 1 x unit = 1 y unit, centered on 0"),
  width: z.number().min(200).max(1728).default(1300),
  height: z.number().min(200).max(900).default(720),
  at: atSchema.default(0).describe("When the axes appear (they draw out from the origin)"),
  axes: z.boolean().default(true).describe("Draw the two axes; false for pure geometry (shapes only, no axes)"),
  grid: z.enum(["none", "subtle", "plane"]).default("subtle").describe("subtle: faint grid; plane: clear blue coordinate plane (linear algebra); none"),
  ticks: z.boolean().default(true).describe("Numbers on the axes"),
  tickStep: pair.optional().describe("Tick step [x, y]; leave empty to choose automatically"),
  labels: z.tuple([z.string(), z.string()]).default(["x", "y"]).describe("Axis names, support $…$"),
  equal: z.boolean().default(false).describe("Keep 1 x unit = 1 y unit (circles look round); the box shrinks to keep the ratio"),
  view: z
    .array(z.object({ at: atSchema, x: pair, y: pair }))
    .default([])
    .describe("Math camera: at `at` the view window glides to a new x, y range (zoom into a point on a curve, zoom back out)"),
  matrix: z
    .array(z.object({ at: atSchema, m: z.tuple([pair, pair]).describe("[[a, b], [c, d]]: î goes to (a, c), ĵ goes to (b, d)") }))
    .default([])
    .describe("Linear transformation of the whole plane: grid, vectors, points and shapes all follow. Each key is relative to the original matrix, not cumulative"),
  basis: z.boolean().default(false).describe("Show the basis vectors î (ok) and ĵ (err), following `matrix`"),
  warp: z
    .array(z.object({ at: atSchema, fx: z.string().describe("New x as a function of x, y"), fy: z.string().describe("New y as a function of x, y") }))
    .default([])
    .describe('NONLINEAR transformation of the whole plane: the point (x, y) goes to (fx, fy) and the grid bends with it. Complex map w = z²: { fx: "x^2 - y^2", fy: "2*x*y" }. Each key is relative to the original plane'),
  transition: z.number().positive().default(1.6).describe("Duration of each view/matrix change (seconds)"),
});

export function Axes(props: z.input<typeof axesSchema> & { children?: React.ReactNode }) {
  const p = parseProps("Axes", axesSchema, props);
  const timing = useSceneTiming();
  const t = useSceneTime();
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const start = resolveAt(p.at, timing);

  const pad = p.axes ? { l: p.ticks ? 72 : 24, r: 56, t: 44, b: p.ticks ? 54 : 24 } : { l: 12, r: 12, t: 12, b: 12 };
  let pw = p.width - pad.l - pad.r;
  let ph = p.height - pad.t - pad.b;
  const ix = p.x;
  const iy: [number, number] = p.y ?? [(-(ix[1] - ix[0]) * ph) / pw / 2, ((ix[1] - ix[0]) * ph) / pw / 2];
  const equal = p.equal || !p.y;
  if (equal) {
    // Shrink the box so one unit is the same length on both axes.
    const s = Math.min(pw / (ix[1] - ix[0]), ph / (iy[1] - iy[0]));
    pw = s * (ix[1] - ix[0]);
    ph = s * (iy[1] - iy[0]);
  }
  const W = pw + pad.l + pad.r;
  const H = ph + pad.t + pad.b;

  // Current view window.
  let v = { x0: ix[0], x1: ix[1], y0: iy[0], y1: iy[1] };
  for (const k of p.view) {
    const e = ease(lin(t, resolveAt(k.at, timing), p.transition));
    v = { x0: v.x0 + (k.x[0] - v.x0) * e, x1: v.x1 + (k.x[1] - v.x1) * e, y0: v.y0 + (k.y[0] - v.y0) * e, y1: v.y1 + (k.y[1] - v.y1) * e };
  }
  let sx = pw / (v.x1 - v.x0);
  let sy = ph / (v.y1 - v.y0);
  let ox = 0;
  let oy = 0;
  if (equal) {
    const s = Math.min(sx, sy);
    ox = (pw - s * (v.x1 - v.x0)) / 2;
    oy = (ph - s * (v.y1 - v.y0)) / 2;
    sx = sy = s;
  }
  const rawPx = (x: number, y: number): [number, number] => [pad.l + ox + (x - v.x0) * sx, pad.t + oy + (v.y1 - y) * sy];

  // Current linear transformation (entries interpolated, as in a real transform animation).
  let M: Mat = [1, 0, 0, 1];
  for (const k of p.matrix) {
    const e = ease(lin(t, resolveAt(k.at, timing), p.transition));
    const target: Mat = [k.m[0][0], k.m[0][1], k.m[1][0], k.m[1][1]];
    M = M.map((a, i) => a + (target[i] - a) * e) as Mat;
  }
  // Current nonlinear warp: each key blends from the previous state toward its own map of the ORIGINAL point.
  const warps = p.warp.map((w) => ({ e: ease(lin(t, resolveAt(w.at, timing), p.transition)), fx: compileExpr(w.fx, ["x", "y"]), fy: compileExpr(w.fy, ["x", "y"]) })).filter((w) => w.e > 0);
  const toPx = (x: number, y: number) => {
    let wx = x;
    let wy = y;
    for (const w of warps) {
      wx += (w.fx(x, y) - wx) * w.e;
      wy += (w.fy(x, y) - wy) * w.e;
    }
    return rawPx(M[0] * wx + M[1] * wy, M[2] * wx + M[3] * wy);
  };

  const ctx: AxesCtx = { toPx, rawPx, view: v, plot: { l: pad.l, t: pad.t, w: pw, h: ph }, unit: [sx, sy], clip: `url(#kit-axes-${id})`, start, t, timing, nonlinear: warps.length > 0 };

  // Entrance: grid fades/draws in, axes draw from the origin.
  const k = ease(lin(t, start, 0.9));
  const gk = ease(lin(t, start + 0.15, 1.1));
  const stepX = p.tickStep?.[0] ?? (p.grid === "plane" ? Math.max(1, niceStep(v.x1 - v.x0, 10)) : niceStep(v.x1 - v.x0, 7));
  const stepY = p.tickStep?.[1] ?? (p.grid === "plane" ? Math.max(1, niceStep(v.y1 - v.y0, 7)) : niceStep(v.y1 - v.y0, 5));
  const range = (a: number, b: number, s: number) => {
    const out: number[] = [];
    for (let q = Math.ceil(a / s - 1e-9) * s; q <= b + 1e-9; q += s) out.push(Math.abs(q) < 1e-9 ? 0 : q);
    return out.slice(0, 200);
  };
  const xs = range(v.x0, v.x1, stepX);
  const ys = range(v.y0, v.y1, stepY);

  const [axX, axY] = rawPx(0, 0);
  // An axis whose zero is out of view moves to the bottom / left edge, like a zoomed-in plot.
  const axisY = v.y0 <= 0 && v.y1 >= 0 ? axY : pad.t + ph;
  const axisX = v.x0 <= 0 && v.x1 >= 0 ? axX : pad.l;

  const transformed = p.matrix.length > 0 || p.warp.length > 0;
  const gridTone = p.grid === "plane" ? color("info") : color("grid");
  const gridOpacity = p.grid === "plane" ? 0.38 : 1;

  // Plane lines under the transformation: lines x = c and y = c over a wider range, so the plane still fills the box.
  let planeLines: React.ReactNode = null;
  if (p.grid !== "none" && transformed) {
    // A warp bends lines, so they are sampled finely over a smaller range (and denser); a matrix keeps them straight.
    const curved = p.warp.length > 0;
    const ext = (curved ? 1.2 : 3) * Math.max(v.x1 - v.x0, v.y1 - v.y0);
    const cx = (v.x0 + v.x1) / 2;
    const cy = (v.y0 + v.y1) / 2;
    const lines: React.ReactNode[] = [];
    const draw = (key: string, c: number, f: (s: number) => [number, number], a: number, b: number) => {
      const n = curved ? 160 : 1;
      const pts = Array.from({ length: n + 1 }, (_, i) => toPx(...f(a + ((b - a) * i) / n)));
      lines.push(
        <polyline key={key} points={pts.map((q) => `${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(" ")} fill="none" stroke={c === 0 ? color("text") : color("info")} strokeOpacity={c === 0 ? 0.9 : 0.5} strokeWidth={c === 0 ? 3 : 2} />,
      );
    };
    for (const c of range(cx - ext, cx + ext, curved ? stepX / 4 : stepX)) draw(`vx${c}`, c, (s) => [c, s], cy - ext, cy + ext);
    for (const c of range(cy - ext, cy + ext, curved ? stepY / 4 : stepY)) draw(`hy${c}`, c, (s) => [s, c], cx - ext, cx + ext);
    planeLines = <g opacity={gk}>{lines}</g>;
  }

  const basis = p.basis
    ? ([
        [1, 0, "ok", "\\hat{\\imath}"],
        [0, 1, "err", "\\hat{\\jmath}"],
      ] as const).map(([bx, by, tone, tex]) => (
        <ArrowShape key={tex} from={toPx(0, 0)} to={toPx(bx, by)} tone={tone} k={ease(lin(t, start + 0.8, 0.7))} width={6} label={`$${tex}$`} />
      ))
    : null;

  return (
    <div style={{ width: W, height: H, flex: "none" }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible", display: "block" }}>
        <defs>
          <clipPath id={`kit-axes-${id}`}>
            <rect x={pad.l} y={pad.t} width={pw} height={ph} />
          </clipPath>
        </defs>
        {/* Static grid; it stays as a faint reference when the plane is transformed. */}
        {p.grid !== "none" ? (
          <g clipPath={ctx.clip} opacity={transformed ? 0.35 : gridOpacity}>
            {xs.map((q, i) => {
              const [gx] = rawPx(q, 0);
              const d = Math.max(0, Math.min(1, gk * 1.5 - (i / xs.length) * 0.5));
              return <line key={`gx${q}`} x1={gx} x2={gx} y1={pad.t + ph} y2={pad.t + ph - ph * d} stroke={transformed ? color("grid") : gridTone} strokeWidth={2} />;
            })}
            {ys.map((q, i) => {
              const [, gy] = rawPx(0, q);
              const d = Math.max(0, Math.min(1, gk * 1.5 - (i / ys.length) * 0.5));
              return <line key={`gy${q}`} y1={gy} y2={gy} x1={pad.l} x2={pad.l + pw * d} stroke={transformed ? color("grid") : gridTone} strokeWidth={2} />;
            })}
          </g>
        ) : null}
        {planeLines ? <g clipPath={ctx.clip}>{planeLines}</g> : null}
        {p.axes ? (
          <g>
            <line x1={axisX - (axisX - pad.l) * k} x2={axisX + (pad.l + pw + 18 - axisX) * k} y1={axisY} y2={axisY} stroke={color("muted")} strokeWidth={3} />
            <line y1={axisY + (pad.t + ph - axisY) * k} y2={axisY - (axisY - pad.t + 18) * k} x1={axisX} x2={axisX} stroke={color("muted")} strokeWidth={3} />
            {p.ticks
              ? xs.map((q) =>
                  q === 0 || Math.abs(rawPx(q, 0)[0] - axisX) < 30 ? null : (
                    <text key={`tx${q}`} x={rawPx(q, 0)[0]} y={axisY + 36} fill={color("faint")} fontSize={24} fontFamily={fonts.mono} textAnchor="middle" opacity={k}>
                      {fmtNumber(q)}
                    </text>
                  ),
                )
              : null}
            {p.ticks
              ? ys.map((q) =>
                  q === 0 || Math.abs(rawPx(0, q)[1] - axisY) < 20 ? null : (
                    <text key={`ty${q}`} x={axisX - 14} y={rawPx(0, q)[1] + 8} fill={color("faint")} fontSize={24} fontFamily={fonts.mono} textAnchor="end" opacity={k}>
                      {fmtNumber(q)}
                    </text>
                  ),
                )
              : null}
            <Tag x={pad.l + pw + 22} y={axisY} dir="r" size={32} tone="muted" opacity={k}>
              <span style={axisNameStyle(p.labels[0])}>
                <RichText text={p.labels[0]} />
              </span>
            </Tag>
            <Tag x={axisX + 14} y={pad.t - 14} dir="r" size={32} tone="muted" opacity={k}>
              <span style={axisNameStyle(p.labels[1])}>
                <RichText text={p.labels[1]} />
              </span>
            </Tag>
          </g>
        ) : null}
        <Ctx.Provider value={ctx}>
          {basis}
          {p.children}
        </Ctx.Provider>
      </svg>
    </div>
  );
}

export const axesMeta: KitEntry = {
  name: "Axes",
  category: "component",
  summary:
    "A coordinate system holding math objects placed by coordinates (Plot, Point, Vector, Segment, Polygon, Circle, AreaUnder, Riemann, Tangent, VectorField, Angle, Label). `view` zooms/pans into a region and `matrix` transforms the whole plane.",
  useWhen: [
    "Functions, several curves, points moving on a graph, sliding tangents, areas, Riemann sums",
    "Vectors, linear transformations, determinants (grid=\"plane\" + matrix + basis)",
    "Plane geometry with coordinates: triangles, circles, angles (axes={false} grid=\"none\")",
    "Zooming into a point to see the curve become almost straight (view)",
  ],
  avoidWhen: ["Block diagrams, processes: use Diagram", "Statistics: use BarChart"],
  example: "axes-complex.tsx",
  children: "Coordinate objects only (Plot, Point, Vector, Segment, Polygon, Circle, AreaUnder, Riemann, Tangent, VectorField, Angle, Label)",
  schema: axesSchema,
};

/* --------------------------------------------------------------------- Plot */

const morphStep = z.object({ at: atSchema, fn: fnSchema });

export const plotSchema = z.object({
  fn: fnSchema,
  params: z.record(z.string(), trackSchema).default({}).describe('Parameters in the expression, which can change over time: { a: [{ at: 0, value: 1 }, { at: "cue:larger", value: 3 }] }'),
  domain: pair.optional().describe("Draw only within this x range"),
  at: atSchema.optional().describe("When the curve starts drawing (right after the axes by default)"),
  drawDuration: z.number().positive().default(1.6),
  color: colorEnum.default("info"),
  width: z.number().min(2).max(12).default(5),
  dashed: z.boolean().default(false),
  label: z.string().optional().describe('Curve label, e.g. "$f(x)=x^2$"'),
  labelX: z.number().optional().describe("x position of the label (near the right end by default)"),
  labelDir: dirSchema.default("ur"),
  morph: z.array(morphStep).default([]).describe("Morph: at `at` the curve bends smoothly into a new function"),
  outAt: atSchema.optional().describe("When the curve fades out"),
});

/** Samples y = f(x) into an SVG path, breaking at gaps and jumps. */
function samplePath(c: AxesCtx, f: (x: number) => number, a: number, b: number, n = 360): string {
  const span = c.view.y1 - c.view.y0;
  let d = "";
  let pen = false;
  let prevY = 0;
  for (let i = 0; i <= n; i++) {
    const x = a + ((b - a) * i) / n;
    const y = f(x);
    const ok = Number.isFinite(y) && y > c.view.y0 - span * 3 && y < c.view.y1 + span * 3;
    if (!ok || (pen && Math.abs(y - prevY) > span * 1.5)) {
      pen = false;
      if (!ok) continue;
    }
    const [px, py] = c.toPx(x, y);
    d += `${pen ? "L" : "M"}${px.toFixed(1)} ${py.toFixed(1)} `;
    pen = true;
    prevY = y;
  }
  return d;
}

/** The element's function for this frame: params evaluated now, `time` counted from the element's start. */
function plotFn(fn: Fn1 | ((...a: number[]) => number), params: Record<string, z.input<typeof trackSchema>>, c: AxesCtx, start: number, variable = "x", t = c.t) {
  return toFn1(fn as Fn1, variable, paramVals(c, params, start, t));
}

export function Plot(props: z.input<typeof plotSchema>) {
  const p = parseProps("Plot", plotSchema, props);
  const c = useAxes("Plot");
  const start = startOf(c, p.at);
  const k = lin(c.t, start, p.drawDuration);
  const base = plotFn(p.fn, p.params, c, start);
  const vals = paramVals(c, p.params, start);
  const morphs = p.morph.map((m) => ({ f: toFn1(m.fn as Fn1, "x", vals), e: ease(lin(c.t, resolveAt(m.at, c.timing), 1.4)) }));
  const f = (x: number) => {
    let y = base(x);
    for (const m of morphs) if (m.e > 0) y = y + (m.f(x) - y) * m.e;
    return y;
  };
  const out = p.outAt === undefined ? 0 : lin(c.t, resolveAt(p.outAt, c.timing), 0.5);
  if (k <= 0 || out >= 1) return null;
  const a = Math.max(c.view.x0, p.domain?.[0] ?? -Infinity);
  const b = Math.min(c.view.x1, p.domain?.[1] ?? Infinity);
  if (b <= a) return null;
  const d = samplePath(c, f, a, b);
  const drawing = k < 1;
  const lx = p.labelX ?? a + (b - a) * 0.88;
  const ly = f(lx);
  const tone = p.color as ColorName;
  return (
    <g opacity={1 - out}>
      <g clipPath={c.clip}>
        <path
          d={d}
          fill="none"
          stroke={color(tone)}
          strokeWidth={p.width}
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={drawing ? 1 : undefined}
          strokeDasharray={drawing ? `${ease(k)} 1` : p.dashed ? "16 12" : undefined}
        />
      </g>
      {p.label && Number.isFinite(ly) ? (
        <Tag x={c.toPx(lx, ly)[0]} y={c.toPx(lx, ly)[1]} dir={p.labelDir} tone={tone} size={36} opacity={Math.max(0, (k - 0.7) / 0.3)}>
          <RichText text={p.label} />
        </Tag>
      ) : null}
    </g>
  );
}

export const plotMeta: KitEntry = {
  name: "Plot",
  category: "plot",
  summary: "A curve y = f(x) in Axes: draws itself, parameters change over time (`params`), morphs into another function (`morph`).",
  useWhen: ["Function graphs; several functions on the same axes (one color each)", "Showing how a parameter reshapes the graph: a·sin(x) as a grows", "Morphing x² → x³"],
  avoidWhen: ["Parametric curves x(t), y(t): use Parametric"],
  example: "axes-calculus.tsx",
  schema: plotSchema,
};

/* --------------------------------------------------------------- Parametric */

export const parametricSchema = z.object({
  x: fnSchema.describe('x as a function of t, e.g. "cos(t)"'),
  y: fnSchema.describe('y as a function of t, e.g. "sin(t)"'),
  t: pair.default([0, 6.2832]).describe("Parameter range of t"),
  params: z.record(z.string(), trackSchema).default({}),
  at: atSchema.optional(),
  drawDuration: z.number().positive().default(2),
  color: colorEnum.default("warn"),
  width: z.number().min(2).max(12).default(5),
  fill: colorEnum.optional().describe("Fill the inside (closed curves)"),
  samples: z.number().int().min(20).max(2000).default(500),
});

export function Parametric(props: z.input<typeof parametricSchema>) {
  const p = parseProps("Parametric", parametricSchema, props);
  const c = useAxes("Parametric");
  const start = startOf(c, p.at);
  const k = lin(c.t, start, p.drawDuration);
  if (k <= 0) return null;
  const fx = plotFn(p.x, p.params, c, start, "t");
  const fy = plotFn(p.y, p.params, c, start, "t");
  const [t0, t1] = p.t;
  // The curve is traced: only the part up to the current parameter is drawn.
  const tEnd = t0 + (t1 - t0) * ease(k);
  let d = "";
  let pen = false;
  for (let i = 0; i <= p.samples; i++) {
    const s = t0 + ((tEnd - t0) * i) / p.samples;
    const x = fx(s);
    const y = fy(s);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      pen = false;
      continue;
    }
    const [px, py] = c.toPx(x, y);
    d += `${pen ? "L" : "M"}${px.toFixed(1)} ${py.toFixed(1)} `;
    pen = true;
  }
  const tone = color(p.color as ColorName);
  const head = c.toPx(fx(tEnd), fy(tEnd));
  return (
    <g clipPath={c.clip}>
      <path d={d} fill={p.fill ? color(p.fill as ColorName) : "none"} fillOpacity={p.fill ? 0.2 * k : 0} stroke={tone} strokeWidth={p.width} strokeLinecap="round" strokeLinejoin="round" />
      {k < 1 ? <circle cx={head[0]} cy={head[1]} r={p.width * 1.8} fill={tone} /> : null}
    </g>
  );
}

export const parametricMeta: KitEntry = {
  name: "Parametric",
  category: "plot",
  summary: "A parametric curve (x(t), y(t)) in Axes, traced as if by a moving pen.",
  useWhen: ["Circles, ellipses, spirals, Lissajous curves, trajectories", "Curves that are not graphs of functions"],
  avoidWhen: ["y = f(x): use Plot", "A simple circle: use Circle"],
  schema: parametricSchema,
};

/* -------------------------------------------------------------------- Point */

const coordSchema = z
  .union([trackSchema, z.string()])
  .describe('A number, keyframes [{ at, value }], or an expression of `time` (seconds since the Axes / Stage appeared) for continuous motion: "2*cos(time)"');

export const pointSchema = z.object({
  x: coordSchema.describe('x: a number, keyframes to make the point move, or an expression of time ("2*cos(time)")'),
  y: coordSchema.optional().describe("y; leave empty when using `on`"),
  on: fnSchema.optional().describe("The point stays on the curve y = on(x): only x needs to move"),
  params: z.record(z.string(), trackSchema).default({}),
  at: atSchema.optional(),
  color: colorEnum.default("accent"),
  size: z.number().min(4).max(30).default(11),
  label: z.string().optional().describe('Label, e.g. "$A$" or "$(2, 4)$"'),
  labelDir: dirSchema.default("ur"),
  coords: z.boolean().default(false).describe("The label shows the current (x, y), updating as the point moves"),
  guides: z.boolean().default(false).describe("Dashed guide lines down to both axes"),
  trail: z.number().min(0).max(60).default(0).describe("Trail: redraws the path the point travelled in the last N seconds (60 = the whole path). Only works when x/y are keyframes or expressions, not numbers computed with useTrack"),
  trailColor: colorEnum.optional(),
  outAt: atSchema.optional(),
});

export function Point(props: z.input<typeof pointSchema>) {
  const p = parseProps("Point", pointSchema, props);
  const c = useAxes("Point");
  const start = startOf(c, p.at, 0.8);
  const k = lin(c.t, start, 0.5);
  const out = p.outAt === undefined ? 0 : lin(c.t, resolveAt(p.outAt, c.timing), 0.4);
  if (k <= 0 || out >= 1) return null;
  if (p.on === undefined && p.y === undefined) throw new Error("<Point> needs `y` or `on`.");
  const coord = (v: z.output<typeof coordSchema>, tt: number) =>
    typeof v === "string" ? compileExpr(v, ["time", ...Object.keys(p.params)])(Math.max(0, tt - c.start), ...Object.values(evalParams(p.params, tt, c.timing))) : evalTrack(v, tt, c.timing);
  const posAt = (tt: number): [number, number] => {
    const x = coord(p.x, tt);
    const y = p.on !== undefined ? plotFn(p.on, p.params, c, start, "x", tt)(x) : coord(p.y!, tt);
    return [x, y];
  };
  const [x, y] = posAt(c.t);
  const [px, py] = c.toPx(x, y);
  const tone = p.color as ColorName;
  let trail: React.ReactNode = null;
  if (p.trail > 0) {
    // Re-sampled from the motion itself every frame, so any frame renders on its own.
    const from = Math.max(start, c.t - p.trail);
    const n = Math.min(400, Math.max(2, Math.ceil((c.t - from) * 40)));
    const pts: string[] = [];
    for (let i = 0; i <= n; i++) {
      const q = posAt(from + ((c.t - from) * i) / n);
      if (Number.isFinite(q[0]) && Number.isFinite(q[1])) pts.push(c.toPx(...q).map((v) => v.toFixed(1)).join(","));
    }
    trail = <polyline points={pts.join(" ")} fill="none" stroke={color((p.trailColor ?? p.color) as ColorName)} strokeOpacity={0.85} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />;
  }
  const pop = 1 + 0.5 * Math.sin(Math.PI * Math.min(1, k));
  const text = p.coords ? `$(${fmtNumber(x)};\\ ${fmtNumber(y)})$` : p.label;
  return (
    <g opacity={Math.min(1, k * 2) * (1 - out)}>
      {trail}
      {p.guides ? (
        <g stroke={color(tone)} strokeOpacity={0.55} strokeWidth={2.5} strokeDasharray="8 8">
          <line x1={px} y1={py} x2={px} y2={c.rawPx(0, Math.max(c.view.y0, Math.min(c.view.y1, 0)))[1]} />
          <line x1={px} y1={py} x2={c.rawPx(Math.max(c.view.x0, Math.min(c.view.x1, 0)), 0)[0]} y2={py} />
        </g>
      ) : null}
      <circle cx={px} cy={py} r={p.size * (k < 1 ? pop : 1)} fill={color(tone)} />
      <circle cx={px} cy={py} r={p.size + 5} fill="none" stroke={color("bg")} strokeOpacity={0.6} strokeWidth={3} />
      {text ? (
        <Tag x={px} y={py} dir={p.labelDir} tone={p.coords ? "text" : tone} size={34} opacity={k}>
          <RichText text={text} />
        </Tag>
      ) : null}
    </g>
  );
}

export const pointMeta: KitEntry = {
  name: "Point",
  category: "plot",
  summary: "A point in Axes with a label; `x` can move by keyframes, `on` keeps the point on a curve, `coords` shows live coordinates.",
  useWhen: ["Marking points, roots, extrema, intersections", "A point sliding along a graph with the narration", "Vertices in geometry (A, B, C)"],
  avoidWhen: ["More than ~8 points: use one Plot or group them"],
  example: "axes-calculus.tsx",
  schema: pointSchema,
};

/* ------------------------------------------------------------------- Vector */

export const vectorSchema = z.object({
  x: motionSchema.describe("x component: a number, keyframes, or an expression of time"),
  y: motionSchema.describe("y component"),
  from: pair.default([0, 0]).describe("Origin of the vector"),
  at: atSchema.optional(),
  color: colorEnum.default("accent"),
  label: z.string().optional().describe('E.g. "$\\\\vec v$"'),
  labelDir: dirSchema.optional(),
  width: z.number().min(2).max(12).default(6),
  components: z.boolean().default(false).describe("Show the x, y components as dashed lines"),
});

export function Vector(props: z.input<typeof vectorSchema>) {
  const p = parseProps("Vector", vectorSchema, props);
  const c = useAxes("Vector");
  const start = startOf(c, p.at, 0.8);
  const k = ease(lin(c.t, start, 0.7));
  const vx = evalMotion(p.x, c, start);
  const vy = evalMotion(p.y, c, start);
  const [fx, fy] = p.from;
  const a = c.toPx(fx, fy);
  const b = c.toPx(fx + vx, fy + vy);
  const corner = c.toPx(fx + vx, fy);
  const tone = p.color as ColorName;
  return (
    <g>
      {p.components && k >= 1 ? (
        <g stroke={color(tone)} strokeOpacity={0.6} strokeWidth={3} strokeDasharray="10 8">
          <line x1={a[0]} y1={a[1]} x2={corner[0]} y2={corner[1]} />
          <line x1={corner[0]} y1={corner[1]} x2={b[0]} y2={b[1]} />
        </g>
      ) : null}
      <ArrowShape from={a} to={b} tone={tone} k={k} width={p.width} label={p.label} labelDir={p.labelDir} />
    </g>
  );
}

export const vectorMeta: KitEntry = {
  name: "Vector",
  category: "plot",
  summary: "A vector arrow in Axes, growing from its origin; components can move by keyframes; follows the Axes `matrix` transformation.",
  useWhen: ["Vectors, vector addition (put `from` at the tip of the other), forces, velocities", "Linear transformations: vectors follow the matrix"],
  avoidWhen: ["Arrows between blocks: use Arrow or Diagram"],
  example: "axes-linear.tsx",
  schema: vectorSchema,
};

/* ------------------------------------------------------------------ Segment */

export const segmentSchema = z.object({
  from: pair,
  to: pair,
  at: atSchema.optional(),
  color: colorEnum.default("text"),
  width: z.number().min(1).max(12).default(4),
  dashed: z.boolean().default(false),
  extend: z.boolean().default(false).describe("Extend into a full line through the two points"),
  label: z.string().optional().describe("Label at the middle of the segment, e.g. the length \"$c$\""),
  labelDir: dirSchema.default("u"),
  duration: z.number().positive().default(0.7),
});

export function Segment(props: z.input<typeof segmentSchema>) {
  const p = parseProps("Segment", segmentSchema, props);
  const c = useAxes("Segment");
  const k = ease(lin(c.t, startOf(c, p.at, 0.7), p.duration));
  if (k <= 0) return null;
  let [x1, y1] = p.from;
  let [x2, y2] = p.to;
  if (p.extend) {
    const span = 4 * Math.max(c.view.x1 - c.view.x0, c.view.y1 - c.view.y0);
    const dx = x2 - x1;
    const dy = y2 - y1;
    const n = Math.hypot(dx, dy) || 1;
    [x1, y1, x2, y2] = [x1 - (dx / n) * span, y1 - (dy / n) * span, x2 + (dx / n) * span, y2 + (dy / n) * span];
  }
  const m = c.toPx((p.from[0] + p.to[0]) / 2, (p.from[1] + p.to[1]) / 2);
  const tone = p.color as ColorName;
  const line = <path d={linePath(c, [[x1, y1], [x1 + (x2 - x1) * k, y1 + (y2 - y1) * k]], false)} fill="none" stroke={color(tone)} strokeWidth={p.width} strokeLinecap="round" strokeDasharray={p.dashed ? "12 10" : undefined} />;
  return (
    <g>
      {p.extend ? <g clipPath={c.clip}>{line}</g> : line}
      {p.label ? (
        <Tag x={m[0]} y={m[1]} dir={p.labelDir} tone={tone} size={34} opacity={Math.max(0, (k - 0.6) / 0.4)}>
          <RichText text={p.label} />
        </Tag>
      ) : null}
    </g>
  );
}

export const segmentMeta: KitEntry = {
  name: "Segment",
  category: "plot",
  summary: "A segment (or a line with `extend`) between two coordinate points, drawing itself, with a label at its middle.",
  useWhen: ["Sides in geometry, altitudes, medians", "Secants through two points, connecting lines, distances"],
  avoidWhen: ["Closed polygons: use Polygon"],
  example: "axes-geometry.tsx",
  schema: segmentSchema,
};

/* ------------------------------------------------------------------ Polygon */

export const polygonSchema = z.object({
  points: z.array(pair).min(2).describe("Vertices [[x, y], …]"),
  closed: z.boolean().default(true),
  at: atSchema.optional(),
  color: colorEnum.default("info"),
  fill: z.union([colorEnum, z.literal("none")]).default("none").describe("Fill color inside (translucent)"),
  width: z.number().min(1).max(12).default(4),
  label: z.string().optional().describe("Label at the centroid, e.g. the area \"$S$\""),
  duration: z.number().positive().default(1.2),
});

export function Polygon(props: z.input<typeof polygonSchema>) {
  const p = parseProps("Polygon", polygonSchema, props);
  const c = useAxes("Polygon");
  const k = lin(c.t, startOf(c, p.at, 0.7), p.duration);
  if (k <= 0) return null;
  const d = linePath(c, p.points as [number, number][], p.closed);
  const cx = p.points.reduce((s, q) => s + q[0], 0) / p.points.length;
  const cy = p.points.reduce((s, q) => s + q[1], 0) / p.points.length;
  const [lx, ly] = c.toPx(cx, cy);
  const tone = p.color as ColorName;
  const fillK = Math.max(0, (k - 0.6) / 0.4);
  return (
    <g>
      <path
        d={d}
        fill={p.fill === "none" ? "none" : color(p.fill as ColorName)}
        fillOpacity={p.fill === "none" ? 0 : 0.22 * fillK}
        stroke={color(tone)}
        strokeWidth={p.width}
        strokeLinejoin="round"
        pathLength={k < 1 ? 1 : undefined}
        strokeDasharray={k < 1 ? `${ease(k)} 1` : undefined}
      />
      {p.label ? (
        <Tag x={lx} y={ly} dir="c" tone={tone} size={36} opacity={fillK}>
          <RichText text={p.label} />
        </Tag>
      ) : null}
    </g>
  );
}

export const polygonMeta: KitEntry = {
  name: "Polygon",
  category: "plot",
  summary: "A polygon (triangle, square…) by the coordinates of its vertices: the outline draws itself, then the inside is filled.",
  useWhen: ["Geometry: triangles, squares on the sides (Pythagoras), the parallelogram of a determinant"],
  avoidWhen: ["Area under a curve: use AreaUnder"],
  example: "axes-geometry.tsx",
  schema: polygonSchema,
};

/* ------------------------------------------------------------------- Circle */

export const circleSchema = z.object({
  center: pair.default([0, 0]),
  r: trackSchema.describe("Radius (coordinate units), can move by keyframes"),
  at: atSchema.optional(),
  color: colorEnum.default("info"),
  fill: z.union([colorEnum, z.literal("none")]).default("none"),
  width: z.number().min(1).max(12).default(4),
  dashed: z.boolean().default(false),
  duration: z.number().positive().default(1.2),
});

export function Circle(props: z.input<typeof circleSchema>) {
  const p = parseProps("Circle", circleSchema, props);
  const c = useAxes("Circle");
  const k = lin(c.t, startOf(c, p.at, 0.7), p.duration);
  if (k <= 0) return null;
  const r = evalTrack(p.r, c.t, c.timing);
  const n = 160;
  const end = 2 * Math.PI * ease(k);
  let d = "";
  for (let i = 0; i <= n; i++) {
    const a = (end * i) / n;
    const [px, py] = c.toPx(p.center[0] + r * Math.cos(a), p.center[1] + r * Math.sin(a));
    d += `${i ? "L" : "M"}${px.toFixed(1)} ${py.toFixed(1)} `;
  }
  if (k >= 1) d += "Z";
  const tone = p.color as ColorName;
  return (
    <path
      d={d}
      fill={p.fill === "none" ? "none" : color(p.fill as ColorName)}
      fillOpacity={p.fill === "none" ? 0 : 0.2 * k}
      stroke={color(tone)}
      strokeWidth={p.width}
      strokeDasharray={p.dashed ? "12 10" : undefined}
    />
  );
}

export const circleMeta: KitEntry = {
  name: "Circle",
  category: "plot",
  summary: "A circle from a center and radius in coordinates, drawn around once; the radius can move by keyframes.",
  useWhen: ["The unit circle, circumscribed circles, ε-neighbourhoods"],
  avoidWhen: ["Ellipses or other curves: use Parametric"],
  example: "axes-unit-circle.tsx",
  schema: circleSchema,
};

/* ---------------------------------------------------------------- AreaUnder */

export const areaUnderSchema = z.object({
  fn: fnSchema,
  params: z.record(z.string(), trackSchema).default({}),
  from: trackSchema.describe("Lower bound (can move)"),
  to: trackSchema.describe("Upper bound (can move)"),
  lower: fnSchema.optional().describe("Lower curve (area between two curves); the x axis by default"),
  at: atSchema.optional().describe("When the shading sweeps from left to right"),
  color: colorEnum.default("info"),
  opacity: z.number().min(0.05).max(0.8).default(0.3),
  label: z.string().optional().describe("Label in the middle of the region, e.g. \"$S$\""),
});

export function AreaUnder(props: z.input<typeof areaUnderSchema>) {
  const p = parseProps("AreaUnder", areaUnderSchema, props);
  const c = useAxes("AreaUnder");
  const k = ease(lin(c.t, startOf(c, p.at, 1.2), 1.3));
  if (k <= 0) return null;
  const st = startOf(c, p.at, 1.2);
  const f = plotFn(p.fn, p.params, c, st);
  const g = p.lower === undefined ? () => 0 : plotFn(p.lower, p.params, c, st);
  const a = evalTrack(p.from, c.t, c.timing);
  const b = a + (evalTrack(p.to, c.t, c.timing) - a) * k;
  const n = 140;
  const top: string[] = [];
  const bottom: string[] = [];
  for (let i = 0; i <= n; i++) {
    const x = a + ((b - a) * i) / n;
    const [tx, ty] = c.toPx(x, f(x));
    const [bx, by] = c.toPx(x, g(x));
    top.push(`${tx.toFixed(1)} ${ty.toFixed(1)}`);
    bottom.unshift(`${bx.toFixed(1)} ${by.toFixed(1)}`);
  }
  const mid = (a + b) / 2;
  const [lx, ly] = c.toPx(mid, (f(mid) + g(mid)) / 2);
  const tone = p.color as ColorName;
  return (
    <g>
      <g clipPath={c.clip}>
        <path d={`M${top.join(" L")} L${bottom.join(" L")} Z`} fill={color(tone)} fillOpacity={p.opacity} />
      </g>
      {p.label ? (
        <Tag x={lx} y={ly} dir="c" tone="text" size={38} opacity={k}>
          <RichText text={p.label} />
        </Tag>
      ) : null}
    </g>
  );
}

export const areaUnderMeta: KitEntry = {
  name: "AreaUnder",
  category: "plot",
  summary: "Shades the area under a curve (or between two curves) from `from` to `to`, sweeping from the left; the bounds can move by keyframes.",
  useWhen: ["Integrals, areas, probability under a density curve", "A moving upper bound to illustrate the accumulation function"],
  avoidWhen: ["Approximation by rectangles: use Riemann"],
  example: "axes-calculus.tsx",
  schema: areaUnderSchema,
};

/* ------------------------------------------------------------------ Riemann */

export const riemannSchema = z.object({
  fn: fnSchema,
  params: z.record(z.string(), trackSchema).default({}),
  from: z.number(),
  to: z.number(),
  n: trackSchema.describe('Number of rectangles; keyframes to refine: [{ at: 0, value: 4 }, { at: "cue:more", value: 16 }]'),
  rule: z.enum(["left", "right", "mid"]).default("left").describe("Take the height at the left edge, the right edge or the middle"),
  at: atSchema.optional(),
  color: colorEnum.default("info"),
  opacity: z.number().min(0.1).max(0.9).default(0.45),
});

export function Riemann(props: z.input<typeof riemannSchema>) {
  const p = parseProps("Riemann", riemannSchema, props);
  const c = useAxes("Riemann");
  const start = startOf(c, p.at, 1.2);
  if (c.t < start) return null;
  const f = plotFn(p.fn, p.params, c, start);
  const ph = trackPhase(p.n, c.t, c.timing, 1.1);
  const tone = color(p.color as ColorName);
  const rects = (n: number, grow: (i: number) => number, fade: number, key: string) => {
    const w = (p.to - p.from) / n;
    return Array.from({ length: n }, (_, i) => {
      const x0 = p.from + i * w;
      const xh = p.rule === "left" ? x0 : p.rule === "right" ? x0 + w : x0 + w / 2;
      const h = f(xh) * grow(i);
      const [ax, ay] = c.toPx(x0, 0);
      const [bx, by] = c.toPx(x0 + w, h);
      return (
        <rect
          key={`${key}${i}`}
          x={Math.min(ax, bx)}
          y={Math.min(ay, by)}
          width={Math.abs(bx - ax)}
          height={Math.abs(by - ay)}
          fill={tone}
          fillOpacity={p.opacity * fade}
          stroke={tone}
          strokeOpacity={fade}
          strokeWidth={n > 40 ? 1 : 2}
        />
      );
    });
  };
  const n1 = Math.max(1, Math.round(ph.to));
  const n0 = Math.max(1, Math.round(ph.from));
  // First appearance: bars grow from the axis one after another.
  const intro = (i: number) => ease(Math.max(0, Math.min(1, ((c.t - start) - (i / n1) * 0.8) / 0.5)));
  const changing = ph.k < 1 && n0 !== n1;
  const grow = (i: number) => (changing ? ease(Math.max(0, Math.min(1, ph.k * 1.6 - (i / n1) * 0.6))) : intro(i));
  return (
    <g clipPath={c.clip}>
      {changing ? rects(n0, () => 1, 1 - ease(ph.k), "o") : null}
      {rects(n1, grow, 1, "n")}
    </g>
  );
}

export const riemannMeta: KitEntry = {
  name: "Riemann",
  category: "plot",
  summary: "Riemann sum: rectangles under the curve grow from the axis; `n` keyframes refine them so the sum visibly approaches the area.",
  useWhen: ["Definition of the integral, approximating areas, limits as n → ∞"],
  avoidWhen: ["Just shading an area: use AreaUnder"],
  example: "axes-riemann.tsx",
  schema: riemannSchema,
};

/* ------------------------------------------------------------------ Tangent */

export const tangentSchema = z.object({
  fn: fnSchema,
  params: z.record(z.string(), trackSchema).default({}),
  x: trackSchema.describe("x of the point of tangency; keyframes make the tangent slide along the curve"),
  at: atSchema.optional(),
  length: z.number().min(80).max(1400).default(440).describe("Length of the tangent segment (px)"),
  color: colorEnum.default("warn"),
  slope: z.boolean().default(false).describe("Show a slope label next to the point, updating continuously"),
  slopeLabel: z.string().default("f'(x)").describe("Name of the slope in the label (TeX)"),
});

export function Tangent(props: z.input<typeof tangentSchema>) {
  const p = parseProps("Tangent", tangentSchema, props);
  const c = useAxes("Tangent");
  const start = startOf(c, p.at, 1.2);
  const k = ease(lin(c.t, start, 0.7));
  if (k <= 0) return null;
  const f = plotFn(p.fn, p.params, c, start);
  const x = evalTrack(p.x, c.t, c.timing);
  const y = f(x);
  const h = 1e-4 * Math.max(1, Math.abs(x));
  const m = (f(x + h) - f(x - h)) / (2 * h);
  const a = c.toPx(x, y);
  const b = c.toPx(x + 1, y + m);
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const n = Math.hypot(dx, dy) || 1;
  const L = (p.length / 2) * k;
  const tone = p.color as ColorName;
  return (
    <g>
      <g clipPath={c.clip}>
        <line x1={a[0] - (dx / n) * L} y1={a[1] - (dy / n) * L} x2={a[0] + (dx / n) * L} y2={a[1] + (dy / n) * L} stroke={color(tone)} strokeWidth={5} strokeLinecap="round" />
      </g>
      <circle cx={a[0]} cy={a[1]} r={10} fill={color(tone)} />
      {p.slope ? (
        <Tag x={a[0]} y={a[1]} dir={m >= 0 ? "dr" : "ur"} tone={tone} size={34} opacity={k}>
          <span style={{ fontFamily: fonts.mono }}>
            <RichText text={`$${p.slopeLabel} = ${fmtNumber(m)}$`} />
          </span>
        </Tag>
      ) : null}
    </g>
  );
}

export const tangentMeta: KitEntry = {
  name: "Tangent",
  category: "plot",
  summary: "The tangent to a curve at x (x can slide by keyframes), with a live slope label.",
  useWhen: ["Derivatives, instantaneous slope, extrema (horizontal tangent)", "Sliding the tangent along the curve while the slope changes"],
  avoidWhen: ["A secant through two points: use Segment extend"],
  example: "axes-calculus.tsx",
  schema: tangentSchema,
};

/* -------------------------------------------------------------------- Label */

export const labelSchema = z.object({
  x: trackSchema,
  y: trackSchema,
  text: z.string().describe("Text, supports $…$"),
  at: atSchema.optional(),
  color: colorEnum.default("text"),
  size: z.number().min(24).max(96).default(36),
  dir: dirSchema.default("c"),
  outAt: atSchema.optional(),
});

export function Label(props: z.input<typeof labelSchema>) {
  const p = parseProps("Label", labelSchema, props);
  const c = useAxes("Label");
  const k = ease(lin(c.t, startOf(c, p.at, 0.8), 0.5));
  const out = p.outAt === undefined ? 0 : lin(c.t, resolveAt(p.outAt, c.timing), 0.4);
  if (k <= 0 || out >= 1) return null;
  const [px, py] = c.toPx(evalTrack(p.x, c.t, c.timing), evalTrack(p.y, c.t, c.timing));
  return (
    <Tag x={px} y={py} dir={p.dir} tone={p.color as ColorName} size={p.size} opacity={k * (1 - out)}>
      <RichText text={p.text} />
    </Tag>
  );
}

export const labelMeta: KitEntry = {
  name: "Label",
  category: "plot",
  summary: "Text or a formula placed at a coordinate in Axes (follows zoom and transformations).",
  useWhen: ["A note next to part of the picture: \"$S = \\pi r^2$\", \"increasing\", \"decreasing\""],
  avoidWhen: ["Labels of points, vectors, segments: use their label prop", "A large formula outside the picture: use Formula"],
  schema: labelSchema,
};

/* -------------------------------------------------------------- VectorField */

type Fn2 = (x: number, y: number) => number;
const fn2Schema = z
  .union([z.string(), z.custom<Fn2>((v) => typeof v === "function", { message: "must be an expression string or a function" })])
  .describe('Expression in x, y ("-y", "x - y^2") or a function (x, y) => …');
const toFn2 = (f: string | Fn2): Fn2 => {
  if (typeof f === "function") return f;
  const g = compileExpr(f, ["x", "y"]);
  return (x, y) => g(x, y);
};

/** Deterministic pseudo-random in [0, 1). */
const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

export const vectorFieldSchema = z.object({
  fx: fn2Schema.describe('x component of the field, in x, y. E.g. "-y"'),
  fy: fn2Schema.describe('y component, e.g. "x"'),
  step: z.number().positive().optional().describe("Spacing between arrows (coordinate units); chosen automatically by default"),
  at: atSchema.optional(),
  color: colorEnum.default("info"),
  particles: atSchema.optional().describe("From this moment, release particles that drift with the field (flow)"),
  count: z.number().int().min(10).max(300).default(120).describe("Number of particles"),
  speed: z.number().positive().default(1),
});

export function VectorField(props: z.input<typeof vectorFieldSchema>) {
  const p = parseProps("VectorField", vectorFieldSchema, props);
  const c = useAxes("VectorField");
  const start = startOf(c, p.at, 0.6);
  const fx = useMemo(() => toFn2(p.fx), [p.fx]);
  const fy = useMemo(() => toFn2(p.fy), [p.fy]);
  if (c.t < start) return null;
  const { x0, x1, y0, y1 } = c.view;
  const step = p.step ?? niceStep(x1 - x0, 14);
  const cells: { x: number; y: number; vx: number; vy: number; m: number }[] = [];
  let maxM = 1e-9;
  for (let x = Math.ceil(x0 / step) * step; x <= x1 + 1e-9; x += step) {
    for (let y = Math.ceil(y0 / step) * step; y <= y1 + 1e-9; y += step) {
      const vx = fx(x, y);
      const vy = fy(x, y);
      const m = Math.hypot(vx, vy);
      if (!Number.isFinite(m)) continue;
      cells.push({ x, y, vx, vy, m });
      maxM = Math.max(maxM, m);
    }
  }
  const tone = color(p.color as ColorName);
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const R = Math.hypot(x1 - x0, y1 - y0) / 2;
  const arrows = cells.map((q, i) => {
    // Arrows grow outward from the centre.
    const d = Math.hypot(q.x - cx, q.y - cy) / R;
    const k = ease(Math.max(0, Math.min(1, (c.t - start - d * 0.9) / 0.5)));
    if (k <= 0 || q.m < 1e-9) return null;
    const len = (0.42 + 0.48 * (q.m / maxM)) * step * k;
    const ux = q.vx / q.m;
    const uy = q.vy / q.m;
    const a = c.toPx(q.x - (ux * len) / 2, q.y - (uy * len) / 2);
    const b = c.toPx(q.x + (ux * len) / 2, q.y + (uy * len) / 2);
    const ddx = b[0] - a[0];
    const ddy = b[1] - a[1];
    const n = Math.hypot(ddx, ddy) || 1;
    const hx = (ddx / n) * 11;
    const hy = (ddy / n) * 11;
    const op = 0.35 + 0.65 * (q.m / maxM);
    return (
      <g key={i} opacity={op}>
        <line x1={a[0]} y1={a[1]} x2={b[0] - hx * 0.6} y2={b[1] - hy * 0.6} stroke={tone} strokeWidth={3} strokeLinecap="round" />
        <path d={`M${b[0]} ${b[1]} L${b[0] - hx - hy * 0.55} ${b[1] - hy + hx * 0.55} L${b[0] - hx + hy * 0.55} ${b[1] - hy - hx * 0.55} Z`} fill={tone} />
      </g>
    );
  });

  // Particles: each one is re-integrated from its seed every frame, so any frame renders on its own.
  let dots: React.ReactNode = null;
  if (p.particles !== undefined) {
    const ps = resolveAt(p.particles, c.timing);
    if (c.t >= ps) {
      const life = 3;
      const dt = 1 / 30;
      const scale = (p.speed * (x1 - x0)) / (6 * maxM);
      dots = Array.from({ length: p.count }, (_, i) => {
        const phase = hash(i + 0.5) * life;
        const age = (c.t - ps + phase) % life;
        const cycle = Math.floor((c.t - ps + phase) / life);
        let x = x0 + hash(i * 3.1 + cycle * 17.3) * (x1 - x0);
        let y = y0 + hash(i * 7.7 + cycle * 5.9) * (y1 - y0);
        const trail: [number, number][] = [];
        const steps = Math.floor(age / dt);
        for (let s = 0; s < steps; s++) {
          const vx = fx(x, y);
          const vy = fy(x, y);
          if (!Number.isFinite(vx) || !Number.isFinite(vy)) break;
          x += vx * scale * dt;
          y += vy * scale * dt;
          if (s >= steps - 8) trail.push(c.toPx(x, y));
        }
        if (trail.length < 2) return null;
        const fade = Math.min(1, age / 0.4, (life - age) / 0.5);
        return (
          <polyline
            key={i}
            points={trail.map((q) => `${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(" ")}
            fill="none"
            stroke={color("text")}
            strokeOpacity={0.85 * fade}
            strokeWidth={4}
            strokeLinecap="round"
          />
        );
      });
    }
  }
  return (
    <g clipPath={c.clip}>
      {arrows}
      {dots}
    </g>
  );
}

export const vectorFieldMeta: KitEntry = {
  name: "VectorField",
  category: "plot",
  summary: "A vector field (fx, fy) in Axes: a grid of arrows growing out from the center, length/brightness by magnitude; `particles` release particles that drift with the flow.",
  useWhen: ["Differential equations, force fields, flows, gradients, div/curl"],
  avoidWhen: ["Just a few separate vectors: use Vector"],
  example: "axes-field.tsx",
  schema: vectorFieldSchema,
};

/* -------------------------------------------------------------------- Angle */

export const angleSchema = z.object({
  vertex: pair.describe("Vertex of the angle"),
  from: pair.describe("A point on the first side"),
  to: pair.describe("A point on the second side"),
  at: atSchema.optional(),
  radius: z.number().min(20).max(200).default(56).describe("Arc radius (px)"),
  color: colorEnum.default("warn"),
  label: z.string().optional().describe('E.g. "$\\\\alpha$"'),
  right: z.boolean().optional().describe("Draw a right-angle mark (detected automatically when the angle ≈ 90°)"),
});

export function Angle(props: z.input<typeof angleSchema>) {
  const p = parseProps("Angle", angleSchema, props);
  const c = useAxes("Angle");
  const k = ease(lin(c.t, startOf(c, p.at, 1), 0.6));
  if (k <= 0) return null;
  const v = c.toPx(...p.vertex);
  const a = c.toPx(...p.from);
  const b = c.toPx(...p.to);
  let a1 = Math.atan2(a[1] - v[1], a[0] - v[0]);
  let a2 = Math.atan2(b[1] - v[1], b[0] - v[0]);
  let diff = a2 - a1;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  const r = p.radius;
  const tone = color(p.color as ColorName);
  const isRight = p.right ?? Math.abs(Math.abs(diff) - Math.PI / 2) < 0.02;
  const mid = a1 + diff / 2;
  let shape: React.ReactNode;
  if (isRight) {
    const s = r * 0.6;
    const u = [Math.cos(a1) * s, Math.sin(a1) * s];
    const w = [Math.cos(a2) * s, Math.sin(a2) * s];
    shape = <path d={`M${v[0] + u[0]} ${v[1] + u[1]} L${v[0] + u[0] + w[0]} ${v[1] + u[1] + w[1]} L${v[0] + w[0]} ${v[1] + w[1]}`} fill="none" stroke={tone} strokeWidth={3.5} opacity={k} />;
  } else {
    a2 = a1 + diff * k;
    const large = Math.abs(diff * k) > Math.PI ? 1 : 0;
    const sweep = diff > 0 ? 1 : 0;
    shape = (
      <path
        d={`M${v[0]} ${v[1]} L${v[0] + Math.cos(a1) * r} ${v[1] + Math.sin(a1) * r} A${r} ${r} 0 ${large} ${sweep} ${v[0] + Math.cos(a2) * r} ${v[1] + Math.sin(a2) * r} Z`}
        fill={tone}
        fillOpacity={0.18}
        stroke={tone}
        strokeWidth={3.5}
      />
    );
  }
  return (
    <g>
      {shape}
      {p.label ? (
        <Tag x={v[0] + Math.cos(mid) * (r + 34)} y={v[1] + Math.sin(mid) * (r + 34)} dir="c" tone={p.color as ColorName} size={34} opacity={k}>
          <RichText text={p.label} />
        </Tag>
      ) : null}
    </g>
  );
}

export const angleMeta: KitEntry = {
  name: "Angle",
  category: "plot",
  summary: "An angle mark at a vertex (a translucent arc, or a small square for a right angle) with a label.",
  useWhen: ["Geometry: angles of a triangle, right angles, the rotation angle θ on the unit circle"],
  avoidWhen: ["When there are no two clear sides to mark an angle between"],
  example: "axes-geometry.tsx",
  schema: angleSchema,
};

/* -------------------------------------------------------------------- Group */

export const groupSchema = z.object({
  x: motionSchema.default(0).describe("Horizontal shift (coordinate units)"),
  y: motionSchema.default(0).describe("Vertical shift"),
  rotate: motionSchema.default(0).describe('Rotation (degrees, counterclockwise) around `about`; "90*time" spins steadily'),
  scale: motionSchema.default(1).describe("Scale up / down around `about`"),
  about: pair.default([0, 0]).describe("Center of rotation / scaling"),
  at: atSchema.optional().describe("When the whole group appears (children still follow their own `at`)"),
  outAt: atSchema.optional().describe("When the whole group fades out"),
});

/** Moves, rotates and scales its children together: a rigid body, a rotating triangle, a swinging pendulum. */
export function Group(props: z.input<typeof groupSchema> & { children?: React.ReactNode }) {
  const p = parseProps("Group", groupSchema, props);
  const c = useAxes("Group");
  const start = p.at === undefined ? c.start : resolveAt(p.at, c.timing);
  const k = p.at === undefined ? 1 : ease(lin(c.t, start, 0.5));
  const out = p.outAt === undefined ? 0 : lin(c.t, resolveAt(p.outAt, c.timing), 0.5);
  if (k <= 0 || out >= 1) return null;
  const dx = evalMotion(p.x, c, start);
  const dy = evalMotion(p.y, c, start);
  const a = (evalMotion(p.rotate, c, start) * Math.PI) / 180;
  const s = evalMotion(p.scale, c, start, c.t, 1);
  const [ox, oy] = p.about;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const inner: AxesCtx = {
    ...c,
    toPx: (x, y) => {
      const u = (x - ox) * s;
      const v = (y - oy) * s;
      return c.toPx(ox + u * cos - v * sin + dx, oy + u * sin + v * cos + dy);
    },
  };
  return (
    <g opacity={k * (1 - out)}>
      <Ctx.Provider value={inner}>{p.children}</Ctx.Provider>
    </g>
  );
}

export const groupMeta: KitEntry = {
  name: "Group",
  category: "plot",
  summary: "Groups coordinate objects, then shifts / rotates / scales the whole group by keyframes or by `time`: a sliding body, a rotating triangle, a swinging pendulum, a rolling wheel.",
  useWhen: ["Geometric transformations: translating, rotating, scaling a shape", "Physics: a block sliding down a slope, a pendulum (rotate=\"25*sin(3*time)\"), steady rotation", "Moving a cluster (shape + label) together"],
  avoidWhen: ["Transforming the whole plane: use the Axes matrix / warp"],
  children: "Coordinate objects (Polygon, Segment, Circle, Point, Label, Path, Spring…)",
  example: "stage-physics.tsx",
  schema: groupSchema,
};

/* ------------------------------------------------------------------- Secant */

export const secantSchema = z.object({
  fn: fnSchema,
  params: z.record(z.string(), trackSchema).default({}),
  x1: trackSchema.describe("x of the first point"),
  x2: trackSchema.describe("x of the second point; keyframes bring it close to x1 (Δx → 0) so the secant becomes the tangent"),
  at: atSchema.optional(),
  color: colorEnum.default("warn"),
  riseRun: z.boolean().default(true).describe("Draw the Δx (horizontal) and Δy (vertical) sides of the slope triangle"),
  dxLabel: z.string().default("$\\Delta x$"),
  dyLabel: z.string().default("$\\Delta y$"),
  slope: z.boolean().default(false).describe("Live Δy/Δx slope label, updating as the point moves"),
  extend: z.boolean().default(true).describe("Extend into a full line through the two points"),
});

export function Secant(props: z.input<typeof secantSchema>) {
  const p = parseProps("Secant", secantSchema, props);
  const c = useAxes("Secant");
  const start = startOf(c, p.at, 1);
  const k = ease(lin(c.t, start, 0.8));
  if (k <= 0) return null;
  const f = plotFn(p.fn, p.params, c, start);
  const x1 = evalTrack(p.x1, c.t, c.timing);
  const x2 = evalTrack(p.x2, c.t, c.timing);
  const y1 = f(x1);
  const y2 = f(x2);
  const tone = p.color as ColorName;
  // Slope of the secant; once the points meet, the tangent slope.
  const h = 1e-4 * Math.max(1, Math.abs(x1));
  const m = Math.abs(x2 - x1) < 1e-6 ? (f(x1 + h) - f(x1 - h)) / (2 * h) : (y2 - y1) / (x2 - x1);
  const span = 4 * Math.max(c.view.x1 - c.view.x0, c.view.y1 - c.view.y0);
  const n = Math.hypot(1, m);
  const ends: [number, number][] = p.extend ? [[x1 - span / n, y1 - (span * m) / n], [x1 + span / n, y1 + (span * m) / n]] : [[x1, y1], [x2, y2]];
  const rr = Math.max(0, (k - 0.5) / 0.5);
  const A = c.toPx(x1, y1);
  const B = c.toPx(x2, y2);
  const C = c.toPx(x2, y1);
  return (
    <g>
      <g clipPath={c.clip} opacity={k}>
        <path d={linePath(c, ends, false)} stroke={color(tone)} strokeWidth={5} strokeLinecap="round" fill="none" />
      </g>
      {p.riseRun && rr > 0 && Math.abs(B[0] - A[0]) > 6 ? (
        <g opacity={rr}>
          <line x1={A[0]} y1={A[1]} x2={C[0]} y2={C[1]} stroke={color("ok")} strokeWidth={4} strokeDasharray="10 8" />
          <line x1={C[0]} y1={C[1]} x2={B[0]} y2={B[1]} stroke={color("err")} strokeWidth={4} strokeDasharray="10 8" />
          {Math.abs(C[0] - A[0]) > 50 ? (
            <Tag x={(A[0] + C[0]) / 2} y={C[1]} dir={y2 >= y1 ? "d" : "u"} tone="ok" size={32}>
              <RichText text={p.dxLabel} />
            </Tag>
          ) : null}
          {Math.abs(B[1] - C[1]) > 40 ? (
            <Tag x={C[0]} y={(C[1] + B[1]) / 2} dir={x2 >= x1 ? "r" : "l"} tone="err" size={32}>
              <RichText text={p.dyLabel} />
            </Tag>
          ) : null}
        </g>
      ) : null}
      <circle cx={A[0]} cy={A[1]} r={10} fill={color(tone)} opacity={k} />
      <circle cx={B[0]} cy={B[1]} r={10} fill={color(tone)} opacity={k} />
      {p.slope ? (
        <Tag x={A[0]} y={A[1]} dir={m >= 0 ? "ul" : "dl"} tone={tone} size={34} opacity={rr}>
          <RichText text={`$\\frac{\\Delta y}{\\Delta x} = ${fmtNumber(m)}$`} />
        </Tag>
      ) : null}
    </g>
  );
}

export const secantMeta: KitEntry = {
  name: "Secant",
  category: "plot",
  summary: "A secant through two points of a curve, with its Δx, Δy triangle and a live slope label; let x2 move to x1 to watch the secant become the tangent.",
  useWhen: ["Definition of the derivative: Δx → 0", "Average rate of change over an interval", "Slope of the line through two points"],
  avoidWhen: ["Just the tangent: use Tangent"],
  example: "axes-derivative.tsx",
  schema: secantSchema,
};

/* ------------------------------------------------------------------- Region */

const rangeTrack = z.tuple([trackSchema, trackSchema]);

export const regionSchema = z.object({
  x: rangeTrack.optional().describe("x range [a, b] (each end can move by keyframes); empty = the full width"),
  y: rangeTrack.optional().describe("y range [c, d]; empty = the full height"),
  at: atSchema.optional(),
  outAt: atSchema.optional(),
  color: colorEnum.default("info"),
  opacity: z.number().min(0.05).max(0.9).default(0.18),
  border: z.boolean().default(true).describe("Dashed outline"),
  label: z.string().optional(),
  labelDir: dirSchema.default("c"),
});

export function Region(props: z.input<typeof regionSchema>) {
  const p = parseProps("Region", regionSchema, props);
  const c = useAxes("Region");
  const k = ease(lin(c.t, startOf(c, p.at, 0.8), 0.6));
  const out = p.outAt === undefined ? 0 : lin(c.t, resolveAt(p.outAt, c.timing), 0.5);
  if (k <= 0 || out >= 1) return null;
  const big = 4 * Math.max(c.view.x1 - c.view.x0, c.view.y1 - c.view.y0);
  const [x0, x1] = p.x ? [evalTrack(p.x[0], c.t, c.timing), evalTrack(p.x[1], c.t, c.timing)] : [c.view.x0 - big, c.view.x1 + big];
  const [y0, y1] = p.y ? [evalTrack(p.y[0], c.t, c.timing), evalTrack(p.y[1], c.t, c.timing)] : [c.view.y0 - big, c.view.y1 + big];
  const d = linePath(c, [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], true);
  const tone = p.color as ColorName;
  const cx = p.x ? (x0 + x1) / 2 : (c.view.x0 + c.view.x1) / 2;
  const cy = p.y ? (y0 + y1) / 2 : (c.view.y0 + c.view.y1) / 2;
  const [lx, ly] = c.toPx(cx, cy);
  return (
    <g opacity={k * (1 - out)}>
      <g clipPath={c.clip}>
        <path d={d} fill={color(tone)} fillOpacity={p.opacity} stroke={p.border ? color(tone) : "none"} strokeWidth={3} strokeDasharray="12 10" />
      </g>
      {p.label ? (
        <Tag x={lx} y={ly} dir={p.labelDir} tone={tone} size={34}>
          <RichText text={p.label} />
        </Tag>
      ) : null}
    </g>
  );
}

export const regionMeta: KitEntry = {
  name: "Region",
  category: "plot",
  summary: "A translucent band or rectangle in coordinates (x ∈ [a, b], y ∈ [c, d]); its ends can shrink by keyframes.",
  useWhen: ["ε–δ limits: the ε band shrinks", "Solution regions of inequalities, confidence intervals", "Box-shaped things on a Stage (blocks, walls, ground, water)"],
  avoidWhen: ["Area under a curve: use AreaUnder"],
  example: "stage-physics.tsx",
  schema: regionSchema,
};

/* ------------------------------------------------------------- BraceBetween */

export const braceBetweenSchema = z.object({
  from: pair,
  to: pair,
  label: z.string().optional(),
  at: atSchema.optional(),
  color: colorEnum.default("accent"),
  flip: z.boolean().default(false).describe("Flip the side of the brace (default: to the right going from from to to, i.e. below when going left to right)"),
  offset: z.number().min(0).max(80).default(12).describe("Distance from the segment to the brace (px)"),
});

export function BraceBetween(props: z.input<typeof braceBetweenSchema>) {
  const p = parseProps("BraceBetween", braceBetweenSchema, props);
  const c = useAxes("BraceBetween");
  const k = ease(lin(c.t, startOf(c, p.at, 1), 0.6));
  if (k <= 0) return null;
  let a = c.toPx(...p.from);
  let b = c.toPx(...p.to);
  if (!p.flip) [a, b] = [b, a];
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const nx = (b[1] - a[1]) / L;
  const ny = -(b[0] - a[0]) / L;
  const sh = (q: [number, number]): [number, number] => [q[0] + nx * p.offset, q[1] + ny * p.offset];
  const br = bracePath(sh(a), sh(b), 26);
  const tone = p.color as ColorName;
  const dir: Dir = Math.abs(nx) > Math.abs(ny) ? (nx > 0 ? "r" : "l") : ny > 0 ? "d" : "u";
  return (
    <g>
      <path d={br.d} fill="none" stroke={color(tone)} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={`${k} 1`} />
      {p.label ? (
        <Tag x={br.tip[0]} y={br.tip[1]} dir={dir} tone={tone} size={34} opacity={Math.max(0, (k - 0.5) / 0.5)}>
          <RichText text={p.label} />
        </Tag>
      ) : null}
    </g>
  );
}

export const braceBetweenMeta: KitEntry = {
  name: "BraceBetween",
  category: "plot",
  summary: "A curly brace between two coordinate points, with a label: a side length, Δx, \"n units\".",
  useWhen: ["Marking the length of a side or a segment in a figure", "Pointing out Δx, a height h, a radius, a wavelength λ"],
  avoidWhen: ["A brace under an HTML block (formula, array): use Brace"],
  example: "panels-problem.tsx",
  schema: braceBetweenSchema,
};

/* ------------------------------------------------------------------ Scatter */

export const scatterSchema = z.object({
  points: z.array(pair).min(1).max(400).describe("Data points [[x, y], …]"),
  at: atSchema.optional(),
  over: z.number().min(0).default(1.2).describe("Points appear one after another over this many seconds"),
  color: colorEnum.default("info"),
  size: z.number().min(3).max(20).default(9),
  connect: z.boolean().default(false).describe("Connect the points into a line (line chart: temperature by month, population by year)"),
  fit: atSchema.optional().describe("When to draw the linear regression line (line of best fit)"),
  fitColor: colorEnum.default("accent"),
  label: z.string().optional().describe("Label of the data series, placed next to the last point"),
});

export function Scatter(props: z.input<typeof scatterSchema>) {
  const p = parseProps("Scatter", scatterSchema, props);
  const c = useAxes("Scatter");
  const start = startOf(c, p.at, 0.6);
  if (c.t < start) return null;
  const pts = p.points as [number, number][];
  const n = pts.length;
  const tone = color(p.color as ColorName);
  const shown = (i: number) => ease(lin(c.t, start + (n > 1 ? (p.over * i) / (n - 1) : 0), 0.35));
  let line: React.ReactNode = null;
  if (p.connect) {
    const k = lin(c.t, start, p.over + 0.35);
    line = <path d={linePath(c, pts, false, k)} fill="none" stroke={tone} strokeWidth={4} strokeLinejoin="round" strokeLinecap="round" />;
  }
  let fit: React.ReactNode = null;
  if (p.fit !== undefined && n >= 2) {
    const fk = ease(lin(c.t, resolveAt(p.fit, c.timing), 1));
    if (fk > 0) {
      const mx = pts.reduce((s, q) => s + q[0], 0) / n;
      const my = pts.reduce((s, q) => s + q[1], 0) / n;
      const sxx = pts.reduce((s, q) => s + (q[0] - mx) ** 2, 0) || 1;
      const b = pts.reduce((s, q) => s + (q[0] - mx) * (q[1] - my), 0) / sxx;
      const xa = c.view.x0;
      const xb = xa + (c.view.x1 - xa) * fk;
      fit = (
        <g clipPath={c.clip}>
          <path d={linePath(c, [[xa, my + b * (xa - mx)], [xb, my + b * (xb - mx)]], false)} stroke={color(p.fitColor as ColorName)} strokeWidth={5} strokeLinecap="round" fill="none" />
        </g>
      );
    }
  }
  const last = c.toPx(...pts[n - 1]);
  return (
    <g>
      {line}
      {pts.map((q, i) => {
        const k = shown(i);
        if (k <= 0) return null;
        const [x, y] = c.toPx(...q);
        return <circle key={i} cx={x} cy={y} r={p.size * (0.4 + 0.6 * k)} fill={tone} fillOpacity={0.9 * k} stroke={color("bg")} strokeWidth={2} />;
      })}
      {fit}
      {p.label ? (
        <Tag x={last[0]} y={last[1]} dir="r" tone={p.color as ColorName} size={32} opacity={shown(n - 1)}>
          <RichText text={p.label} />
        </Tag>
      ) : null}
    </g>
  );
}

export const scatterMeta: KitEntry = {
  name: "Scatter",
  category: "plot",
  summary: "Data as points in Axes: points appear in turn, `connect` makes a line chart, `fit` draws the regression line.",
  useWhen: ["Real data: temperature by month, population by year, experimental results", "Correlation, linear regression", "Several data series to compare (one Scatter per series, one color each)"],
  avoidWhen: ["A function with a formula: use Plot", "Comparing a few separate numbers: use BarChart"],
  example: "chart-climate.tsx",
  schema: scatterSchema,
};

/* ---------------------------------------------------------------- Epicycles */

export const epicyclesSchema = z.object({
  terms: z
    .array(z.object({ freq: z.number().describe("Turns per turn of the base circle (can be negative)"), r: z.number().positive(), phase: z.number().default(0).describe("Starting phase (radians)") }))
    .min(1)
    .max(40)
    .describe("Circles chained tip to tail (Fourier series)"),
  center: pair.default([0, 0]),
  speed: z.number().positive().default(0.15).describe("Base turns per second"),
  show: trackSchema.optional().describe("Number of circles in use; keyframes add terms one by one so the shape gets closer"),
  at: atSchema.optional(),
  color: colorEnum.default("accent"),
  trail: z.number().min(0).max(60).default(60).describe("Trail length (seconds)"),
});

export function Epicycles(props: z.input<typeof epicyclesSchema>) {
  const p = parseProps("Epicycles", epicyclesSchema, props);
  const c = useAxes("Epicycles");
  const start = startOf(c, p.at, 0.6);
  const k = ease(lin(c.t, start, 0.6));
  if (k <= 0) return null;
  const count = Math.max(1, Math.min(p.terms.length, Math.round(p.show === undefined ? p.terms.length : evalTrack(p.show, c.t, c.timing))));
  const terms = p.terms.slice(0, count);
  const chain = (tt: number) => {
    const th = 2 * Math.PI * p.speed * Math.max(0, tt - start);
    const pts: [number, number][] = [p.center as [number, number]];
    let [x, y] = p.center;
    for (const q of terms) {
      x += q.r * Math.cos(q.freq * th + q.phase);
      y += q.r * Math.sin(q.freq * th + q.phase);
      pts.push([x, y]);
    }
    return pts;
  };
  const now = chain(c.t);
  const from = Math.max(start, c.t - p.trail);
  const n = Math.min(600, Math.max(2, Math.ceil((c.t - from) * 60)));
  const trail = Array.from({ length: n + 1 }, (_, i) => c.toPx(...chain(from + ((c.t - from) * i) / n)[terms.length]));
  const tone = color(p.color as ColorName);
  return (
    <g opacity={k}>
      {now.slice(0, -1).map((q, i) => {
        const [cx, cy] = c.toPx(...q);
        const [ex, ey] = c.toPx(...now[i + 1]);
        const r = terms[i].r * c.unit[0];
        return (
          <g key={i}>
            <circle cx={cx} cy={cy} r={r} fill="none" stroke={color("muted")} strokeOpacity={0.45} strokeWidth={2} />
            <line x1={cx} y1={cy} x2={ex} y2={ey} stroke={color("text")} strokeOpacity={0.8} strokeWidth={3} strokeLinecap="round" />
          </g>
        );
      })}
      <polyline points={trail.map((q) => `${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(" ")} fill="none" stroke={tone} strokeWidth={4} strokeLinejoin="round" />
      <circle cx={trail[trail.length - 1][0]} cy={trail[trail.length - 1][1]} r={8} fill={tone} />
    </g>
  );
}

export const epicyclesMeta: KitEntry = {
  name: "Epicycles",
  category: "plot",
  summary: "A chain of rotating circles (a Fourier series) drawing a shape; `show` adds circles one by one so the approximation improves.",
  useWhen: ["Fourier series, a square wave as a sum of sines", "Combined circular motions"],
  avoidWhen: ["A single circular motion: use Point with x=\"cos(time)\""],
  example: "axes-fourier.tsx",
  schema: epicyclesSchema,
};

/* --------------------------------------------------------------------- Path */

export const pathSchema = z.object({
  points: z.array(pair).min(2).describe("Points [[x, y], …] in coordinates"),
  smooth: z.boolean().default(true).describe("A smooth curve through the points (false: straight segments)"),
  closed: z.boolean().default(false),
  at: atSchema.optional(),
  duration: z.number().positive().default(1.2).describe("Time to draw"),
  color: colorEnum.default("text"),
  fill: z.union([colorEnum, z.literal("none")]).default("none"),
  fillOpacity: z.number().min(0).max(1).default(0.22),
  width: z.number().min(1).max(14).default(4),
  dashed: z.boolean().default(false),
  arrow: z.boolean().default(false).describe("Arrowhead at the end (movement, flow, wind direction)"),
  flow: z.boolean().default(false).describe("A bright dot travelling along the path continuously once drawn"),
  label: z.string().optional(),
  labelAt: z.number().min(0).max(1).default(0.5).describe("Label position along the path (0 start, 1 end)"),
  labelDir: dirSchema.default("u"),
  outAt: atSchema.optional(),
});

export function Path(props: z.input<typeof pathSchema>) {
  const p = parseProps("Path", pathSchema, props);
  const c = useAxes("Path");
  const start = startOf(c, p.at, 0.6);
  const k = lin(c.t, start, p.duration);
  const out = p.outAt === undefined ? 0 : lin(c.t, resolveAt(p.outAt, c.timing), 0.5);
  if (k <= 0 || out >= 1) return null;
  const pts = (p.points as [number, number][]).map((q) => c.toPx(...q));
  const d = p.smooth ? smoothPath(pts, p.closed) : `M${pts.map((q) => `${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join(" L")}${p.closed ? " Z" : ""}`;
  const tone = p.color as ColorName;
  const e = ease(k);
  // Position along the polyline at fraction s (for the flow dot, the label and the arrow tip).
  const lens = pts.slice(1).map((q, i) => Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1]));
  const total = lens.reduce((s, v) => s + v, 0) || 1;
  const along = (s: number): { x: number; y: number; ux: number; uy: number } => {
    let left = s * total;
    for (let i = 0; i < lens.length; i++) {
      if (left <= lens[i] || i === lens.length - 1) {
        const f = lens[i] ? Math.min(1, left / lens[i]) : 0;
        const ux = (pts[i + 1][0] - pts[i][0]) / (lens[i] || 1);
        const uy = (pts[i + 1][1] - pts[i][1]) / (lens[i] || 1);
        return { x: pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, y: pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f, ux, uy };
      }
      left -= lens[i];
    }
    return { x: pts[0][0], y: pts[0][1], ux: 1, uy: 0 };
  };
  const tip = along(1);
  const head = 22;
  const dot = p.flow && k >= 1 ? along(((c.t - start - p.duration) * 0.35) % 1) : null;
  const lab = along(p.labelAt);
  return (
    <g opacity={1 - out}>
      <path
        d={d}
        fill={p.fill === "none" ? "none" : color(p.fill as ColorName)}
        fillOpacity={p.fill === "none" ? 0 : p.fillOpacity * Math.max(0, (k - 0.6) / 0.4)}
        stroke={color(tone)}
        strokeWidth={p.width}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={k < 1 ? 1 : undefined}
        strokeDasharray={k < 1 ? `${e} 1` : p.dashed ? "14 10" : undefined}
      />
      {p.arrow && k >= 0.95 ? (
        <path
          d={`M${tip.x} ${tip.y} L${tip.x - tip.ux * head - tip.uy * head * 0.5} ${tip.y - tip.uy * head + tip.ux * head * 0.5} L${tip.x - tip.ux * head + tip.uy * head * 0.5} ${tip.y - tip.uy * head - tip.ux * head * 0.5} Z`}
          fill={color(tone)}
        />
      ) : null}
      {dot ? <circle cx={dot.x} cy={dot.y} r={8} fill={color("accent")} /> : null}
      {p.label ? (
        <Tag x={lab.x} y={lab.y} dir={p.labelDir} tone={tone} size={32} opacity={Math.max(0, (k - 0.6) / 0.4)}>
          <RichText text={p.label} />
        </Tag>
      ) : null}
    </g>
  );
}

export const pathMeta: KitEntry = {
  name: "Path",
  category: "plot",
  summary: "A smooth (or straight-segment) path through coordinate points, drawing itself; arrowhead at the end, a dot travelling along it, closed and filled.",
  useWhen: [
    "Free drawing on a Stage: coastlines, rivers, orbits, light rays, army routes, ocean currents",
    "Closed hand-drawn shapes: a leaf, a cell, a lake (closed + fill)",
    "Curved arrows showing movement or flow (arrow, flow)",
  ],
  avoidWhen: ["Graphs y = f(x): use Plot", "Straight-sided polygons: use Polygon"],
  example: "stage-biology.tsx",
  schema: pathSchema,
};

/* ------------------------------------------------------------------- Spring */

const pointMotion = z.tuple([motionSchema, motionSchema]);

export const springSchema = z.object({
  from: pointMotion.describe("Fixed end [x, y]; each coordinate can be a number, keyframes or an expression of time"),
  to: pointMotion.describe('End attached to the body, e.g. ["2 + 0.8*sin(3*time)", 0] for an oscillation'),
  coils: z.number().int().min(3).max(30).default(10),
  thickness: z.number().min(0.05).max(2).default(0.35).describe("Width of the spring (coordinate units)"),
  at: atSchema.optional(),
  color: colorEnum.default("muted"),
});

export function Spring(props: z.input<typeof springSchema>) {
  const p = parseProps("Spring", springSchema, props);
  const c = useAxes("Spring");
  const start = startOf(c, p.at, 0.6);
  const k = ease(lin(c.t, start, 0.5));
  if (k <= 0) return null;
  const a: [number, number] = [evalMotion(p.from[0], c, start), evalMotion(p.from[1], c, start)];
  const b: [number, number] = [evalMotion(p.to[0], c, start), evalMotion(p.to[1], c, start)];
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1e-6;
  const ux = (b[0] - a[0]) / L;
  const uy = (b[1] - a[1]) / L;
  const lead = Math.min(0.15 * L, 0.3);
  const pts: [number, number][] = [a, [a[0] + ux * lead, a[1] + uy * lead]];
  const n = p.coils * 2;
  for (let i = 1; i < n; i++) {
    const s = lead + ((L - 2 * lead) * i) / n;
    const side = (i % 2 ? 1 : -1) * p.thickness * 0.5;
    pts.push([a[0] + ux * s - uy * side, a[1] + uy * s + ux * side]);
  }
  pts.push([b[0] - ux * lead, b[1] - uy * lead], b);
  return <path d={linePath(c, pts, false)} fill="none" stroke={color(p.color as ColorName)} strokeWidth={4} strokeLinejoin="round" strokeLinecap="round" opacity={k} />;
}

export const springMeta: KitEntry = {
  name: "Spring",
  category: "plot",
  summary: "A zigzag spring between two points, stretching and compressing as one end moves (expressions of time).",
  useWhen: ["Spring oscillators, Hooke's law", "Elastic links between two bodies"],
  avoidWhen: ["A straight string: use Segment"],
  example: "stage-physics.tsx",
  schema: springSchema,
};

/* -------------------------------------------------------------------- Stage */

export const stageSchema = z.object({
  x: pair.default([-8, 8]).describe("Horizontal coordinate range; 16 units by default"),
  y: pair.default([-4.5, 4.5]).describe("Vertical coordinate range; 9 units by default (16:9)"),
  width: z.number().min(200).max(1728).default(1600),
  height: z.number().min(200).max(900).default(800),
  at: atSchema.default(0),
  grid: z.boolean().default(false).describe("Show a faint grid"),
  view: axesSchema.shape.view,
  transition: axesSchema.shape.transition,
});

/**
 * A free canvas in coordinate units, without axes: the place to build any
 * picture from shapes (Polygon, Circle, Path, Region, Spring, Vector, Label…),
 * move them with Group, and zoom with `view`.
 */
export function Stage(props: z.input<typeof stageSchema> & { children?: React.ReactNode }) {
  const p = parseProps("Stage", stageSchema, props);
  return (
    <Axes x={p.x} y={p.y} width={p.width} height={p.height} at={p.at} axes={false} grid={p.grid ? "subtle" : "none"} equal view={p.view} transition={p.transition}>
      {p.children}
    </Axes>
  );
}

export const stageMeta: KitEntry = {
  name: "Stage",
  category: "component",
  summary:
    "A free stage (no axes, 1 x unit = 1 y unit, 16 × 9 units by default, origin in the center) for BUILDING PICTURES in any subject: place shapes by coordinates (Polygon, Circle, Path, Region, Spring, Vector, Segment, Point, Label), move them with Group / time, zoom with `view`.",
  useWhen: [
    "Physics: inclined planes, pendulums, springs, forces (Vector), light through lenses, planetary orbits",
    "Biology / geography: hand-drawn pictures (cells, leaves, rivers, simplified maps, wind directions) with Path, Circle, Label",
    "Geometry without axes; a situation with concrete positions",
  ],
  avoidWhen: ["Block diagrams with arrows: use Diagram (lays itself out)", "Function graphs: use Axes"],
  example: "stage-physics.tsx",
  children: "Coordinate objects as in Axes (including Group)",
  schema: stageSchema,
};
