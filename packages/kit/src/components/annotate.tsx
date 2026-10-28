import React, { useLayoutEffect, useRef, useState } from "react";
import { z } from "zod";
import { parseProps, type KitEntry } from "../define";
import { colorSchema, linear } from "../primitives";
import { color, ease, fonts, sizes, type ColorName } from "../theme";
import { atSchema, resolveAt, useSceneTime, useSceneTiming } from "../timing/context";
import { RichText } from "./formula";

/* ------------------------------------------------------------------- Brace */

export const braceSchema = z.object({
  label: z.string().optional().describe("Label under (or over) the brace, supports $…$"),
  dir: z.enum(["down", "up"]).default("down").describe("Brace below or above the content"),
  at: atSchema.default(0).describe("When the brace grows in"),
  color: colorSchema.default("accent"),
  size: z.number().min(24).max(72).default(36).describe("Label font size"),
});

/** A curly brace under/over its children, as wide as they are, with a label. */
export function Brace(props: z.input<typeof braceSchema> & { children?: React.ReactNode }) {
  const p = parseProps("Brace", braceSchema, props);
  const t = useSceneTime();
  const start = resolveAt(p.at, useSceneTiming());
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (el && Math.abs(el.offsetWidth - w) > 0.5) setW(el.offsetWidth);
  });
  const k = ease(linear(t, start, 0.6));
  const lk = ease(linear(t, start + 0.3, 0.5));
  const h = 30;
  const r = Math.min(22, w / 6);
  const m = w / 2;
  // Brace for "down"; mirrored for "up".
  const d = `M0 0 Q0 ${h / 2} ${r} ${h / 2} L${m - r} ${h / 2} Q${m} ${h / 2} ${m} ${h} Q${m} ${h / 2} ${m + r} ${h / 2} L${w - r} ${h / 2} Q${w} ${h / 2} ${w} 0`;
  const tone = color(p.color as ColorName);
  const brace = (
    <svg width={Math.max(1, w)} height={h} style={{ overflow: "visible", display: "block", transform: `scaleX(${k})${p.dir === "up" ? " scaleY(-1)" : ""}`, opacity: k > 0 ? 1 : 0 }}>
      <path d={d} fill="none" stroke={tone} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  const label = p.label ? (
    <div style={{ fontSize: p.size, color: tone, opacity: lk, transform: `translateY(${(1 - lk) * (p.dir === "down" ? -10 : 10)}px)`, whiteSpace: "nowrap", fontFamily: fonts.sans }}>
      <RichText text={p.label} />
    </div>
  ) : null;
  return (
    <div style={{ display: "flex", flexDirection: p.dir === "down" ? "column" : "column-reverse", alignItems: "center", gap: 10 }}>
      <div ref={ref} style={{ display: "inline-block" }}>
        {p.children}
      </div>
      {brace}
      {label}
    </div>
  );
}

export const braceMeta: KitEntry = {
  name: "Brace",
  category: "primitive",
  summary: "A curly brace that grows under (or over) its child, exactly as wide, with a label: \"how many is this\", \"what this part is\".",
  useWhen: ["Naming part of a formula or a stretch of an array: \"n elements\", \"the derivative\"", "Grouping a few elements in a Row"],
  avoidWhen: ["Labels inside a plot: use Label in Axes"],
  children: "The element being labelled",
  example: "math-morph.tsx",
  schema: braceSchema,
};

/* ----------------------------------------------------------------- DotGrid */

export const dotGridSchema = z.object({
  count: z.number().int().min(1).max(400).describe("Total number of dots (e.g. 100 people)"),
  cols: z.number().int().min(1).max(40).optional().describe("Number of columns; leave empty to choose automatically"),
  shape: z.enum(["dot", "square"]).default("dot"),
  size: z.number().min(10).max(80).optional().describe("Size of each dot (px); chosen from the count by default"),
  at: atSchema.default(0).describe("When the dots appear (spreading in)"),
  groups: z
    .array(z.object({ count: z.number().int().min(0), color: colorSchema, at: atSchema, label: z.string().optional() }))
    .default([])
    .describe("Color in turn: each group colors the next `count` dots at `at`. E.g. 1 sick person in 100"),
  legend: z.boolean().default(true).describe("Show a legend of the groups (label + count) below"),
});

/** A grid of dots for counts and probabilities: "1 in 100", base rates, sample spaces. */
export function DotGrid(props: z.input<typeof dotGridSchema>) {
  const p = parseProps("DotGrid", dotGridSchema, props);
  const timing = useSceneTiming();
  const t = useSceneTime();
  const start = resolveAt(p.at, timing);
  const cols = p.cols ?? Math.min(40, Math.ceil(Math.sqrt(p.count * 1.8)));
  const rows = Math.ceil(p.count / cols);
  const size = p.size ?? Math.max(10, Math.min(56, Math.floor(Math.min(1400 / cols, 620 / rows) * 0.72)));
  const gap = Math.round(size * 0.38);
  // Group membership by index, in order.
  const tone: { color: ColorName; start: number }[] = [];
  const groups = p.groups.map((g) => ({ ...g, start: resolveAt(g.at, timing) }));
  for (const g of groups) for (let i = 0; i < g.count && tone.length < p.count; i++) tone.push({ color: g.color as ColorName, start: g.start + (i / Math.max(1, g.count)) * Math.min(0.8, g.count * 0.04) });
  const cells = Array.from({ length: p.count }, (_, i) => {
    const r = Math.floor(i / cols);
    const c = i % cols;
    // Reveal spreads from the top-left corner.
    const k = ease(Math.max(0, Math.min(1, (t - start - ((r + c) / (rows + cols)) * 0.9) / 0.35)));
    const g = tone[i];
    const gk = g ? ease(linear(t, g.start, 0.35)) : 0;
    const fill = gk > 0 ? color(g!.color) : color("faint");
    return (
      <div
        key={i}
        style={{
          width: size,
          height: size,
          borderRadius: p.shape === "dot" ? "50%" : 4,
          background: fill,
          opacity: k * (gk > 0 ? 1 : 0.55),
          transform: `scale(${k * (1 + 0.35 * Math.sin(Math.PI * gk))})`,
        }}
      />
    );
  });
  const legend = p.legend && groups.some((g) => g.label) ? (
    <div style={{ display: "flex", gap: 48, justifyContent: "center", fontSize: sizes.small }}>
      {groups.map((g, i) =>
        g.label ? (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, opacity: ease(linear(t, g.start, 0.5)) }}>
            <div style={{ width: 24, height: 24, borderRadius: p.shape === "dot" ? "50%" : 4, background: color(g.color as ColorName) }} />
            <span style={{ color: color("text") }}>
              <RichText text={g.label} />
            </span>
            <span style={{ fontFamily: fonts.mono, color: color(g.color as ColorName) }}>{g.count}</span>
          </div>
        ) : null,
      )}
    </div>
  ) : null;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 36 }}>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, ${size}px)`, gap }}>{cells}</div>
      {legend}
    </div>
  );
}

export const dotGridMeta: KitEntry = {
  name: "DotGrid",
  category: "component",
  summary: "A grid of dots (or squares) to count and talk about probability: groups are colored one by one with the narration, with counts.",
  useWhen: ["Probability, \"1 in 100\" rates, Bayes' theorem, false positives", "Percentages, fractions you can see, sample spaces"],
  avoidWhen: ["Comparing large numbers between groups: use BarChart"],
  example: "dot-grid.tsx",
  schema: dotGridSchema,
};

/* ---------------------------------------------------------------- Surround */

export const surroundSchema = z.object({
  at: atSchema.describe("When the box / stroke starts drawing around the child"),
  outAt: atSchema.optional(),
  shape: z.enum(["box", "circle", "underline", "strike", "cross"]).default("box").describe("box frames, circle encircles, underline underlines, strike crosses out (discarded), cross marks it wrong"),
  color: colorSchema.default("accent"),
  label: z.string().optional().describe("Short label above the frame, supports $…$"),
  padding: z.number().min(0).max(60).default(14),
});

/** Draws a box, circle, underline or strike-through around its children, like a pen on a whiteboard. */
export function Surround(props: z.input<typeof surroundSchema> & { children?: React.ReactNode }) {
  const p = parseProps("Surround", surroundSchema, props);
  const timing = useSceneTiming();
  const t = useSceneTime();
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (el && (Math.abs(el.offsetWidth - box.w) > 0.5 || Math.abs(el.offsetHeight - box.h) > 0.5)) setBox({ w: el.offsetWidth, h: el.offsetHeight });
  });
  const k = ease(linear(t, resolveAt(p.at, timing), 0.6));
  const out = p.outAt === undefined ? 0 : linear(t, resolveAt(p.outAt, timing), 0.4);
  const pad = p.padding;
  const W = box.w + 2 * pad;
  const H = box.h + 2 * pad;
  const c = color(p.color as ColorName);
  let d = "";
  if (p.shape === "box") d = `M${pad * 0.5} ${pad * 0.5} H${W - pad * 0.5} V${H - pad * 0.5} H${pad * 0.5} Z`;
  else if (p.shape === "circle") d = `M${W / 2} ${-2} A${W / 2 + 8} ${H / 2 + 6} 0 1 1 ${W / 2 - 1} ${-2}`;
  else if (p.shape === "underline") d = `M${pad * 0.5} ${H - pad * 0.4} Q${W / 2} ${H - pad * 0.4 + 6} ${W - pad * 0.5} ${H - pad * 0.6}`;
  else if (p.shape === "strike") d = `M${pad * 0.3} ${H * 0.55} L${W - pad * 0.3} ${H * 0.45}`;
  else d = `M${pad} ${pad} L${W - pad} ${H - pad} M${W - pad} ${pad} L${pad} ${H - pad}`;
  return (
    <div style={{ position: "relative", display: "inline-block", padding: pad }}>
      <div ref={ref}>{p.children}</div>
      {box.w > 0 && k > 0 ? (
        <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none", opacity: 1 - out }}>
          <path d={d} fill="none" stroke={c} strokeWidth={p.shape === "cross" || p.shape === "strike" ? 7 : 5} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={`${k} 1`} />
        </svg>
      ) : null}
      {p.label && k > 0 ? (
        <div style={{ position: "absolute", left: "50%", bottom: "100%", transform: `translate(-50%, ${(1 - k) * 10}px)`, whiteSpace: "nowrap", fontSize: sizes.small, color: c, opacity: k * (1 - out), fontFamily: fonts.sans, paddingBottom: 6 }}>
          <RichText text={p.label} />
        </div>
      ) : null}
    </div>
  );
}

export const surroundMeta: KitEntry = {
  name: "Surround",
  category: "primitive",
  summary: "Hand-drawn mark around its child: box, circle, underline, strike-through (discarded) or cross (wrong), with a short label; stays until outAt.",
  useWhen: ["Pointing out the result to remember (box), a mistake (cross), a rejected option (strike)", "Circling a term in a formula or a cell in a table"],
  avoidWhen: ["Brief emphasis: use Pulse"],
  children: "The element to mark",
  example: "derivation-physics.tsx",
  schema: surroundSchema,
};
