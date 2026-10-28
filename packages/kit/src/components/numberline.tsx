import React from "react";
import { z } from "zod";
import { parseProps, type KitEntry } from "../define";
import { colorSchema, linear } from "../primitives";
import { color, ease, fonts, halo, type ColorName } from "../theme";
import { atSchema, resolveAt, useSceneTime, useSceneTiming } from "../timing/context";
import { fmtNumber, niceStep } from "../math/expr";
import { evalTrack, trackSchema } from "../math/track";
import { RichText } from "./formula";

const pair = z.tuple([z.number(), z.number()]);

export const numberLineSchema = z.object({
  range: pair.default([-5, 5]).describe("Range shown [min, max]"),
  step: z.number().positive().optional().describe("Tick step; leave empty to choose automatically"),
  width: z.number().min(400).max(1728).default(1400),
  at: atSchema.default(0),
  ticks: z.boolean().default(true).describe("Show numbers under the ticks"),
  view: z.array(z.object({ at: atSchema, range: pair })).default([]).describe("Zoom/pan the number line to a new range at `at` (e.g. zoom in around √2)"),
  points: z
    .array(z.object({ x: trackSchema.describe("Position; keyframes to make the point move"), label: z.string().optional(), color: colorSchema.default("accent"), at: atSchema.optional() }))
    .default([]),
  jumps: z
    .array(z.object({ from: z.number(), to: z.number(), at: atSchema, label: z.string().optional(), color: colorSchema.default("warn") }))
    .default([])
    .describe("An arc jump from `from` to `to` (addition, subtraction, sequences)"),
  intervals: z
    .array(
      z.object({
        from: z.number(),
        to: z.number(),
        at: atSchema.optional(),
        color: colorSchema.default("info"),
        closed: z.tuple([z.boolean(), z.boolean()]).default([true, true]).describe("Closed (filled dot) or open (hollow dot) endpoint"),
        label: z.string().optional(),
      }),
    )
    .default([])
    .describe("A highlighted interval on the line (solution set of an inequality)"),
  transition: z.number().positive().default(1.4),
});

export function NumberLine(props: z.input<typeof numberLineSchema>) {
  const p = parseProps("NumberLine", numberLineSchema, props);
  const timing = useSceneTiming();
  const t = useSceneTime();
  const start = resolveAt(p.at, timing);
  let [a, b] = p.range;
  for (const v of p.view) {
    const e = ease(linear(t, resolveAt(v.at, timing), p.transition));
    a += (v.range[0] - a) * e;
    b += (v.range[1] - b) * e;
  }
  const W = p.width;
  const top = 150; // room for jump arcs and labels
  const H = top + 90;
  const pad = 40;
  const sx = (x: number) => pad + ((x - a) / (b - a)) * (W - 2 * pad);
  const k = ease(linear(t, start, 0.8));
  const step = p.step && (b - a) / p.step <= 60 ? p.step : niceStep(b - a, 10);
  const ticks: number[] = [];
  for (let v = Math.ceil(a / step - 1e-9) * step; v <= b + 1e-9; v += step) ticks.push(Math.abs(v) < 1e-9 ? 0 : v);
  const after = (at: z.input<typeof atSchema> | undefined, lag: number) => (at === undefined ? start + lag : resolveAt(at, timing));
  const inView = (x: number) => x >= a - 1e-9 && x <= b + 1e-9;
  const label = (x: number, y: number, text: string, tone: ColorName, op: number) => (
    <foreignObject x={x} y={y} width={1} height={1} style={{ overflow: "visible" }}>
      <div style={{ width: "max-content", transform: "translate(-50%, -100%)", fontSize: 34, color: color(tone), opacity: op, whiteSpace: "nowrap", textShadow: halo }}>
        <RichText text={text} />
      </div>
    </foreignObject>
  );

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible", display: "block", flex: "none" }}>
      <line x1={W / 2 - (W / 2 - pad + 16) * k} x2={W / 2 + (W / 2 - pad + 16) * k} y1={top} y2={top} stroke={color("muted")} strokeWidth={4} strokeLinecap="round" />
      {ticks.map((v, i) => {
        const tk = ease(Math.max(0, Math.min(1, k * 1.6 - (i / ticks.length) * 0.6)));
        const major = Math.abs(v / (step * 5) - Math.round(v / (step * 5))) < 1e-6 || ticks.length <= 12;
        return (
          <g key={v} opacity={tk}>
            <line x1={sx(v)} x2={sx(v)} y1={top - (major ? 14 : 9)} y2={top + (major ? 14 : 9)} stroke={color("muted")} strokeWidth={3} />
            {p.ticks && major ? (
              <text x={sx(v)} y={top + 52} fill={color("faint")} fontSize={28} fontFamily={fonts.mono} textAnchor="middle">
                {fmtNumber(v, 3)}
              </text>
            ) : null}
          </g>
        );
      })}
      {p.intervals.map((iv, i) => {
        const ik = ease(linear(t, after(iv.at, 0.8), 0.9));
        if (ik <= 0) return null;
        const x0 = sx(Math.max(a, iv.from));
        const x1 = sx(Math.min(b, iv.to));
        const c = color(iv.color as ColorName);
        const end = x0 + (x1 - x0) * ik;
        const dot = (x: number, closed: boolean, show: boolean) =>
          show ? <circle cx={x} cy={top} r={11} fill={closed ? c : color("bg")} stroke={c} strokeWidth={4} /> : null;
        return (
          <g key={`iv${i}`}>
            <line x1={x0} x2={end} y1={top} y2={top} stroke={c} strokeWidth={10} strokeLinecap="butt" />
            {dot(x0, iv.closed[0], inView(iv.from))}
            {dot(x1, iv.closed[1], inView(iv.to) && ik >= 1)}
            {iv.label ? label((x0 + x1) / 2, top - 26, iv.label, iv.color as ColorName, ik) : null}
          </g>
        );
      })}
      {p.jumps.map((j, i) => {
        const s = resolveAt(j.at, timing);
        const jk = ease(linear(t, s, 0.8));
        if (jk <= 0) return null;
        const x0 = sx(j.from);
        const x1 = sx(j.to);
        const h = Math.min(120, 30 + Math.abs(x1 - x0) * 0.35);
        const c = color(j.color as ColorName);
        // Quadratic arc, drawn up to the current progress.
        const n = 40;
        let d = "";
        for (let q = 0; q <= n; q++) {
          const u = (q / n) * jk;
          const x = x0 + (x1 - x0) * u;
          const y = top - 4 * h * u * (1 - u);
          d += `${q ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)} `;
        }
        const hx = x0 + (x1 - x0) * jk;
        const hy = top - 4 * h * jk * (1 - jk);
        return (
          <g key={`j${i}`}>
            <path d={d} fill="none" stroke={c} strokeWidth={4} strokeLinecap="round" />
            <circle cx={hx} cy={hy} r={8} fill={c} />
            {j.label ? label((x0 + x1) / 2, top - h - 12, j.label, j.color as ColorName, jk) : null}
          </g>
        );
      })}
      {p.points.map((pt, i) => {
        const pk = linear(t, after(pt.at, 0.6), 0.5);
        if (pk <= 0) return null;
        const x = evalTrack(pt.x, t, timing);
        const pop = 1 + 0.5 * Math.sin(Math.PI * pk);
        const c = pt.color as ColorName;
        return (
          <g key={`p${i}`} opacity={Math.min(1, pk * 2)}>
            <circle cx={sx(x)} cy={top} r={13 * (pk < 1 ? pop : 1)} fill={color(c)} />
            {pt.label ? label(sx(x), top - 30, pt.label, c, pk) : null}
          </g>
        );
      })}
    </svg>
  );
}

export const numberLineMeta: KitEntry = {
  name: "NumberLine",
  category: "component",
  summary: "A number line with automatic ticks: points moving by keyframes, arc jumps (addition/subtraction, sequences), shaded intervals for solution sets, zooming into a region.",
  useWhen: ["Integers, addition and subtraction, absolute value", "Solution sets of inequalities (closed/open endpoints)", "Convergent sequences, zooming in around the limit"],
  avoidWhen: ["When a y axis is needed: use Axes"],
  example: "number-line.tsx",
  schema: numberLineSchema,
};
