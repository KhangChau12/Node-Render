import React from "react";
import { interpolate } from "remotion";
import { z } from "zod";
import { parseProps, type KitEntry } from "../define";
import { color, colorNames, ease, fonts, sizes, type ColorName, type SizeName } from "../theme";
import { atSchema, resolveAt, useAt, useProgress, useSceneTime, useSceneTiming } from "../timing/context";
import { effectSchema, enterStyle, linear } from "./motion";
import { RichText } from "../components/richtext";

export * from "./motion";

export const colorSchema = z.enum(colorNames);
export const sizeSchema = z.enum(Object.keys(sizes) as [SizeName, ...SizeName[]]);

/* ------------------------------------------------------------------ FadeIn */

export const fadeInSchema = z.object({
  at: atSchema.default(0),
  delay: z.number().default(0).describe("Extra delay (seconds) after `at`"),
  duration: z.number().positive().default(0.6).describe("Time to appear (seconds)"),
  y: z.number().default(24).describe("How many px it slides up from"),
  x: z.number().default(0).describe("How many px it slides sideways"),
  scale: z.number().default(1).describe("Starting scale, e.g. 0.94"),
  outAt: atSchema.optional().describe("When it disappears (optional)"),
  effect: effectSchema.default("up"),
});

export function FadeIn(props: z.input<typeof fadeInSchema> & { children?: React.ReactNode; style?: React.CSSProperties }) {
  const p = parseProps("FadeIn", fadeInSchema, props);
  const start = useAt(p.at) + p.delay;
  const outStart = useAt(p.outAt ?? Number.POSITIVE_INFINITY);
  const t = useSceneTime();
  const lp = linear(t, start, p.duration);
  const outP = p.outAt === undefined ? 0 : interpolate(t, [outStart, outStart + 0.4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fx = enterStyle(p.effect, lp, p.y);
  // Legacy x / scale props still apply on top of the effect.
  const k = useProgress(p.at, p.duration, p.delay);
  const extra = `${p.x ? ` translateX(${p.x * (1 - k)}px)` : ""}${p.scale !== 1 ? ` scale(${p.scale + (1 - p.scale) * k})` : ""}`;
  return (
    <div
      style={{
        ...fx,
        opacity: (fx.opacity === undefined ? 1 : Number(fx.opacity)) * (1 - outP),
        transform: `${fx.transform ?? ""}${extra}` || undefined,
        ...props.style,
      }}
    >
      {p.children}
    </div>
  );
}

export const fadeInMeta: KitEntry = {
  name: "FadeIn",
  category: "primitive",
  summary: "Makes a block of content appear at a given time with an effect (slide, pop, zoom, blur, wipe, flip).",
  useWhen: ["Custom content that must appear exactly when the narration mentions it", "Wrapping an element that has no `at` prop of its own"],
  avoidWhen: ["Components that already have their own `at` (TitleCard, Formula, Graph…)"],
  children: "Content to show",
  schema: fadeInSchema,
};

/* ----------------------------------------------------------------- Stagger */

export const staggerSchema = z.object({
  at: atSchema.default(0),
  gap: z.number().default(0.35).describe("Delay between children (seconds)"),
  duration: z.number().positive().default(0.6),
  y: z.number().default(24),
  effect: effectSchema.default("up"),
});

export function Stagger(props: z.input<typeof staggerSchema> & { children?: React.ReactNode }) {
  const p = parseProps("Stagger", staggerSchema, props);
  return (
    <>
      {React.Children.toArray(p.children).map((child, i) => (
        <FadeIn key={i} at={p.at} delay={i * p.gap} duration={p.duration} y={p.y} effect={p.effect}>
          {child}
        </FadeIn>
      ))}
    </>
  );
}

export const staggerMeta: KitEntry = {
  name: "Stagger",
  category: "primitive",
  summary: "Makes its children appear one after another, `gap` seconds apart.",
  useWhen: ["A group of custom elements appearing in sequence"],
  avoidWhen: ["Bullet lists: use BulletReveal"],
  children: "Elements appearing in turn",
  schema: staggerSchema,
};

/* -------------------------------------------------------------- Typewriter */

export const typewriterSchema = z.object({
  text: z.string().describe("Text to type out"),
  at: atSchema.default(0),
  cps: z.number().positive().default(28).describe("Characters per second"),
  size: sizeSchema.default("body"),
  color: colorSchema.default("text"),
  mono: z.boolean().default(false),
  cursor: z.boolean().default(true),
});

export function Typewriter(props: z.input<typeof typewriterSchema>) {
  const p = parseProps("Typewriter", typewriterSchema, props);
  const start = useAt(p.at);
  const t = useSceneTime();
  const chars = Array.from(p.text);
  const n = Math.max(0, Math.min(chars.length, Math.floor((t - start) * p.cps)));
  const blink = Math.floor(t * 2) % 2 === 0;
  return (
    <span style={{ fontFamily: p.mono ? fonts.mono : fonts.sans, fontSize: sizes[p.size], color: color(p.color), whiteSpace: "pre-wrap" }}>
      {chars.slice(0, n).join("")}
      {p.cursor && t >= start && (n < chars.length || blink) ? <span style={{ color: color("accent") }}>▍</span> : null}
    </span>
  );
}

export const typewriterMeta: KitEntry = {
  name: "Typewriter",
  category: "primitive",
  summary: "Types text out character by character, like a typewriter.",
  useWhen: ["An opening question, a short definition to stress"],
  avoidWhen: ["Text longer than 2 lines", "Code: use CodeBlock"],
  schema: typewriterSchema,
};

/* ---------------------------------------------------------------- DrawPath */

export const drawPathSchema = z.object({
  d: z.string().describe("The d attribute of an SVG path"),
  at: atSchema.default(0),
  duration: z.number().positive().default(1),
  color: colorSchema.default("text"),
  width: z.number().default(4),
  fill: z.union([colorSchema, z.literal("none")]).default("none"),
});

/** Must be placed inside an <svg>. */
export function DrawPath(props: z.input<typeof drawPathSchema>) {
  const p = parseProps("DrawPath", drawPathSchema, props);
  const k = useProgress(p.at, p.duration);
  return (
    <path
      d={p.d}
      pathLength={1}
      strokeDasharray={1}
      strokeDashoffset={1 - k}
      stroke={color(p.color)}
      strokeWidth={p.width}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill={p.fill === "none" ? "none" : color(p.fill as ColorName)}
      fillOpacity={p.fill === "none" ? 0 : k}
    />
  );
}

export const drawPathMeta: KitEntry = {
  name: "DrawPath",
  category: "primitive",
  summary: "Draws an SVG path progressively from start to end. Must be placed inside an <svg>.",
  useWhen: ["Hand-drawn shapes, arrows, custom outlines"],
  avoidWhen: ["Function graphs: use Graph", "Block diagrams: use Diagram"],
  schema: drawPathSchema,
};

/* --------------------------------------------------------------- Highlight */

export const highlightSchema = z.object({
  at: atSchema.default(0),
  color: colorSchema.default("accent"),
  duration: z.number().positive().default(0.5),
  mode: z.enum(["underline", "marker", "text"]).default("marker").describe("marker: highlights the background, underline: underlines, text: recolors the text"),
});

export function Highlight(props: z.input<typeof highlightSchema> & { children?: React.ReactNode }) {
  const p = parseProps("Highlight", highlightSchema, props);
  const k = useProgress(p.at, p.duration);
  const c = color(p.color);
  if (p.mode === "text") {
    return <span style={{ color: k > 0.5 ? c : undefined, transition: "none" }}>{p.children}</span>;
  }
  const bg =
    p.mode === "marker"
      ? `linear-gradient(${c}40, ${c}40) no-repeat 0 85% / ${k * 100}% 45%`
      : `linear-gradient(${c}, ${c}) no-repeat 0 100% / ${k * 100}% 4px`;
  return <span style={{ background: bg, paddingBottom: p.mode === "underline" ? 4 : 0 }}>{p.children}</span>;
}

export const highlightMeta: KitEntry = {
  name: "Highlight",
  category: "primitive",
  summary: "Highlights, underlines or recolors a phrase exactly when the narration mentions it.",
  useWhen: ["Stressing a key term in a sentence on screen"],
  avoidWhen: ["Highlighting a whole long passage"],
  children: "Phrase to emphasise",
  schema: highlightSchema,
};

/* ------------------------------------------------------------ Stack / Row */

const alignMap = { start: "flex-start", center: "center", end: "flex-end", stretch: "stretch" } as const;

export const stackSchema = z.object({
  gap: z.number().min(0).default(32).describe("Space between elements (px)"),
  align: z.enum(["start", "center", "end", "stretch"]).default("center").describe("Horizontal alignment of the elements"),
});

/** Vertical flow layout: the way to put several elements in one place without absolute positioning. */
export function Stack(props: z.input<typeof stackSchema> & { children?: React.ReactNode }) {
  const p = parseProps("Stack", stackSchema, props);
  return <div style={{ display: "flex", flexDirection: "column", gap: p.gap, alignItems: alignMap[p.align] }}>{p.children}</div>;
}

export const stackMeta: KitEntry = {
  name: "Stack",
  category: "primitive",
  summary: "Stacks its children vertically, `gap` apart. The way to put several elements in one area.",
  useWhen: ["An area with 2–3 stacked elements: formula above, graph below; array above, note below"],
  avoidWhen: ["Side by side: use Row", "Two halves of the screen: use the TwoColumn layout"],
  children: "Elements stacked vertically",
  schema: stackSchema,
};

export const rowSchema = z.object({
  gap: z.number().min(0).default(48),
  align: z.enum(["start", "center", "end", "stretch"]).default("center").describe("Vertical alignment of the elements"),
  justify: z.enum(["start", "center", "end", "between"]).default("center"),
});

/** Horizontal flow layout. */
export function Row(props: z.input<typeof rowSchema> & { children?: React.ReactNode }) {
  const p = parseProps("Row", rowSchema, props);
  const justify = p.justify === "between" ? "space-between" : alignMap[p.justify];
  // Items keep their natural width (no wrapping inside a row); the layout shrinks the whole row if needed.
  return (
    <div style={{ display: "flex", flexDirection: "row", flexWrap: "nowrap", gap: p.gap, alignItems: alignMap[p.align], justifyContent: justify }}>
      {React.Children.map(p.children, (c) => (c === null || c === undefined || c === false ? null : <div style={{ flex: "none" }}>{c}</div>))}
    </div>
  );
}

export const rowMeta: KitEntry = {
  name: "Row",
  category: "primitive",
  summary: "Lays its children out in a horizontal row, `gap` apart.",
  useWhen: ["2–4 small elements side by side: label + formula, status boxes"],
  avoidWhen: ["Two halves of the screen with a scene title: use TwoColumn", "Comparing options: use Cards"],
  children: "Elements laid out horizontally",
  schema: rowSchema,
};

/* ------------------------------------------------------------------ Switch */

export const switchSchema = z.object({
  at: z.array(atSchema).min(1).describe("When each child appears, in order: child k shows from at[k] and replaces the previous one"),
  duration: z.number().positive().default(0.45).describe("Transition time (seconds)"),
  effect: z.enum(["fade", "up", "left", "flip", "zoom"]).default("up").describe("Transition: up (old content drifts up, new rises in), left slides sideways, flip, zoom, fade"),
});

/**
 * Shows one child at a time in the same spot, cross-fading at each `at`.
 * Children share one grid cell, so the layout is as big as the largest child,
 * never the sum (unlike several FadeIn with outAt stacked in a column).
 */
export function Switch(props: z.input<typeof switchSchema> & { children?: React.ReactNode }) {
  const p = parseProps("Switch", switchSchema, props);
  const kids = React.Children.toArray(p.children);
  if (kids.length !== p.at.length) throw new Error(`<Switch> has ${kids.length} children but ${p.at.length} times in \`at\`; the two numbers must match.`);
  const timing = useSceneTiming();
  const t = useSceneTime();
  const starts = p.at.map((a) => resolveAt(a, timing));
  return (
    <div style={{ display: "grid", justifyItems: "center", alignItems: "center" }}>
      {kids.map((child, i) => {
        const inK = linear(t, starts[i], p.duration);
        const next = starts[i + 1];
        const outK = next === undefined ? 0 : linear(t, next, p.duration);
        const fx = enterStyle(p.effect, inK, 26);
        // Outgoing content leaves in the opposite direction of the incoming one.
        const leave = p.effect === "up" ? `translateY(${-outK * 26}px)` : p.effect === "left" ? `translateX(${-outK * 42}px)` : p.effect === "zoom" ? `scale(${1 - 0.15 * outK})` : "";
        return (
          <div key={i} style={{ gridArea: "1 / 1", ...fx, opacity: (fx.opacity === undefined ? 1 : Number(fx.opacity)) * (1 - outK), transform: `${fx.transform ?? ""} ${leave}` }}>
            {child}
          </div>
        );
      })}
    </div>
  );
}

export const switchMeta: KitEntry = {
  name: "Switch",
  category: "primitive",
  summary: "Shows its children one at a time IN THE SAME PLACE, each replacing the previous one. Takes the space of the largest child.",
  useWhen: ["Replacing content with the narration: note for step 1 → step 2, formula before → after", "Instead of several stacked FadeIn with outAt: those keep taking space even when faded"],
  avoidWhen: ["Elements that must show together: use Stack or Stagger"],
  children: "Elements replacing each other, as many as the entries in `at`",
  example: "code-steps.tsx",
  schema: switchSchema,
};

/* ------------------------------------------------------------------ Panels */

export const panelsSchema = z.object({
  columns: z.number().int().min(1).max(4).default(2).describe("Number of columns; children wrap when a row is full (2 columns × 2 rows for 4 panels)"),
  titles: z.array(z.string()).optional().describe("Small title of each panel, supports $…$"),
  at: z.array(atSchema).optional().describe("When each panel appears (all at once by default)"),
  gap: z.number().min(0).max(120).default(48),
  frame: z.boolean().default(true).describe("Border and light background for each panel"),
  focus: z.array(z.object({ at: atSchema, index: z.number().int().nullable() })).default([]).describe("Highlight one panel (the others dim)"),
});

/** Several views of one problem side by side: figure, graph, table, working. */
export function Panels(props: z.input<typeof panelsSchema> & { children?: React.ReactNode }) {
  const p = parseProps("Panels", panelsSchema, props);
  const timing = useSceneTiming();
  const t = useSceneTime();
  const kids = React.Children.toArray(p.children);
  let focus: number | null = null;
  for (const f of p.focus) if (t >= resolveAt(f.at, timing)) focus = f.index;
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(p.columns, kids.length)}, auto)`, gap: p.gap, alignItems: "stretch", justifyContent: "center" }}>
      {kids.map((child, i) => {
        const k = p.at?.[i] === undefined ? 1 : ease(linear(t, resolveAt(p.at[i], timing), 0.6));
        const on = focus === i;
        return (
          <div
            key={i}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 18,
              padding: p.frame ? "22px 28px" : 0,
              borderRadius: 20,
              background: p.frame ? color("surface") : undefined,
              border: p.frame ? `2px solid ${on ? color("accent") : color("grid")}` : undefined,
              opacity: k * (focus !== null && !on ? 0.4 : 1),
              transform: `translateY(${(1 - k) * 24}px)`,
            }}
          >
            {p.titles?.[i] ? (
              <div style={{ fontFamily: fonts.mono, fontSize: sizes.label, letterSpacing: 2, textTransform: "uppercase", color: on ? color("accent") : color("muted"), alignSelf: "flex-start" }}>
                <RichText text={p.titles[i]} />
              </div>
            ) : null}
            {child}
          </div>
        );
      })}
    </div>
  );
}

export const panelsMeta: KitEntry = {
  name: "Panels",
  category: "primitive",
  summary: "A grid of 2–4 panels with small titles, each a view of the same problem (figure, graph, table, working); panels appear in turn, `focus` highlights the one being discussed.",
  useWhen: ["Complex problems that need several representations at once: figure + graph + working", "Comparing 3–4 cases (a > 0, a = 0, a < 0)"],
  avoidWhen: ["Just a left and a right part under a scene title: use TwoColumn", "A single illustration: Panels are not needed"],
  children: "2–4 elements, one panel each (keep each panel compact: Axes ≤ 760 × 460)",
  example: "panels-problem.tsx",
  schema: panelsSchema,
};
