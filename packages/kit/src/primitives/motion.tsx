import React from "react";
import { Easing, interpolate } from "remotion";
import { z } from "zod";
import { parseProps, type KitEntry } from "../define";
import { contentLanguage, groupThousands } from "../locale";
import { color, colorNames, ease, fonts, sizes, type ColorName } from "../theme";
import { atSchema, resolveAt, useSceneTime, useSceneTiming, type At } from "../timing/context";
import { RichText } from "../components/richtext";

/*
 * Motion vocabulary shared by the kit: entrance effects, emphasis, keyframed
 * movement, camera moves, counters and arrows. Every motion is a pure function
 * of the scene time, so rendering stays deterministic.
 */

const colorEnum = z.enum(colorNames);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const overshoot = Easing.out(Easing.back(1.7));

/* ---------------------------------------------------------------- Effects */

export const effectSchema = z
  .enum(["up", "down", "left", "right", "fade", "pop", "zoom", "blur", "wipe", "flip"])
  .describe("Entrance: up/down/left/right slide in, pop bounces in, zoom grows from small, blur comes into focus, wipe sweeps from the left, flip flips in, fade only fades");
export type Effect = z.infer<typeof effectSchema>;

/**
 * Style of an element entering with `effect`, at linear progress `p` (0→1).
 * `dist` is the travel distance for sliding effects.
 */
export function enterStyle(effect: Effect, p: number, dist = 28): React.CSSProperties {
  const e = ease(Math.min(1, Math.max(0, p)));
  const o = overshoot(Math.min(1, Math.max(0, p)));
  switch (effect) {
    case "fade":
      return { opacity: e };
    case "down":
      return { opacity: e, transform: `translateY(${-(1 - e) * dist}px)` };
    case "left":
      return { opacity: e, transform: `translateX(${(1 - e) * dist * 1.6}px)` };
    case "right":
      return { opacity: e, transform: `translateX(${-(1 - e) * dist * 1.6}px)` };
    case "pop":
      return { opacity: Math.min(1, p * 2.5), transform: `scale(${0.55 + 0.45 * o})` };
    case "zoom":
      return { opacity: e, transform: `scale(${1.25 - 0.25 * e})` };
    case "blur":
      return { opacity: e, filter: `blur(${(1 - e) * 14}px)` };
    case "wipe":
      return { clipPath: `inset(0 ${(1 - e) * 100}% 0 0)` };
    case "flip":
      return { opacity: Math.min(1, p * 2), transform: `perspective(900px) rotateX(${(1 - o) * 80}deg)`, transformOrigin: "50% 100%" };
    case "up":
    default:
      return { opacity: e, transform: `translateY(${(1 - e) * dist}px)` };
  }
}

/** Linear 0→1 progress between start and start+duration (no hooks; usable in loops). */
export function linear(t: number, start: number, duration: number): number {
  if (duration <= 0) return t >= start ? 1 : 0;
  return interpolate(t, [start, start + duration], [0, 1], clamp);
}

const atList = z.union([atSchema, z.array(atSchema)]);
const toList = (a: At | At[]): At[] => (Array.isArray(a) ? a : [a]);

/* ------------------------------------------------------------------- Pulse */

export const pulseSchema = z.object({
  at: atList.describe("One or more moments of emphasis, e.g. [\"cue:note that\", \"cue:important\"]"),
  mode: z.enum(["scale", "glow", "ring", "shake", "bounce"]).default("scale").describe("scale swells slightly, glow shines, ring spreads a ring, shake shakes (error/wrong), bounce jumps"),
  color: colorEnum.default("accent"),
  strength: z.number().min(0.2).max(3).default(1),
  duration: z.number().positive().default(0.7),
});

/** Brief emphasis on its children at each `at`: the "look here" of motion design. */
export function Pulse(props: z.input<typeof pulseSchema> & { children?: React.ReactNode }) {
  const p = parseProps("Pulse", pulseSchema, props);
  const timing = useSceneTiming();
  const t = useSceneTime();
  const c = color(p.color as ColorName);
  // Strongest pulse currently running.
  let k = 0;
  let q = 0;
  for (const a of toList(p.at)) {
    const s = resolveAt(a, timing);
    if (t >= s && t <= s + p.duration) {
      const lp = (t - s) / p.duration;
      const v = Math.sin(Math.PI * lp);
      if (v > k) {
        k = v;
        q = lp;
      }
    }
  }
  const st = p.strength;
  let style: React.CSSProperties = {};
  if (p.mode === "scale") style = { transform: `scale(${1 + 0.09 * st * k})` };
  else if (p.mode === "glow") style = { filter: k > 0 ? `drop-shadow(0 0 ${18 * st * k}px ${c})` : undefined };
  else if (p.mode === "shake") style = { transform: `translateX(${Math.sin(q * Math.PI * 8) * 14 * st * (1 - q)}px)` };
  else if (p.mode === "bounce") style = { transform: `translateY(${-28 * st * k}px)` };
  const ring = p.mode === "ring" && k > 0;
  return (
    <div style={{ display: "inline-block", position: "relative", ...style }}>
      {p.children}
      {ring ? (
        <div style={{ position: "absolute", inset: -10 - 30 * q * st, border: `4px solid ${c}`, borderRadius: 16, opacity: 1 - q, pointerEvents: "none" }} />
      ) : null}
    </div>
  );
}

export const pulseMeta: KitEntry = {
  name: "Pulse",
  category: "primitive",
  summary: "Brief emphasis on its children at one or more moments: swell, glow, ring, shake, bounce.",
  useWhen: ["The narration says \"note that\", \"important\", \"this is exactly\"", "Marking a result just computed", "shake when talking about a mistake"],
  avoidWhen: ["Emphasis all through the scene: keep it for key moments"],
  children: "Element to emphasise",
  example: "motion.tsx",
  schema: pulseSchema,
};

/* ----------------------------------------------------------------- Animate */

const keySchema = z.object({
  at: atSchema,
  x: z.number().optional().describe("Horizontal offset (px) from its place"),
  y: z.number().optional().describe("Vertical offset (px) from its place"),
  scale: z.number().optional(),
  rotate: z.number().optional().describe("Rotation"),
  opacity: z.number().min(0).max(1).optional(),
});

export const animateSchema = z.object({
  keys: z.array(keySchema).min(1).describe("States over time; moves smoothly between keys. Properties not given keep their previous value"),
  from: keySchema.omit({ at: true }).default({}).describe("State before the first key"),
  duration: z.number().positive().default(0.7).describe("Transition time between two states"),
  spring: z.boolean().default(false).describe("Transition with a slight bounce"),
});

/** Moves / scales / rotates its children between keyframes, relative to where layout put them. */
export function Animate(props: z.input<typeof animateSchema> & { children?: React.ReactNode }) {
  const p = parseProps("Animate", animateSchema, props);
  const timing = useSceneTiming();
  const t = useSceneTime();
  type S = { x: number; y: number; scale: number; rotate: number; opacity: number };
  let cur: S = { x: 0, y: 0, scale: 1, rotate: 0, opacity: 1, ...p.from };
  for (const k of p.keys) {
    const s = resolveAt(k.at, timing);
    const target: S = { x: k.x ?? cur.x, y: k.y ?? cur.y, scale: k.scale ?? cur.scale, rotate: k.rotate ?? cur.rotate, opacity: k.opacity ?? cur.opacity };
    const lp = linear(t, s, p.duration);
    const e = p.spring ? overshoot(lp) : ease(lp);
    const mix = (a: number, b: number) => a + (b - a) * e;
    cur = { x: mix(cur.x, target.x), y: mix(cur.y, target.y), scale: mix(cur.scale, target.scale), rotate: mix(cur.rotate, target.rotate), opacity: mix(cur.opacity, target.opacity) };
  }
  return (
    <div style={{ transform: `translate(${cur.x}px, ${cur.y}px) scale(${cur.scale}) rotate(${cur.rotate}deg)`, opacity: Math.max(0, Math.min(1, cur.opacity)) }}>
      {p.children}
    </div>
  );
}

export const animateMeta: KitEntry = {
  name: "Animate",
  category: "primitive",
  summary: "Moves, scales, rotates or fades its children through keyframes, relative to where the layout placed them.",
  useWhen: ["An element moving aside / shrinking to make room for what comes next", "Objects moving with a purpose: rolling, sliding, falling"],
  avoidWhen: ["Just appearing: use FadeIn with an effect", "Initial placement: use Stack/Row, never Animate to lay out a page"],
  children: "Element to move",
  example: "motion.tsx",
  schema: animateSchema,
};

/* ------------------------------------------------------------------ Camera */

export const cameraSchema = z.object({
  keys: z
    .array(
      z.object({
        at: atSchema,
        zoom: z.number().min(0.5).max(4).default(1),
        x: z.number().min(0).max(1).default(0.5).describe("Horizontal center of the area to look at, across the child (0 = left edge, 0.5 = middle)"),
        y: z.number().min(0).max(1).default(0.5).describe("Vertical center of the area to look at (put it on the thing to see, e.g. the row of array cells)"),
      }),
    )
    .min(1)
    .describe("Camera keys: zoom into an area, then back out"),
  duration: z.number().positive().default(1.1),
  room: z.number().min(0).max(400).default(140).describe("Space (px) above and below the child so zooming does not crop it"),
});

/** Zooms and pans over its children, like a camera, clipped to its own box. */
export function Camera(props: z.input<typeof cameraSchema> & { children?: React.ReactNode }) {
  const p = parseProps("Camera", cameraSchema, props);
  const timing = useSceneTiming();
  const t = useSceneTime();
  let cur = { zoom: 1, x: 0.5, y: 0.5 };
  for (const k of p.keys) {
    const e = ease(linear(t, resolveAt(k.at, timing), p.duration));
    cur = { zoom: cur.zoom + (k.zoom - cur.zoom) * e, x: cur.x + (k.x - cur.x) * e, y: cur.y + (k.y - cur.y) * e };
  }
  // Bring the focus point to the centre of the box, then scale: a real camera move.
  return (
    <div style={{ overflow: "hidden", position: "relative", padding: `${p.room}px 0` }}>
      <div style={{ transformOrigin: "0 0", transform: `translate(50%, 50%) scale(${cur.zoom}) translate(${-cur.x * 100}%, ${-cur.y * 100}%)` }}>{p.children}</div>
    </div>
  );
}

export const cameraMeta: KitEntry = {
  name: "Camera",
  category: "primitive",
  summary: "Virtual camera: zooms into an area of its child (e.g. part of an array, a branch of a tree) and back out, with smooth motion.",
  useWhen: ["The narration moves attention to a detail: \"look at the left half\", \"consider this subarray\"", "Opening on a close-up, then pulling back to the whole picture"],
  avoidWhen: ["Zooming constantly for no reason", "Wrapping the whole layout: wrap only the illustration inside it"],
  children: "One illustration element",
  example: "camera-split.tsx",
  schema: cameraSchema,
};

/* ----------------------------------------------------------------- Counter */

export const counterSchema = z.object({
  value: z.number().describe("Target value"),
  from: z.number().default(0),
  at: atSchema.default(0).describe("When counting starts"),
  duration: z.number().positive().default(1.4),
  steps: z.array(z.object({ at: atSchema, value: z.number() })).default([]).describe("Keep counting to new values at later times"),
  decimals: z.number().int().min(0).max(4).default(0),
  prefix: z.string().default(""),
  suffix: z.string().default(""),
  label: z.string().optional().describe("Small label above the number"),
  size: z.number().min(28).default(96),
  color: colorEnum.default("accent"),
});

function formatNumber(v: number, decimals: number): string {
  const [i, d] = v.toFixed(decimals).split(".");
  const grouped = groupThousands(i);
  return d ? `${grouped}${contentLanguage() === "vi" ? "," : "."}${d}` : grouped;
}

/** A number that counts up (or down) to its value, then to each step's value. */
export function Counter(props: z.input<typeof counterSchema>) {
  const p = parseProps("Counter", counterSchema, props);
  const timing = useSceneTiming();
  const t = useSceneTime();
  const phases = [{ at: resolveAt(p.at, timing), value: p.value }, ...p.steps.map((s) => ({ at: resolveAt(s.at, timing), value: s.value }))];
  let v = p.from;
  for (const ph of phases) {
    const e = Easing.out(Easing.cubic)(linear(t, ph.at, p.duration));
    v = v + (ph.value - v) * e;
  }
  const shown = t >= phases[0].at;
  const k = ease(linear(t, phases[0].at, 0.4));
  // Reserve the width of the widest value so neighbours do not shift while counting.
  const widest = [p.from, ...phases.map((ph) => ph.value)].map((x) => `${p.prefix}${formatNumber(x, p.decimals)}${p.suffix}`).sort((a, b) => b.length - a.length)[0];
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, opacity: shown ? k : 0 }}>
      {p.label ? <div style={{ fontFamily: fonts.mono, fontSize: sizes.label, letterSpacing: 2, textTransform: "uppercase", color: color("muted") }}><RichText text={p.label} /></div> : null}
      <div style={{ display: "grid", fontFamily: fonts.mono, fontSize: p.size, fontWeight: 600, color: color(p.color as ColorName), fontVariantNumeric: "tabular-nums", lineHeight: 1, whiteSpace: "nowrap", textAlign: "center" }}>
        <span style={{ gridArea: "1/1", visibility: "hidden" }}>{widest}</span>
        <span style={{ gridArea: "1/1" }}>
          {p.prefix}
          {formatNumber(v, p.decimals)}
          {p.suffix}
        </span>
      </div>
    </div>
  );
}

export const counterMeta: KitEntry = {
  name: "Counter",
  category: "primitive",
  summary: "A number that counts up to its target, and can keep counting to new values with the narration.",
  useWhen: ["Numbers of comparisons, running times, results of a calculation", "Showing a number shoot up: 10 000 → 1 000 000"],
  avoidWhen: ["A static number: use plain text"],
  example: "motion.tsx",
  schema: counterSchema,
};

/* ------------------------------------------------------------------- Arrow */

export const arrowSchema = z.object({
  at: atSchema.default(0),
  direction: z.enum(["right", "left", "down", "up"]).default("right"),
  length: z.number().min(40).max(600).default(140),
  label: z.string().optional().describe("Label on the arrow, supports $…$"),
  color: colorEnum.default("muted"),
  duration: z.number().positive().default(0.6),
  flow: z.boolean().default(false).describe("A bright dot travelling along the arrow continuously once drawn (flow)"),
});

/** An arrow that draws itself; put it between elements in a Row or Stack. */
export function Arrow(props: z.input<typeof arrowSchema>) {
  const p = parseProps("Arrow", arrowSchema, props);
  const start = resolveAt(p.at, useSceneTiming());
  const t = useSceneTime();
  const k = ease(linear(t, start, p.duration));
  const horizontal = p.direction === "right" || p.direction === "left";
  const L = p.length;
  const c = color(p.color as ColorName);
  const w = horizontal ? L : 40;
  const h = horizontal ? 40 : L;
  // Draw along +x, then rotate for other directions.
  const rot = { right: 0, down: 90, left: 180, up: 270 }[p.direction];
  const dot = p.flow && k >= 1 ? ((t - start - p.duration) * 0.9) % 1 : null;
  const arrow = (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: "visible", display: "block" }}>
      <g transform={`rotate(${rot} ${w / 2} ${h / 2}) translate(${(w - L) / 2} ${h / 2})`}>
        <line x1={0} y1={0} x2={(L - 14) * k} y2={0} stroke={c} strokeWidth={4} strokeLinecap="round" />
        {k > 0.85 ? <path d={`M ${L - 18} -10 L ${L} 0 L ${L - 18} 10 z`} fill={c} opacity={(k - 0.85) / 0.15} /> : null}
        {dot !== null ? <circle cx={dot * (L - 18)} cy={0} r={7} fill={color("accent")} /> : null}
      </g>
    </svg>
  );
  return (
    <div style={{ display: "flex", flexDirection: horizontal ? "column" : "row", alignItems: "center", gap: 6, opacity: k > 0 ? 1 : 0 }}>
      {p.label ? <div style={{ fontSize: sizes.small, color: color("muted"), opacity: k }}><RichText text={p.label} /></div> : null}
      {arrow}
    </div>
  );
}

export const arrowMeta: KitEntry = {
  name: "Arrow",
  category: "primitive",
  summary: "An arrow that draws itself (with a label, optionally a dot flowing along it), placed between elements in a Row/Stack.",
  useWhen: ["Transformations A → B: input → result, before → after", "A short chain of steps in one row"],
  avoidWhen: ["Diagrams with many nodes and edges: use Diagram"],
  example: "motion.tsx",
  schema: arrowSchema,
};
