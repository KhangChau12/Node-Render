import React, { useMemo } from "react";
import { interpolate } from "remotion";
import { z } from "zod";
import { parseProps, type KitEntry } from "../define";
import { localizeDecimal } from "../locale";
import { colorSchema } from "../primitives";
import { axisNameStyle, color, ease, fonts, type ColorName } from "../theme";
import { atSchema, resolveAt, useProgress, useSceneTime, useSceneTiming } from "../timing/context";
import { compileExpression } from "../math/expr";
import { plainTex } from "./formula";

function niceStep(span: number, target = 6): number {
  const raw = span / target;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const m = raw / p;
  return (m < 1.5 ? 1 : m < 3 ? 2 : m < 7 ? 5 : 10) * p;
}

function fmt(n: number): string {
  const r = Math.round(n * 100) / 100;
  return localizeDecimal(String(r));
}

/* ------------------------------------------------------------------- Graph */

const xMotion = z.object({
  x: z.number().describe("Starting x"),
  to: z.number().optional().describe("Move to this x (optional)"),
  at: atSchema.optional().describe("When it appears"),
  moveAt: atSchema.optional().describe("When it starts moving"),
  moveDuration: z.number().default(2),
});

export const graphSchema = z.object({
  fn: z.string().describe('Expression in x: "x^2", "sin(x)", "2x+1", "sqrt(x)"; supports sin cos tan sqrt abs exp ln log pi e'),
  domain: z.tuple([z.number(), z.number()]).default([-5, 5]).describe("x range shown"),
  range: z.tuple([z.number(), z.number()]).optional().describe("y range; leave empty to compute it"),
  at: atSchema.default(0).describe("When the axes appear"),
  draw: atSchema.optional().describe("When the curve starts drawing (defaults to at)"),
  drawDuration: z.number().default(1.6),
  color: colorSchema.default("text"),
  label: z.string().optional().describe('Curve label, e.g. "y = x²"'),
  axisLabels: z.tuple([z.string(), z.string()]).default(["x", "y"]),
  grid: z.boolean().default(true),
  width: z.number().default(1300),
  height: z.number().default(760),
  tangent: xMotion.optional().describe("Tangent at x, can slide to `to`"),
  secant: z
    .object({
      x1: z.number(),
      x2: z.number(),
      at: atSchema.optional(),
      shrinkAt: atSchema.optional().describe("When the second point starts sliding toward x1"),
      shrinkTo: z.number().optional().describe("Final position of the second point (next to x1 by default)"),
      shrinkDuration: z.number().default(2.5),
      becomesTangentColor: colorSchema.default("accent").describe("Color once the secant is almost the tangent"),
    })
    .optional()
    .describe("Secant through two points; the second point can slide to the first to illustrate the derivative"),
  points: z
    .array(z.object({ x: z.number(), label: z.string().optional(), at: atSchema.optional(), color: colorSchema.optional() }))
    .default([]),
  showSlope: z.boolean().default(false).describe("Show the slope of the tangent/secant"),
  slopeLabel: z.string().default("Slope"),
  area: z
    .object({ from: z.number(), to: z.number(), at: atSchema.optional(), color: colorSchema.default("accent") })
    .optional()
    .describe("Shade the area under the curve from `from` to `to`"),
});

export function Graph(props: z.input<typeof graphSchema>) {
  const p = parseProps("Graph", graphSchema, props);
  const timing = useSceneTiming();
  const t = useSceneTime();
  const f = useMemo(() => compileExpression(p.fn), [p.fn]);
  const [x0, x1] = p.domain;

  const W = p.width;
  const H = p.height;
  const pad = { l: 70, r: 40, t: 30, b: 60 };

  const yRange = useMemo<[number, number]>(() => {
    if (p.range) return p.range;
    let lo = Infinity;
    let hi = -Infinity;
    for (let i = 0; i <= 200; i++) {
      const y = f(x0 + ((x1 - x0) * i) / 200);
      if (Number.isFinite(y)) {
        lo = Math.min(lo, y);
        hi = Math.max(hi, y);
      }
    }
    if (!Number.isFinite(lo)) return [-1, 1];
    if (hi - lo < 1e-6) return [lo - 1, hi + 1];
    const m = (hi - lo) * 0.12;
    return [lo - m, hi + m];
  }, [f, x0, x1, p.range]);
  const [y0, y1] = yRange;

  const sx = (x: number) => pad.l + ((x - x0) / (x1 - x0)) * (W - pad.l - pad.r);
  const sy = (y: number) => H - pad.b - ((y - y0) / (y1 - y0)) * (H - pad.t - pad.b);

  const curve = useMemo(() => {
    const n = 400;
    let d = "";
    let pen = false;
    for (let i = 0; i <= n; i++) {
      const x = x0 + ((x1 - x0) * i) / n;
      const y = f(x);
      if (!Number.isFinite(y) || y < y0 - (y1 - y0) * 2 || y > y1 + (y1 - y0) * 2) {
        pen = false;
        continue;
      }
      d += `${pen ? "L" : "M"}${sx(x).toFixed(1)} ${sy(y).toFixed(1)} `;
      pen = true;
    }
    return d;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f, x0, x1, y0, y1, W, H]);

  const axesK = useProgress(p.at, 0.6);
  const drawK = useProgress(p.draw ?? p.at, p.drawDuration);
  const c = color(p.color);

  const xStep = niceStep(x1 - x0);
  const yStep = niceStep(y1 - y0, 5);
  const xTicks: number[] = [];
  for (let v = Math.ceil(x0 / xStep) * xStep; v <= x1 + 1e-9; v += xStep) xTicks.push(v);
  const yTicks: number[] = [];
  for (let v = Math.ceil(y0 / yStep) * yStep; v <= y1 + 1e-9; v += yStep) yTicks.push(v);
  const axisY = y0 <= 0 && y1 >= 0 ? sy(0) : H - pad.b;
  const axisX = x0 <= 0 && x1 >= 0 ? sx(0) : pad.l;

  const slope = (x: number) => (f(x + 1e-4) - f(x - 1e-4)) / 2e-4;

  // Line through (xa, ya) with slope m, clipped to the plot box.
  const lineThrough = (xa: number, ya: number, m: number) => {
    const span = (x1 - x0) * 0.35;
    const xa0 = Math.max(x0, xa - span);
    const xa1 = Math.min(x1, xa + span);
    return { x1: sx(xa0), y1: sy(ya + m * (xa0 - xa)), x2: sx(xa1), y2: sy(ya + m * (xa1 - xa)) };
  };

  const motion = (m: z.output<typeof xMotion>) => {
    if (m.to === undefined) return m.x;
    const s = resolveAt(m.moveAt ?? m.at ?? p.at, timing);
    return interpolate(t, [s, s + m.moveDuration], [m.x, m.to], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
  };

  let readout: { value: number; color: string; k: number } | null = null;

  // Tangent
  let tangentEl: React.ReactNode = null;
  if (p.tangent) {
    const k = interpolate(t, [resolveAt(p.tangent.at ?? p.draw ?? p.at, timing), resolveAt(p.tangent.at ?? p.draw ?? p.at, timing) + 0.6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const xt = motion(p.tangent);
    const yt = f(xt);
    const m = slope(xt);
    const ln = lineThrough(xt, yt, m);
    tangentEl = (
      <g opacity={k}>
        <line {...ln} stroke={color("accent")} strokeWidth={5} strokeLinecap="round" />
        <circle cx={sx(xt)} cy={sy(yt)} r={11} fill={color("accent")} />
      </g>
    );
    readout = { value: m, color: color("accent"), k };
  }

  // Secant
  let secantEl: React.ReactNode = null;
  if (p.secant) {
    const sAt = resolveAt(p.secant.at ?? p.draw ?? p.at, timing);
    const k = interpolate(t, [sAt, sAt + 0.6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const target = p.secant.shrinkTo ?? p.secant.x1 + (p.secant.x2 > p.secant.x1 ? 1 : -1) * (x1 - x0) * 0.004;
    let xb = p.secant.x2;
    let closeness = 0;
    if (p.secant.shrinkAt !== undefined) {
      const s = resolveAt(p.secant.shrinkAt, timing);
      const q = interpolate(t, [s, s + p.secant.shrinkDuration], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
      xb = p.secant.x2 + (target - p.secant.x2) * q;
      closeness = q;
    }
    const xa = p.secant.x1;
    const ya = f(xa);
    const yb = f(xb);
    const m = (yb - ya) / (xb - xa);
    const ln = lineThrough((xa + xb) / 2, (ya + yb) / 2, m);
    const lineColor = closeness > 0.92 ? color(p.secant.becomesTangentColor) : color("warn");
    secantEl = (
      <g opacity={k}>
        <line {...ln} stroke={lineColor} strokeWidth={5} strokeLinecap="round" strokeDasharray={closeness > 0.92 ? undefined : "18 12"} />
        <circle cx={sx(xa)} cy={sy(ya)} r={11} fill={color("text")} />
        <circle cx={sx(xb)} cy={sy(yb)} r={11} fill={color("warn")} />
      </g>
    );
    readout = { value: m, color: lineColor, k };
  }

  // Area
  let areaEl: React.ReactNode = null;
  if (p.area) {
    const k = progressAt(t, resolveAt(p.area.at ?? p.at, timing), 1.2);
    const a = Math.max(x0, p.area.from);
    const b = a + (Math.min(x1, p.area.to) - a) * k;
    let d = `M${sx(a)} ${sy(Math.max(y0, Math.min(y1, 0)))} `;
    for (let i = 0; i <= 120; i++) {
      const x = a + ((b - a) * i) / 120;
      d += `L${sx(x)} ${sy(Math.max(y0, Math.min(y1, f(x))))} `;
    }
    d += `L${sx(b)} ${sy(Math.max(y0, Math.min(y1, 0)))} Z`;
    areaEl = <path d={d} fill={color(p.area.color)} fillOpacity={0.22} />;
  }

  return (
    <div style={{ position: "relative", width: W + (p.showSlope ? 360 : 0), height: H, display: "flex", alignItems: "center", gap: 40 }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible", flex: "none" }}>
        <defs>
          <clipPath id="kit-graph-clip">
            <rect x={pad.l} y={pad.t} width={W - pad.l - pad.r} height={H - pad.t - pad.b} />
          </clipPath>
        </defs>
        <g opacity={axesK}>
          {p.grid
            ? xTicks.map((v) => <line key={`gx${v}`} x1={sx(v)} x2={sx(v)} y1={pad.t} y2={H - pad.b} stroke={color("grid")} strokeWidth={1.5} />)
            : null}
          {p.grid
            ? yTicks.map((v) => <line key={`gy${v}`} y1={sy(v)} y2={sy(v)} x1={pad.l} x2={W - pad.r} stroke={color("grid")} strokeWidth={1.5} />)
            : null}
          <line x1={pad.l} x2={W - pad.r + 20} y1={axisY} y2={axisY} stroke={color("faint")} strokeWidth={3} />
          <line y1={pad.t - 20} y2={H - pad.b} x1={axisX} x2={axisX} stroke={color("faint")} strokeWidth={3} />
          {xTicks.map((v) =>
            Math.abs(v) < 1e-9 ? null : (
              <text key={`tx${v}`} x={sx(v)} y={axisY + 36} fill={color("faint")} fontSize={22} fontFamily={fonts.mono} textAnchor="middle">
                {fmt(v)}
              </text>
            ),
          )}
          {yTicks.map((v) =>
            Math.abs(v) < 1e-9 ? null : (
              <text key={`ty${v}`} x={axisX - 14} y={sy(v) + 8} fill={color("faint")} fontSize={22} fontFamily={fonts.mono} textAnchor="end">
                {fmt(v)}
              </text>
            ),
          )}
          <text x={W - pad.r + 28} y={axisY + 8} fill={color("muted")} fontSize={30} {...axisNameStyle(p.axisLabels[0])}>
            {plainTex(p.axisLabels[0])}
          </text>
          <text x={axisX + 12} y={pad.t - 24} fill={color("muted")} fontSize={30} {...axisNameStyle(p.axisLabels[1])}>
            {plainTex(p.axisLabels[1])}
          </text>
        </g>
        <g clipPath="url(#kit-graph-clip)">
          {areaEl}
          <path d={curve} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - drawK} stroke={c} strokeWidth={6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          {secantEl}
          {tangentEl}
          {p.points.map((pt, i) => {
            const k = progressAt(t, resolveAt(pt.at ?? p.draw ?? p.at, timing), 0.4);
            const y = f(pt.x);
            return (
              <g key={i} opacity={k}>
                <circle cx={sx(pt.x)} cy={sy(y)} r={10} fill={color((pt.color ?? "accent") as ColorName)} />
                {pt.label ? (
                  <text x={sx(pt.x) + 18} y={sy(y) - 16} fill={color("muted")} fontSize={24} fontFamily={fonts.mono}>
                    {plainTex(pt.label)}
                  </text>
                ) : null}
              </g>
            );
          })}
        </g>
        {p.label ? (
          <text x={W - pad.r - 10} y={pad.t + 40} fill={c} fontSize={36} fontStyle="italic" fontFamily={fonts.serif} textAnchor="end" opacity={drawK}>
            {plainTex(p.label)}
          </text>
        ) : null}
      </svg>
      {p.showSlope && readout ? (
        <div style={{ opacity: readout.k, background: color("surface"), border: `1px solid ${color("grid")}`, padding: "26px 32px", minWidth: 300 }}>
          <div style={{ fontSize: 26, color: color("muted"), marginBottom: 8 }}>{p.slopeLabel}</div>
          <div style={{ fontFamily: fonts.mono, fontSize: 68, color: readout.color, fontVariantNumeric: "tabular-nums" }}>{fmt(readout.value)}</div>
        </div>
      ) : null}
    </div>
  );
}

// Plain (non-hook) progress helper for use inside loops.
function progressAt(t: number, start: number, duration: number) {
  return interpolate(t, [start, start + duration], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
}

export const graphMeta: KitEntry = {
  name: "Graph",
  category: "component",
  summary: "A function plot with axes and grid: the curve draws itself, moving tangents/secants, points and shaded areas.",
  useWhen: ["Functions, slope, derivatives, extrema, integrals", "A secant sliding into a tangent"],
  avoidWhen: ["Statistical data charts", "Plane geometry or diagrams: use Diagram"],
  example: "graph-secant.tsx",
  schema: graphSchema,
};
