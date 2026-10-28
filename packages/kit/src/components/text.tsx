import React from "react";
import { interpolate } from "remotion";
import { z } from "zod";
import { parseProps, type KitEntry } from "../define";
import { colorSchema, sizeSchema } from "../primitives";
import { color, ease, fonts, sizes, type ColorName } from "../theme";
import { atSchema, resolveAt, useAt, useProgress, useSceneTime, useSceneTiming } from "../timing/context";
import { RichText } from "./formula";
import { effectSchema, enterStyle, linear } from "../primitives/motion";

/* --------------------------------------------------------------- TitleCard */

export const titleCardSchema = z.object({
  title: z.string(),
  kicker: z.string().optional().describe("Small label above, e.g. \"Lesson 3 · Derivatives\""),
  subtitle: z.string().optional(),
  at: atSchema.default(0),
  align: z.enum(["left", "center"]).default("left"),
});

export function TitleCard(props: z.input<typeof titleCardSchema>) {
  const p = parseProps("TitleCard", titleCardSchema, props);
  const k1 = useProgress(p.at, 0.5);
  const k2 = useProgress(p.at, 0.7, 0.15);
  const k3 = useProgress(p.at, 0.7, 0.45);
  const center = p.align === "center";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28, alignItems: center ? "center" : "flex-start", textAlign: p.align, maxWidth: 1500 }}>
      {p.kicker ? (
        <div style={{ display: "flex", alignItems: "center", gap: 18, opacity: k1 }}>
          <div style={{ width: 56 * k1, height: 4, background: color("accent") }} />
          <span style={{ fontFamily: fonts.mono, fontSize: sizes.label, letterSpacing: 2, textTransform: "uppercase", color: color("muted") }}>{p.kicker}</span>
        </div>
      ) : null}
      <div style={{ fontSize: sizes.display, fontWeight: 700, lineHeight: 1.08, letterSpacing: -1.5, opacity: k2, transform: `translateY(${(1 - k2) * 30}px)` }}>
        <RichText text={p.title} />
      </div>
      {p.subtitle ? (
        <div style={{ fontSize: sizes.body, color: color("muted"), maxWidth: 1200, opacity: k3, transform: `translateY(${(1 - k3) * 20}px)` }}>
          <RichText text={p.subtitle} />
        </div>
      ) : null}
    </div>
  );
}

export const titleCardMeta: KitEntry = {
  name: "TitleCard",
  category: "component",
  summary: "A large title opening the lecture or a part of it, with a small label and a subtitle.",
  useWhen: ["The opening scene of the video", "Moving on to a new part of the lecture"],
  avoidWhen: ["A title above an illustration: use the TitleWithVisual layout"],
  example: "title-card.tsx",
  schema: titleCardSchema,
};

/* ------------------------------------------------------------ BulletReveal */

const bulletItem = z.union([z.string(), z.object({ text: z.string(), at: atSchema.optional() })]);

export const bulletRevealSchema = z.object({
  items: z.array(bulletItem).min(1).describe("The points; each is a string or { text, at }. Supports $…$ for math"),
  at: atSchema.default(0).describe("When the first point appears (points without their own `at` follow `gap` apart)"),
  gap: z.number().default(0.8),
  size: sizeSchema.default("body"),
  numbered: z.boolean().default(false),
  focus: z.boolean().default(false).describe("Dim earlier points when a new one appears"),
  effect: effectSchema.default("left").describe("How each point appears"),
});

export function BulletReveal(props: z.input<typeof bulletRevealSchema>) {
  const p = parseProps("BulletReveal", bulletRevealSchema, props);
  const timing = useSceneTiming();
  const t = useSceneTime();
  const base = useAt(p.at);
  const starts = p.items.map((it, i) => (typeof it !== "string" && it.at !== undefined ? resolveAt(it.at, timing) : base + i * p.gap));
  const latest = starts.reduce((acc, s, i) => (t >= s ? i : acc), -1);
  const fs = sizes[p.size];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: fs * 0.7 }}>
      {p.items.map((it, i) => {
        const text = typeof it === "string" ? it : it.text;
        const lp = linear(t, starts[i], 0.6);
        const k = ease(lp);
        const fx = enterStyle(p.effect, lp, 24);
        const dim = p.focus && i < latest ? 0.4 : 1;
        // The newest item gets a brief accent flash on its marker.
        const flash = i === latest ? Math.max(0, 1 - (t - starts[i]) / 1.2) : 0;
        return (
          <div key={i} style={{ display: "flex", gap: fs * 0.6, alignItems: "baseline", ...fx, opacity: (fx.opacity === undefined ? 1 : Number(fx.opacity)) * dim }}>
            <span style={{ fontFamily: fonts.mono, fontSize: fs * 0.62, color: color("accent"), minWidth: fs * 1.1, display: "inline-block", transform: `scale(${1 + 0.35 * flash * k})`, transformOrigin: "left center" }}>
              {p.numbered ? String(i + 1).padStart(2, "0") : "—"}
            </span>
            <span style={{ fontSize: fs, lineHeight: 1.35 }}>
              <RichText text={text} />
            </span>
          </div>
        );
      })}
    </div>
  );
}

export const bulletRevealMeta: KitEntry = {
  name: "BulletReveal",
  category: "component",
  summary: "A list of points appearing one by one, optionally numbered, with earlier points dimmed.",
  useWhen: ["Listing 2–5 short points", "End-of-lesson summary"],
  avoidWhen: ["More than 5 points or points longer than 12 words: split into several scenes"],
  example: "bullets.tsx",
  schema: bulletRevealSchema,
};

/* ----------------------------------------------------------------- Callout */

export const calloutSchema = z.object({
  text: z.string().describe("Content, supports $…$"),
  title: z.string().optional(),
  tone: z.enum(["accent", "info", "ok", "warn", "err"]).default("accent"),
  at: atSchema.default(0),
  width: z.number().default(900),
});

export function Callout(props: z.input<typeof calloutSchema>) {
  const p = parseProps("Callout", calloutSchema, props);
  const k = useProgress(p.at, 0.6);
  const c = color(p.tone as ColorName);
  return (
    <div
      style={{
        width: p.width,
        background: color("surface"),
        borderLeft: `6px solid ${c}`,
        padding: "28px 36px",
        opacity: k,
        transform: `translateY(${(1 - k) * 24}px)`,
      }}
    >
      {p.title ? <div style={{ fontFamily: fonts.mono, fontSize: sizes.label, letterSpacing: 2, textTransform: "uppercase", color: c, marginBottom: 12 }}><RichText text={p.title} /></div> : null}
      <div style={{ fontSize: sizes.body, lineHeight: 1.4 }}>
        <RichText text={p.text} />
      </div>
    </div>
  );
}

export const calloutMeta: KitEntry = {
  name: "Callout",
  category: "component",
  summary: "A highlighted note box: definition, caution, tip, common mistake.",
  useWhen: ["A short definition to remember", "Warning about a common mistake"],
  avoidWhen: ["The main content of a long scene: use BulletReveal"],
  example: "callout.tsx",
  schema: calloutSchema,
};

/* --------------------------------------------------------------- CodeBlock */

export const codeBlockSchema = z.object({
  code: z.string(),
  title: z.string().optional().describe("File name shown above"),
  at: atSchema.default(0),
  lineGap: z.number().default(0.25).describe("Seconds between lines appearing; 0 to show all at once"),
  highlight: z.array(z.number().int().positive()).default([]).describe("Lines (counting from 1) to highlight"),
  highlightAt: atSchema.optional().describe("When the highlight starts"),
  steps: z
    .array(z.object({ at: atSchema, highlight: z.array(z.number().int().positive()) }))
    .default([])
    .describe("Move the highlight with the narration: [{ at, highlight: [3] }, { at, highlight: [8] }]. Use this instead of several CodeBlocks"),
  size: z.number().min(24).default(30),
});

export function CodeBlock(props: z.input<typeof codeBlockSchema>) {
  const p = parseProps("CodeBlock", codeBlockSchema, props);
  const timing = useSceneTiming();
  const start = useAt(p.at);
  const t = useSceneTime();
  const lines = p.code.replace(/\t/g, "  ").split("\n");
  // The latest step that has started decides the highlighted lines.
  const phases = [{ at: resolveAt(p.highlightAt ?? p.at, timing), highlight: p.highlight }, ...p.steps.map((s) => ({ at: resolveAt(s.at, timing), highlight: s.highlight }))];
  const active = phases.filter((ph) => t >= ph.at).pop();
  const hl = new Set(active?.highlight ?? []);
  const hlAt = active?.at ?? Number.POSITIVE_INFINITY;
  return (
    <div style={{ background: color("surface"), border: `1px solid ${color("grid")}`, fontFamily: fonts.mono, fontSize: p.size, minWidth: Math.min(900, p.size * 22) }}>
      {p.title ? <div style={{ padding: "14px 24px", borderBottom: `1px solid ${color("grid")}`, color: color("muted"), fontSize: p.size * 0.75 }}><RichText text={p.title} /></div> : null}
      <div style={{ padding: "20px 0" }}>
        {lines.map((line, i) => {
          const s = start + i * p.lineGap;
          const k = interpolate(t, [s, s + 0.3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const on = hl.has(i + 1) && t >= hlAt;
          const dim = hl.size > 0 && t >= hlAt && !on;
          return (
            <div key={i} style={{ display: "flex", opacity: k * (dim ? 0.45 : 1), background: on ? `${color("accent")}22` : undefined, padding: "0 24px" }}>
              <span style={{ width: p.size * 2, color: color("faint"), flex: "none" }}>{i + 1}</span>
              <span style={{ whiteSpace: "pre", color: on ? color("text") : color("muted") }}>{line || " "}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const codeBlockMeta: KitEntry = {
  name: "CodeBlock",
  category: "component",
  summary: "A code block with line numbers: lines appear one by one, important lines are highlighted.",
  useWhen: ["Programming and algorithm lectures"],
  avoidWhen: ["Math formulas: use Formula", "More than 18 lines: trim or split the scene"],
  example: "code-block.tsx",
  schema: codeBlockSchema,
};
