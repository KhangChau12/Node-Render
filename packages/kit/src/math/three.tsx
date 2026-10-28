import React, { createContext, useContext } from "react";
import { interpolate } from "remotion";
import { z } from "zod";
import { parseProps, type KitEntry } from "../define";
import { RichText } from "../components/richtext";
import { color, colorNames, colors, ease, fonts, type ColorName } from "../theme";
import { atSchema, resolveAt, useSceneTime, useSceneTiming, type At } from "../timing/context";
import type { SceneTiming } from "../timing/estimate";
import { compileExpr } from "./expr";
import { evalParams, evalTrack, trackSchema } from "./track";
import { ArrowShape, dirAway, mixHex, Tag, type Dir } from "./svg";

/*
 * Axes3D: a 3D coordinate box seen by an orbiting camera. Children are placed
 * in math coordinates and projected every frame, so turning the camera
 * (`azimuth`, `elevation`, `spin`) moves everything together. Drawing is plain
 * SVG with painter's ordering inside each object; Solid computes which edges
 * are hidden and dashes them, like a geometry textbook.
 */

const colorEnum = z.enum(colorNames);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const lin = (t: number, s: number, d: number) => (d <= 0 ? (t >= s ? 1 : 0) : interpolate(t, [s, s + d], [0, 1], clamp));
const pair = z.tuple([z.number(), z.number()]);
const triple = z.tuple([z.number(), z.number(), z.number()]);
type V3 = [number, number, number];

type Ctx3 = {
  /** Math → [px, py, depth]; larger depth is closer to the camera. */
  project: (x: number, y: number, z: number) => [number, number, number];
  /** Unit vector from the scene toward the camera, in normalized box coordinates. */
  toCamera: V3;
  /** Normalization scale per axis (math unit → box unit). */
  scale: V3;
  ranges: { x: [number, number]; y: [number, number]; z: [number, number] };
  start: number;
  t: number;
  timing: SceneTiming;
};

const Ctx = createContext<Ctx3 | null>(null);

function use3(name: string): Ctx3 {
  const c = useContext(Ctx);
  if (!c) throw new Error(`<${name}> must be inside <Axes3D>.`);
  return c;
}

const startOf = (c: Ctx3, at: At | undefined, lag = 0.5) => (at === undefined ? c.start + lag : resolveAt(at, c.timing));

/* ------------------------------------------------------------------- Axes3D */

export const axes3DSchema = z.object({
  x: pair.default([-3, 3]),
  y: pair.default([-3, 3]),
  z: pair.default([-3, 3]),
  width: z.number().min(300).max(1728).default(1200),
  height: z.number().min(300).max(900).default(760),
  at: atSchema.default(0),
  equal: z.boolean().default(false).describe("The same scale on all three axes (REQUIRED for solid geometry so shapes are not distorted); false: each axis fits the box (surfaces, graphs)"),
  azimuth: trackSchema.default(-125).describe("Camera rotation around the z axis (degrees); keyframes to orbit"),
  elevation: trackSchema.default(22).describe("Camera elevation above the xy plane (degrees, -80…80)"),
  spin: z.number().default(0).describe("Steady rotation around the z axis, degrees per second (e.g. 8), so the viewer feels the depth"),
  zoom: trackSchema.default(1),
  axes: z.boolean().default(true).describe("Draw the three axes x, y, z"),
  floor: z.boolean().default(true).describe("Faint grid on the plane z = 0 (or the floor of the box)"),
  labels: z.tuple([z.string(), z.string(), z.string()]).default(["x", "y", "z"]),
});

export function Axes3D(props: z.input<typeof axes3DSchema> & { children?: React.ReactNode }) {
  const p = parseProps("Axes3D", axes3DSchema, props);
  const timing = useSceneTiming();
  const t = useSceneTime();
  const start = resolveAt(p.at, timing);
  const W = p.width;
  const H = p.height;
  const ranges = { x: p.x as [number, number], y: p.y as [number, number], z: p.z as [number, number] };
  const mid: V3 = [(p.x[0] + p.x[1]) / 2, (p.y[0] + p.y[1]) / 2, (p.z[0] + p.z[1]) / 2];
  const half: V3 = [(p.x[1] - p.x[0]) / 2, (p.y[1] - p.y[0]) / 2, (p.z[1] - p.z[0]) / 2];
  const scale: V3 = p.equal ? (Array(3).fill(1 / Math.max(...half)) as V3) : [1 / half[0], 1 / half[1], 0.8 / half[2]];

  const az = ((evalTrack(p.azimuth, t, timing, 1.6) + p.spin * Math.max(0, t - start)) * Math.PI) / 180;
  const el = (Math.max(-80, Math.min(80, evalTrack(p.elevation, t, timing, 1.6))) * Math.PI) / 180;
  const zoom = evalTrack(p.zoom, t, timing, 1.6);
  const s = (Math.min(W, H) / 3) * zoom;
  const D = 7;
  const ca = Math.cos(az);
  const sa = Math.sin(az);
  const ce = Math.cos(el);
  const se = Math.sin(el);
  const project = (x: number, y: number, zz: number): [number, number, number] => {
    const X = (x - mid[0]) * scale[0];
    const Y = (y - mid[1]) * scale[1];
    const Z = (zz - mid[2]) * scale[2];
    const x1 = X * ca - Y * sa;
    const y1 = X * sa + Y * ca;
    const depth = -y1 * ce + Z * se;
    const sy = y1 * se + Z * ce;
    const f = D / (D - depth);
    return [W / 2 + s * x1 * f, H / 2 - s * sy * f, depth];
  };
  // Camera direction (0, -cos e, sin e) in rotated space → back to math axes (undo azimuth, undo scale).
  const cam: V3 = [-ce * sa, -ce * ca, se];
  const ctx: Ctx3 = { project, toCamera: cam, scale, ranges, start, t, timing };
  const k = ease(lin(t, start, 0.9));
  const gk = ease(lin(t, start + 0.2, 1));

  const z0 = p.z[0] <= 0 && p.z[1] >= 0 ? 0 : p.z[0];
  const floor: React.ReactNode[] = [];
  if (p.floor) {
    const n = 8;
    for (let i = 0; i <= n; i++) {
      const gx = p.x[0] + ((p.x[1] - p.x[0]) * i) / n;
      const gy = p.y[0] + ((p.y[1] - p.y[0]) * i) / n;
      const a1 = project(gx, p.y[0], z0);
      const a2 = project(gx, p.y[0] + (p.y[1] - p.y[0]) * gk, z0);
      const b1 = project(p.x[0], gy, z0);
      const b2 = project(p.x[0] + (p.x[1] - p.x[0]) * gk, gy, z0);
      floor.push(<line key={`fx${i}`} x1={a1[0]} y1={a1[1]} x2={a2[0]} y2={a2[1]} stroke={color("grid")} strokeWidth={2} />);
      floor.push(<line key={`fy${i}`} x1={b1[0]} y1={b1[1]} x2={b2[0]} y2={b2[1]} stroke={color("grid")} strokeWidth={2} />);
    }
  }
  const axes: React.ReactNode[] = [];
  if (p.axes) {
    const o: V3 = [Math.max(p.x[0], Math.min(p.x[1], 0)), Math.max(p.y[0], Math.min(p.y[1], 0)), Math.max(p.z[0], Math.min(p.z[1], 0))];
    const ends: [V3, V3, ColorName, string][] = [
      [[p.x[0], o[1], o[2]], [p.x[1], o[1], o[2]], "muted", p.labels[0]],
      [[o[0], p.y[0], o[2]], [o[0], p.y[1], o[2]], "muted", p.labels[1]],
      [[o[0], o[1], p.z[0]], [o[0], o[1], p.z[1]], "muted", p.labels[2]],
    ];
    ends.forEach(([a, b, tone, label], i) => {
      const A = project(...a);
      const B = project(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k);
      axes.push(<ArrowShape key={`ax${i}`} from={[A[0], A[1]]} to={[B[0], B[1]]} tone={tone} k={k > 0 ? 1 : 0} width={3} />);
      const ux = B[0] - A[0];
      const uy = B[1] - A[1];
      const n = Math.hypot(ux, uy) || 1;
      axes.push(
        <Tag key={`al${i}`} x={B[0]} y={B[1]} dir={dirAway(ux / n, uy / n)} tone="muted" size={32} opacity={k}>
          <span style={{ fontStyle: "italic" }}>
            <RichText text={label} />
          </span>
        </Tag>,
      );
    });
  }

  return (
    <div style={{ width: W, height: H, flex: "none" }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible", display: "block" }}>
        <g opacity={gk}>{floor}</g>
        {axes}
        <Ctx.Provider value={ctx}>{p.children}</Ctx.Provider>
      </svg>
    </div>
  );
}

export const axes3DMeta: KitEntry = {
  name: "Axes3D",
  category: "component",
  summary:
    "3D space seen through a camera that can orbit (`azimuth`, `elevation` by keyframes, `spin` turns by itself). Holds Surface, Curve3D, Point3D, Vector3D, Segment3D, Solid.",
  useWhen: [
    "Solid geometry: pyramids, prisms, boxes (Solid, equal); hidden edges are dashed automatically",
    "Functions of two variables z = f(x, y), surfaces, saddle points, extrema (Surface)",
    "Vectors in space, space curves (helices), 3D trajectories",
  ],
  avoidWhen: ["Everything lies in one plane: a 2D Axes is clearer"],
  example: "three-pyramid.tsx",
  children: "3D objects only (Surface, Curve3D, Point3D, Vector3D, Segment3D, Solid)",
  schema: axes3DSchema,
};

/* ------------------------------------------------------------------ Surface */

const fn2 = z.string().describe('Expression in x, y (and params, time): "x^2 - y^2", "sin(x)*cos(y)"');

export const surfaceSchema = z.object({
  fn: fn2,
  params: z.record(z.string(), trackSchema).default({}),
  x: pair.optional().describe("x domain (the Axes3D x range by default)"),
  y: pair.optional(),
  resolution: z.number().int().min(6).max(48).default(26),
  at: atSchema.optional().describe("When the surface rises out of the plane z = 0"),
  low: colorEnum.default("info").describe("Color of low parts"),
  high: colorEnum.default("accent").describe("Color of high parts"),
  opacity: z.number().min(0.2).max(1).default(0.88),
  wire: z.boolean().default(true).describe("Draw a mesh on the surface"),
  morph: z.array(z.object({ at: atSchema, fn: fn2 })).default([]).describe("Morph into another function at `at`"),
});

export function Surface(props: z.input<typeof surfaceSchema>) {
  const p = parseProps("Surface", surfaceSchema, props);
  const c = use3("Surface");
  const start = startOf(c, p.at, 0.6);
  const k = ease(lin(c.t, start, 1.4));
  if (k <= 0) return null;
  const vals = { time: Math.max(0, c.t - c.start), ...evalParams(p.params, c.t, c.timing) };
  const names = Object.keys(vals);
  const args = names.map((n) => vals[n as keyof typeof vals]);
  const base = compileExpr(p.fn, ["x", "y", ...names]);
  const morphs = p.morph.map((m) => ({ f: compileExpr(m.fn, ["x", "y", ...names]), e: ease(lin(c.t, resolveAt(m.at, c.timing), 1.4)) }));
  const [zlo, zhi] = c.ranges.z;
  const f = (x: number, y: number) => {
    let v = base(x, y, ...args);
    for (const m of morphs) if (m.e > 0) v += (m.f(x, y, ...args) - v) * m.e;
    return Math.max(zlo, Math.min(zhi, v * k));
  };
  const [x0, x1] = p.x ?? c.ranges.x;
  const [y0, y1] = p.y ?? c.ranges.y;
  const n = p.resolution;
  const grid: V3[][] = [];
  for (let i = 0; i <= n; i++) {
    const row: V3[] = [];
    for (let j = 0; j <= n; j++) {
      const x = x0 + ((x1 - x0) * i) / n;
      const y = y0 + ((y1 - y0) * j) / n;
      row.push([x, y, f(x, y)]);
    }
    grid.push(row);
  }
  const lo = colors[p.low as ColorName];
  const hi = colors[p.high as ColorName];
  const quads: { d: string; depth: number; fill: string }[] = [];
  const cam = c.toCamera;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const q = [grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]];
      if (q.some((v) => !Number.isFinite(v[2]))) continue;
      const P = q.map((v) => c.project(...v));
      const zc = (q[0][2] + q[1][2] + q[2][2] + q[3][2]) / 4;
      // Normal in box space for simple Lambert shading.
      const sx = c.scale;
      const u: V3 = [(q[2][0] - q[0][0]) * sx[0], (q[2][1] - q[0][1]) * sx[1], (q[2][2] - q[0][2]) * sx[2]];
      const v: V3 = [(q[3][0] - q[1][0]) * sx[0], (q[3][1] - q[1][1]) * sx[1], (q[3][2] - q[1][2]) * sx[2]];
      const nn: V3 = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
      const nl = Math.hypot(...nn) || 1;
      const light = Math.abs((nn[0] * 0.3 + nn[1] * -0.4 + nn[2] * 0.87) / nl);
      const facing = Math.abs((nn[0] * cam[0] + nn[1] * cam[1] + nn[2] * cam[2]) / nl);
      const tone = mixHex(lo, hi, (zc - zlo) / (zhi - zlo || 1));
      const shade = 0.45 + 0.4 * light + 0.15 * facing;
      quads.push({
        d: `M${P.map((w) => `${w[0].toFixed(1)} ${w[1].toFixed(1)}`).join(" L")} Z`,
        depth: (P[0][2] + P[1][2] + P[2][2] + P[3][2]) / 4,
        fill: `color-mix(in srgb, ${tone} ${Math.round(shade * 100)}%, ${colors.bg})`,
      });
    }
  }
  quads.sort((a, b) => a.depth - b.depth);
  return (
    <g opacity={Math.min(1, k * 1.5)}>
      {quads.map((q, i) => (
        <path key={i} d={q.d} fill={q.fill} fillOpacity={p.opacity} stroke={p.wire ? colors.bg : q.fill} strokeOpacity={p.wire ? 0.55 : 1} strokeWidth={p.wire ? 1.2 : 0.6} strokeLinejoin="round" />
      ))}
    </g>
  );
}

export const surfaceMeta: KitEntry = {
  name: "Surface",
  category: "plot",
  summary: "A surface z = f(x, y) in Axes3D, colored by height and shaded; rises out of the floor; params move by keyframes, `morph` turns it into another function.",
  useWhen: ["Functions of two variables, partial derivatives, extrema, saddle points", "Waves in two dimensions (with time), the 2D normal distribution"],
  avoidWhen: ["Functions of one variable: use Plot in Axes"],
  example: "three-surface.tsx",
  schema: surfaceSchema,
};

/* ------------------------------------------------------------------ Curve3D */

export const curve3DSchema = z.object({
  x: z.string().describe("x theo t"),
  y: z.string().describe("y theo t"),
  z: z.string().describe("z theo t"),
  t: pair.default([0, 6.2832]),
  params: z.record(z.string(), trackSchema).default({}),
  at: atSchema.optional(),
  drawDuration: z.number().positive().default(2),
  color: colorEnum.default("warn"),
  width: z.number().min(2).max(12).default(5),
});

export function Curve3D(props: z.input<typeof curve3DSchema>) {
  const p = parseProps("Curve3D", curve3DSchema, props);
  const c = use3("Curve3D");
  const start = startOf(c, p.at, 0.6);
  const k = lin(c.t, start, p.drawDuration);
  if (k <= 0) return null;
  const vals = evalParams(p.params, c.t, c.timing);
  const names = Object.keys(vals);
  const args = names.map((n) => vals[n]);
  const [fx, fy, fz] = [p.x, p.y, p.z].map((e) => compileExpr(e, ["t", ...names]));
  const [t0, t1] = p.t;
  const tEnd = t0 + (t1 - t0) * ease(k);
  const N = 300;
  const pts: string[] = [];
  let head: [number, number, number] = [0, 0, 0];
  for (let i = 0; i <= N; i++) {
    const s = t0 + ((tEnd - t0) * i) / N;
    const q = c.project(fx(s, ...args), fy(s, ...args), fz(s, ...args));
    if (q.every(Number.isFinite)) {
      pts.push(`${q[0].toFixed(1)},${q[1].toFixed(1)}`);
      head = q;
    }
  }
  const tone = color(p.color as ColorName);
  return (
    <g>
      <polyline points={pts.join(" ")} fill="none" stroke={tone} strokeWidth={p.width} strokeLinecap="round" strokeLinejoin="round" />
      {k < 1 ? <circle cx={head[0]} cy={head[1]} r={p.width * 1.8} fill={tone} /> : null}
    </g>
  );
}

export const curve3DMeta: KitEntry = {
  name: "Curve3D",
  category: "plot",
  summary: "A parametric curve (x(t), y(t), z(t)) in Axes3D, traced as if by a moving pen.",
  useWhen: ["Helices, trajectories in space, lines of intersection"],
  avoidWhen: ["Straight lines: use Segment3D"],
  example: "three-surface.tsx",
  schema: curve3DSchema,
};

/* ------------------------------------------------- Point3D / Vector3D / Seg */

const coord = z.union([trackSchema, z.string()]).describe('A number, keyframes, or an expression of time, in seconds since the Axes3D appeared ("2*cos(time)")');
const evalCoord = (v: z.output<typeof coord>, c: Ctx3, _start: number) =>
  typeof v === "string" ? compileExpr(v, ["time"])(Math.max(0, c.t - c.start)) : evalTrack(v, c.t, c.timing);

export const point3DSchema = z.object({
  x: coord,
  y: coord,
  z: coord,
  at: atSchema.optional(),
  color: colorEnum.default("accent"),
  size: z.number().min(4).max(24).default(10),
  label: z.string().optional(),
  labelDir: z.enum(["c", "u", "d", "l", "r", "ur", "ul", "dr", "dl"]).default("ur"),
  drop: z.boolean().default(false).describe("A dashed line straight down to the plane z = 0 (shows the height)"),
});

export function Point3D(props: z.input<typeof point3DSchema>) {
  const p = parseProps("Point3D", point3DSchema, props);
  const c = use3("Point3D");
  const start = startOf(c, p.at, 0.8);
  const k = lin(c.t, start, 0.5);
  if (k <= 0) return null;
  const x = evalCoord(p.x, c, start);
  const y = evalCoord(p.y, c, start);
  const zz = evalCoord(p.z, c, start);
  const [px, py] = c.project(x, y, zz);
  const tone = p.color as ColorName;
  const base = c.project(x, y, c.ranges.z[0] <= 0 && c.ranges.z[1] >= 0 ? 0 : c.ranges.z[0]);
  return (
    <g opacity={Math.min(1, k * 2)}>
      {p.drop ? <line x1={px} y1={py} x2={base[0]} y2={base[1]} stroke={color(tone)} strokeOpacity={0.6} strokeWidth={2.5} strokeDasharray="8 7" /> : null}
      <circle cx={px} cy={py} r={p.size * (k < 1 ? 1 + 0.5 * Math.sin(Math.PI * k) : 1)} fill={color(tone)} stroke={colors.bg} strokeWidth={3} />
      {p.label ? (
        <Tag x={px} y={py} dir={p.labelDir as Dir} tone={tone} size={34} opacity={k}>
          <RichText text={p.label} />
        </Tag>
      ) : null}
    </g>
  );
}

export const point3DMeta: KitEntry = {
  name: "Point3D",
  category: "plot",
  summary: "A labelled point in Axes3D; coordinates can move by keyframes or with time; `drop` draws a line down to the floor.",
  useWhen: ["Marking points on a surface, extrema, positions of objects"],
  avoidWhen: ["Vertices of a pyramid/prism: Solid draws and labels them itself"],
  example: "three-surface.tsx",
  schema: point3DSchema,
};

export const vector3DSchema = z.object({
  to: z.tuple([coord, coord, coord]).describe("Components [x, y, z]"),
  from: triple.default([0, 0, 0]),
  at: atSchema.optional(),
  color: colorEnum.default("accent"),
  label: z.string().optional(),
  width: z.number().min(2).max(12).default(6),
});

export function Vector3D(props: z.input<typeof vector3DSchema>) {
  const p = parseProps("Vector3D", vector3DSchema, props);
  const c = use3("Vector3D");
  const start = startOf(c, p.at, 0.8);
  const k = ease(lin(c.t, start, 0.7));
  const [vx, vy, vz] = p.to.map((v) => evalCoord(v, c, start));
  const [fx, fy, fz] = p.from;
  const A = c.project(fx, fy, fz);
  const B = c.project(fx + vx, fy + vy, fz + vz);
  return <ArrowShape from={[A[0], A[1]]} to={[B[0], B[1]]} tone={p.color as ColorName} k={k} width={p.width} label={p.label} />;
}

export const vector3DMeta: KitEntry = {
  name: "Vector3D",
  category: "plot",
  summary: "A vector arrow in Axes3D, growing from `from`; components can move.",
  useWhen: ["Vectors in space, cross products, normals, gradients"],
  avoidWhen: ["Vectors in the plane: use Vector in Axes"],
  example: "three-surface.tsx",
  schema: vector3DSchema,
};

export const segment3DSchema = z.object({
  from: triple,
  to: triple,
  at: atSchema.optional(),
  color: colorEnum.default("text"),
  width: z.number().min(1).max(12).default(4),
  dashed: z.boolean().default(false),
  label: z.string().optional(),
});

export function Segment3D(props: z.input<typeof segment3DSchema>) {
  const p = parseProps("Segment3D", segment3DSchema, props);
  const c = use3("Segment3D");
  const k = ease(lin(c.t, startOf(c, p.at, 0.7), 0.7));
  if (k <= 0) return null;
  const A = c.project(...p.from);
  const B = c.project(...(p.from.map((v, i) => v + (p.to[i] - v) * k) as V3));
  const tone = p.color as ColorName;
  return (
    <g>
      <line x1={A[0]} y1={A[1]} x2={B[0]} y2={B[1]} stroke={color(tone)} strokeWidth={p.width} strokeLinecap="round" strokeDasharray={p.dashed ? "12 10" : undefined} />
      {p.label ? (
        <Tag x={(A[0] + B[0]) / 2} y={(A[1] + B[1]) / 2} dir="ur" tone={tone} size={32} opacity={Math.max(0, (k - 0.6) / 0.4)}>
          <RichText text={p.label} />
        </Tag>
      ) : null}
    </g>
  );
}

export const segment3DMeta: KitEntry = {
  name: "Segment3D",
  category: "plot",
  summary: "A segment between two points in Axes3D, drawing itself.",
  useWhen: ["Connecting lines, projections, distances in space (outside a Solid)"],
  avoidWhen: ["Edges of a polyhedron: declare them in Solid so hidden ones are dashed"],
  schema: segment3DSchema,
};

/* -------------------------------------------------------------------- Solid */

const edgeItem = z.union([
  z.string(),
  z.object({ e: z.string().describe('Edge, e.g. "SA" or "A\'-B\'"'), at: atSchema.optional(), color: colorEnum.optional(), width: z.number().optional() }),
]);

export const solidSchema = z.object({
  points: z.record(z.string(), triple).describe('Named points: { S: [0, 0, 3], A: [-1, -1, 0], … }; helper points can be added (midpoint M, center O, foot of the altitude H)'),
  edges: z.array(edgeItem).min(1).describe('Edges/segments to draw: "SA", "AB", "SO" (multi-character names use a dash: "A\'-B\'"). Segments behind or inside the solid are DASHED automatically'),
  faces: z
    .array(z.object({ p: z.string().describe('Vertex names of the face, e.g. "SAB" or "A-B-C"'), at: atSchema.optional(), color: colorEnum.default("info"), outAt: atSchema.optional() }))
    .default([])
    .describe("Faces/cross-sections tinted (side face SAB, a cross-section, the plane (SBD))"),
  at: atSchema.optional().describe("When drawing starts; edges appear one by one"),
  stagger: z.number().min(0).max(1).default(0.18).describe("Delay between edges while drawing (seconds)"),
  color: colorEnum.default("text"),
  labels: z.boolean().default(true).describe("Write the point names"),
  hidden: z.boolean().default(true).describe("Dash hidden segments automatically (for the current camera angle)"),
});

/** Split "SAB" / "A'-B'-C" into point names, longest names first. */
function parseNames(s: string, names: string[]): string[] {
  if (s.includes("-")) return s.split("-").map((x) => x.trim()).filter(Boolean);
  const sorted = [...names].sort((a, b) => b.length - a.length);
  const out: string[] = [];
  let i = 0;
  while (i < s.length) {
    if (s[i] === " ") {
      i++;
      continue;
    }
    const hit = sorted.find((n) => s.startsWith(n, i));
    if (!hit) throw new Error(`<Solid> has no point named "${s.slice(i)}" (in "${s}"). Points: ${names.join(", ")}`);
    out.push(hit);
    i += hit.length;
  }
  return out;
}

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** Outward planes of the convex hull of the points: [normal, offset]. Brute force; solids have few points. */
function hullPlanes(pts: V3[]): { n: V3; d: number }[] {
  const planes: { n: V3; d: number }[] = [];
  const size = Math.max(1e-9, ...pts.flatMap((p) => p.map(Math.abs)));
  const eps = 1e-7 * size * size;
  for (let i = 0; i < pts.length; i++)
    for (let j = i + 1; j < pts.length; j++)
      for (let k = j + 1; k < pts.length; k++) {
        let n = cross(sub(pts[j], pts[i]), sub(pts[k], pts[i]));
        const len = Math.hypot(...n);
        if (len < eps) continue;
        n = [n[0] / len, n[1] / len, n[2] / len];
        let d = dot(n, pts[i]);
        let pos = 0;
        let neg = 0;
        for (const q of pts) {
          const s = dot(n, q) - d;
          if (s > 1e-6 * size) pos++;
          else if (s < -1e-6 * size) neg++;
        }
        if (pos && neg) continue;
        if (pos) {
          n = [-n[0], -n[1], -n[2]];
          d = -d;
        }
        if (!planes.some((pl) => dot(pl.n, n) > 1 - 1e-6 && Math.abs(pl.d - d) < 1e-6 * size)) planes.push({ n, d });
      }
  return planes;
}

export function Solid(props: z.input<typeof solidSchema>) {
  const p = parseProps("Solid", solidSchema, props);
  const c = use3("Solid");
  const start = startOf(c, p.at, 0.6);
  if (c.t < start) return null;
  const names = Object.keys(p.points);
  const P = p.points as Record<string, V3>;
  const all = names.map((n) => P[n]);
  const planes = all.length >= 4 ? hullPlanes(all) : [];
  const size = Math.max(1e-9, ...all.flatMap((q) => q.map(Math.abs)));
  // Hull normals live in math space; in box space a normal is divided by the axis scales.
  const front = (n: V3) => dot([n[0] / c.scale[0], n[1] / c.scale[1], n[2] / c.scale[2]], c.toCamera) > 1e-9;
  const onPlane = (q: V3, pl: { n: V3; d: number }) => Math.abs(dot(pl.n, q) - pl.d) < 1e-5 * size;
  // A segment is visible when it lies on a face turned toward the camera; otherwise it is behind or inside the solid.
  const visible = (a: V3, b: V3) => planes.length === 0 || planes.some((pl) => front(pl.n) && onPlane(a, pl) && onPlane(b, pl));
  const centroid = all.reduce<V3>((s, q) => [s[0] + q[0] / all.length, s[1] + q[1] / all.length, s[2] + q[2] / all.length], [0, 0, 0]);
  const cpx = c.project(...centroid);

  const faces = p.faces.map((f, i) => {
    const ids = parseNames(f.p, names);
    const fs = f.at === undefined ? start + 0.3 : resolveAt(f.at, c.timing);
    const k = ease(lin(c.t, fs, 0.7));
    const out = f.outAt === undefined ? 0 : lin(c.t, resolveAt(f.outAt, c.timing), 0.5);
    if (k <= 0 || out >= 1) return null;
    const pts = ids.map((id) => c.project(...P[id]));
    return <path key={`f${i}`} d={`M${pts.map((q) => `${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join(" L")} Z`} fill={color(f.color as ColorName)} fillOpacity={0.28 * k * (1 - out)} stroke="none" />;
  });

  const edges = p.edges.map((raw, i) => {
    const e = typeof raw === "string" ? { e: raw } : raw;
    const ids = parseNames(e.e, names);
    if (ids.length !== 2) throw new Error(`<Solid> edge "${e.e}" must have exactly two points.`);
    const a = P[ids[0]];
    const b = P[ids[1]];
    const es = e.at === undefined ? start + i * p.stagger : resolveAt(e.at, c.timing);
    const k = ease(lin(c.t, es, 0.5));
    if (k <= 0) return null;
    const A = c.project(...a);
    const B = c.project(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k);
    const hidden = p.hidden && !visible(a, b);
    const tone = (("color" in e && e.color) || p.color) as ColorName;
    return (
      <line
        key={`e${i}`}
        x1={A[0]}
        y1={A[1]}
        x2={B[0]}
        y2={B[1]}
        stroke={color(tone)}
        strokeOpacity={hidden ? 0.6 : 1}
        strokeWidth={("width" in e && e.width) || (hidden ? 3 : 4.5)}
        strokeLinecap="round"
        strokeDasharray={hidden ? "11 10" : undefined}
      />
    );
  });

  // A point appears with the first edge or face that uses it.
  const firstUse = new Map<string, number>();
  p.edges.forEach((raw, i) => {
    const e = typeof raw === "string" ? { e: raw } : raw;
    const es = e.at === undefined ? start + i * p.stagger : resolveAt(e.at, c.timing);
    for (const id of parseNames(e.e, names)) firstUse.set(id, Math.min(firstUse.get(id) ?? Infinity, es));
  });
  const labels = p.labels
    ? names.map((n) => {
        const s = firstUse.get(n);
        if (s === undefined) return null;
        const k = ease(lin(c.t, s, 0.5));
        const q = c.project(...P[n]);
        const ux = q[0] - cpx[0];
        const uy = q[1] - cpx[1];
        const len = Math.hypot(ux, uy);
        const dir: Dir = len < 8 ? "dr" : dirAway(ux / len, uy / len);
        return (
          <g key={`l${n}`} opacity={k}>
            <circle cx={q[0]} cy={q[1]} r={6} fill={color(p.color as ColorName)} />
            <Tag x={q[0]} y={q[1]} dir={dir} size={36} tone="text">
              <span style={{ fontStyle: "italic", fontFamily: fonts.serif }}>{n}</span>
            </Tag>
          </g>
        );
      })
    : null;

  return (
    <g>
      {faces}
      {edges}
      {labels}
    </g>
  );
}

export const solidMeta: KitEntry = {
  name: "Solid",
  category: "plot",
  summary:
    "A polyhedron for solid geometry: declare named point coordinates and a list of edges; edges appear one by one, point names sit outside the shape, hidden segments are DASHED AUTOMATICALLY and update with the camera; tint side faces / cross-sections with `faces`.",
  useWhen: ["Pyramid S.ABCD, tetrahedra, prisms, boxes, cubes", "Altitude SH, lines of intersection, cross-sections, the angle between a line and a plane"],
  avoidWhen: ["Solids of revolution, curved surfaces: use Surface / Curve3D"],
  example: "three-pyramid.tsx",
  schema: solidSchema,
};
