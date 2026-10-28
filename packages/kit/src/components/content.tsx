import React, { useMemo } from "react";
import { z } from "zod";
import { parseProps, type KitEntry } from "../define";
import { colorSchema, linear } from "../primitives";
import { color, ease, fonts, sizes, type ColorName } from "../theme";
import { atSchema, resolveAt, useSceneTime, useSceneTiming } from "../timing/context";
import { IconGlyph, iconSchema } from "./icon";
import { renderTex, RichText } from "./richtext";

/*
 * Content components that work for any subject: timelines (history), cycles
 * (biology, geography), mind maps, annotated passages (literature) and
 * multi-line worked solutions. Each computes its own layout.
 */

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** Index of the latest step whose time has passed, or -1. */
function currentStep(steps: { at: number | string }[], t: number, timing: ReturnType<typeof useSceneTiming>): number {
  let cur = -1;
  steps.forEach((s, i) => {
    if (t >= resolveAt(s.at, timing)) cur = i;
  });
  return cur;
}

/* ---------------------------------------------------------------- Timeline */

export const timelineSchema = z.object({
  events: z
    .array(
      z.object({
        date: z.string().describe('Date as shown: "938", "1945", "15th century"'),
        label: z.string().describe("The event, ≤ 8 words, supports $…$"),
        at: atSchema,
        tone: colorSchema.optional(),
        icon: iconSchema.optional(),
      }),
    )
    .min(1)
    .max(10)
    .describe("Events in time order; labels alternate above/below the axis so they never overlap"),
  at: atSchema.default(0).describe("When the time axis appears"),
  width: z.number().min(600).max(1728).default(1600),
  proportional: z.boolean().default(false).describe("Place events in proportion to the year (date must be a number); evenly spaced by default"),
  focus: z.array(z.object({ at: atSchema, index: z.number().int().nullable() })).default([]).describe("Highlight one event (the others dim); index null to clear"),
});

export function Timeline(props: z.input<typeof timelineSchema>) {
  const p = parseProps("Timeline", timelineSchema, props);
  const timing = useSceneTiming();
  const t = useSceneTime();
  const W = p.width;
  const H = 560;
  const mid = H / 2;
  const margin = 90;
  const n = p.events.length;
  const nums = p.events.map((e) => parseFloat(e.date));
  const prop = p.proportional && nums.every(Number.isFinite) && n > 1 && nums[n - 1] !== nums[0];
  const xs = p.events.map((_, i) => (n === 1 ? W / 2 : prop ? margin + ((nums[i] - nums[0]) / (nums[n - 1] - nums[0])) * (W - 2 * margin) : margin + (i * (W - 2 * margin)) / (n - 1)));
  const starts = p.events.map((e) => resolveAt(e.at, timing));
  const lineStart = resolveAt(p.at, timing);
  const lk = ease(linear(t, lineStart, 0.8));
  const fi = currentStep(p.focus, t, timing);
  const focus = fi >= 0 ? p.focus[fi].index : null;
  // Same-side neighbours are two slots apart, so a label may use up to two gaps.
  const gap = n > 1 ? Math.min(...xs.slice(1).map((x, i) => x - xs[i])) : W;
  const boxW = Math.max(180, Math.min(360, gap * 2 - 24));
  return (
    <div style={{ position: "relative", width: W, height: H, flex: "none" }}>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <line x1={20} y1={mid} x2={20 + (W - 40) * lk} y2={mid} stroke={color("muted")} strokeWidth={4} strokeLinecap="round" />
        {lk >= 1 ? <path d={`M${W - 20} ${mid} l-18 -10 v20 z`} fill={color("muted")} /> : null}
        {p.events.map((e, i) => {
          const k = ease(linear(t, starts[i], 0.5));
          if (k <= 0) return null;
          const up = i % 2 === 0;
          const tone = (focus === i ? "accent" : e.tone ?? "info") as ColorName;
          return (
            <g key={i} opacity={focus !== null && focus !== i ? 0.4 : 1}>
              <line x1={xs[i]} y1={mid} x2={xs[i]} y2={mid + (up ? -1 : 1) * 46 * k} stroke={color(tone)} strokeWidth={3} />
              <circle cx={xs[i]} cy={mid} r={(focus === i ? 16 : 11) * (0.5 + 0.5 * k)} fill={color(tone)} stroke={color("bg")} strokeWidth={4} />
            </g>
          );
        })}
      </svg>
      {p.events.map((e, i) => {
        const k = ease(linear(t, starts[i] + 0.15, 0.5));
        if (k <= 0) return null;
        const up = i % 2 === 0;
        const tone = (focus === i ? "accent" : e.tone ?? "info") as ColorName;
        const dim = focus !== null && focus !== i;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: Math.max(0, Math.min(W - boxW, xs[i] - boxW / 2)),
              width: boxW,
              [up ? "bottom" : "top"]: mid + 54,
              display: "flex",
              flexDirection: up ? "column-reverse" : "column",
              alignItems: "center",
              gap: 8,
              textAlign: "center",
              opacity: k * (dim ? 0.4 : 1),
              transform: `translateY(${(1 - k) * (up ? 16 : -16)}px) scale(${focus === i ? 1.06 : 1})`,
            } as React.CSSProperties}
          >
            <div style={{ fontFamily: fonts.mono, fontSize: 30, fontWeight: 600, color: color(tone) }}>{e.date}</div>
            <div style={{ fontSize: 30, lineHeight: 1.2, color: color("text") }}>
              <RichText text={e.label} />
            </div>
            {e.icon ? <IconGlyph name={e.icon} size={52} tone={tone} /> : null}
          </div>
        );
      })}
    </div>
  );
}

export const timelineMeta: KitEntry = {
  name: "Timeline",
  category: "component",
  summary: "Horizontal timeline: events appear one by one with the narration, labels alternate above/below, with icons; `focus` highlights one event.",
  useWhen: ["History: the course of events, dynasties, campaigns", "An author's life, the history of an invention, stages of development"],
  avoidWhen: ["Steps of a process not tied to dates: use Diagram or Cycle"],
  example: "timeline-history.tsx",
  schema: timelineSchema,
};

/* ------------------------------------------------------------------- Cycle */

export const cycleSchema = z.object({
  stages: z
    .array(z.object({ label: z.string().describe("Stage name, ≤ 4 words"), at: atSchema, icon: iconSchema.optional(), tone: colorSchema.optional() }))
    .min(3)
    .max(8)
    .describe("Stages clockwise, starting at the top"),
  center: z.string().optional().describe("Text in the middle of the ring (name of the cycle)"),
  size: z.number().min(500).max(900).default(800),
  active: z.array(z.object({ at: atSchema, index: z.number().int().nullable() })).default([]).describe("Highlight the stage being discussed"),
  flow: z.boolean().default(true).describe("Once all stages are in, a bright dot travels around the ring"),
});

export function Cycle(props: z.input<typeof cycleSchema>) {
  const p = parseProps("Cycle", cycleSchema, props);
  const timing = useSceneTiming();
  const t = useSceneTime();
  const S = p.size;
  const n = p.stages.length;
  const R = S / 2 - 120;
  const c = S / 2;
  const ang = (i: number) => -Math.PI / 2 + (2 * Math.PI * i) / n;
  const starts = p.stages.map((s) => resolveAt(s.at, timing));
  const ai = currentStep(p.active, t, timing);
  const active = ai >= 0 ? p.active[ai].index : null;
  // Leave each stage box clear: the arc starts and ends outside a box ~130 px around its centre.
  const gapA = Math.min(Math.asin(Math.min(0.95, 135 / R)), Math.PI / n - 0.08);
  // The centre text must fit between the boxes.
  const centerW = Math.max(160, 2 * R - 300);
  const arcs = p.stages.map((_, i) => {
    const j = (i + 1) % n;
    const s = j === 0 ? starts[n - 1] + 0.5 : starts[j];
    const k = ease(linear(t, s, 0.7));
    if (k <= 0) return null;
    const a0 = ang(i) + gapA;
    const a1 = a0 + (ang(i) + (2 * Math.PI) / n - gapA - a0) * k;
    const P = (a: number) => `${(c + R * Math.cos(a)).toFixed(1)} ${(c + R * Math.sin(a)).toFixed(1)}`;
    const tip = [c + R * Math.cos(a1), c + R * Math.sin(a1)];
    const tx = -Math.sin(a1);
    const ty = Math.cos(a1);
    return (
      <g key={i}>
        <path d={`M${P(a0)} A${R} ${R} 0 0 1 ${P(a1)}`} fill="none" stroke={color("muted")} strokeWidth={4} strokeLinecap="round" />
        {k > 0.9 ? <path d={`M${tip[0] + tx * 8} ${tip[1] + ty * 8} L${tip[0] - tx * 12 - ty * 10} ${tip[1] - ty * 12 + tx * 10} L${tip[0] - tx * 12 + ty * 10} ${tip[1] - ty * 12 - tx * 10} Z`} fill={color("muted")} /> : null}
      </g>
    );
  });
  const allIn = starts[n - 1] + 1.2;
  const dotA = p.flow && t > allIn ? -Math.PI / 2 + ((t - allIn) * 0.6) % (2 * Math.PI) : null;
  return (
    <div style={{ position: "relative", width: S, height: S, flex: "none" }}>
      <svg width={S} height={S} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        {arcs}
        {dotA !== null ? <circle cx={c + R * Math.cos(dotA)} cy={c + R * Math.sin(dotA)} r={9} fill={color("accent")} /> : null}
      </svg>
      {p.center ? (
        <div style={{ position: "absolute", left: c - centerW / 2, width: centerW, top: c, transform: "translateY(-50%)", textAlign: "center", fontSize: 28, lineHeight: 1.2, fontWeight: 600, color: color("muted"), opacity: ease(linear(t, starts[0], 0.6)) }}>
          <RichText text={p.center} />
        </div>
      ) : null}
      {p.stages.map((s, i) => {
        const k = ease(linear(t, starts[i], 0.55));
        if (k <= 0) return null;
        const on = active === i;
        const tone = (on ? "accent" : s.tone ?? "info") as ColorName;
        const x = c + R * Math.cos(ang(i));
        const y = c + R * Math.sin(ang(i));
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x - 120,
              top: y,
              width: 240,
              transform: `translateY(-50%) scale(${(0.7 + 0.3 * k) * (on ? 1.1 : 1)})`,
              opacity: k * (active !== null && !on ? 0.5 : 1),
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              padding: "14px 12px",
              borderRadius: 18,
              background: color("surface"),
              border: `3px solid ${color(tone)}`,
              textAlign: "center",
            }}
          >
            {s.icon ? <IconGlyph name={s.icon} size={52} tone={tone} /> : null}
            <div style={{ fontSize: 28, lineHeight: 1.15, color: color("text") }}>
              <RichText text={s.label} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export const cycleMeta: KitEntry = {
  name: "Cycle",
  category: "component",
  summary: "A cycle: stages (with icons) around a circle, curved arrows from one to the next, a dot travelling around; `active` highlights the stage being discussed.",
  useWhen: ["Biology: cell cycle, life cycles, Krebs cycle, nitrogen cycle", "Geography: water cycle, rock cycle", "Economics, society: feedback loops"],
  avoidWhen: ["A process with a start and an end: use Diagram", "More than 8 stages"],
  example: "icons-water.tsx",
  schema: cycleSchema,
};

/* ----------------------------------------------------------------- MindMap */

export const mindMapSchema = z.object({
  center: z.string().describe("The central idea"),
  branches: z
    .array(z.object({ label: z.string(), items: z.array(z.string()).max(4).default([]).describe("2–3 short sub-points"), at: atSchema, tone: colorSchema.optional(), icon: iconSchema.optional() }))
    .min(2)
    .max(6)
    .describe("Branches; the first half on the right, the rest on the left"),
  at: atSchema.default(0),
  width: z.number().min(900).max(1728).default(1600),
  height: z.number().min(500).max(860).default(780),
  focus: z.array(z.object({ at: atSchema, index: z.number().int().nullable() })).default([]),
});

const BRANCH_TONES: ColorName[] = ["info", "ok", "warn", "accent", "err", "muted"];

export function MindMap(props: z.input<typeof mindMapSchema>) {
  const p = parseProps("MindMap", mindMapSchema, props);
  const timing = useSceneTiming();
  const t = useSceneTime();
  const W = p.width;
  const H = p.height;
  const n = p.branches.length;
  const right = Math.ceil(n / 2);
  const boxW = Math.min(500, (W - 380) / 2 - 60);
  const cx = W / 2;
  const cy = H / 2;
  const ck = ease(linear(t, resolveAt(p.at, timing), 0.6));
  const fi = currentStep(p.focus, t, timing);
  const focus = fi >= 0 ? p.focus[fi].index : null;
  const slots = p.branches.map((_, i) => {
    const side = i < right ? 1 : -1;
    const idx = i < right ? i : i - right;
    const count = i < right ? right : n - right;
    const y = (H * (idx + 0.5)) / count;
    const x = side > 0 ? W - boxW : 0;
    return { side, y, x };
  });
  return (
    <div style={{ position: "relative", width: W, height: H, flex: "none" }}>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        {p.branches.map((b, i) => {
          const k = ease(linear(t, resolveAt(b.at, timing), 0.7));
          if (k <= 0) return null;
          const s = slots[i];
          const x0 = cx + s.side * 150;
          const x1 = s.side > 0 ? s.x : s.x + boxW;
          const tone = b.tone ?? BRANCH_TONES[i % BRANCH_TONES.length];
          return (
            <path
              key={i}
              d={`M${x0} ${cy} C${(x0 + x1) / 2} ${cy}, ${(x0 + x1) / 2} ${s.y}, ${x1} ${s.y}`}
              fill="none"
              stroke={color(tone as ColorName)}
              strokeWidth={4}
              strokeOpacity={focus !== null && focus !== i ? 0.3 : 0.9}
              pathLength={1}
              strokeDasharray={`${k} 1`}
            />
          );
        })}
      </svg>
      <div
        style={{
          position: "absolute",
          left: cx - 170,
          width: 340,
          top: cy,
          transform: `translateY(-50%) scale(${0.8 + 0.2 * ck})`,
          opacity: ck,
          padding: "22px 18px",
          borderRadius: 22,
          background: color("raised"),
          border: `3px solid ${color("accent")}`,
          textAlign: "center",
          fontSize: 38,
          fontWeight: 600,
          lineHeight: 1.15,
        }}
      >
        <RichText text={p.center} />
      </div>
      {p.branches.map((b, i) => {
        const start = resolveAt(b.at, timing) + 0.4;
        const k = ease(linear(t, start, 0.5));
        if (k <= 0) return null;
        const s = slots[i];
        const tone = (b.tone ?? BRANCH_TONES[i % BRANCH_TONES.length]) as ColorName;
        const dim = focus !== null && focus !== i;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: s.x,
              width: boxW,
              top: s.y,
              transform: `translateY(-50%) translateX(${(1 - k) * s.side * 30}px) scale(${focus === i ? 1.05 : 1})`,
              opacity: k * (dim ? 0.5 : 1),
              display: "flex",
              flexDirection: "column",
              alignItems: s.side > 0 ? "flex-start" : "flex-end",
              textAlign: s.side > 0 ? "left" : "right",
              gap: 6,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexDirection: s.side > 0 ? "row" : "row-reverse", fontSize: 34, fontWeight: 600, color: color(tone) }}>
              {b.icon ? <IconGlyph name={b.icon} size={42} tone={tone} /> : null}
              <span>
                <RichText text={b.label} />
              </span>
            </div>
            {b.items.map((it, j) => {
              const ik = ease(linear(t, start + 0.3 + j * 0.25, 0.4));
              return (
                <div key={j} style={{ fontSize: 28, color: color("muted"), opacity: ik, lineHeight: 1.2 }}>
                  <RichText text={it} />
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

export const mindMapMeta: KitEntry = {
  name: "MindMap",
  category: "component",
  summary: "Mind map: the central idea in the middle, 2–6 branches (one color each, with icon and 2–3 sub-points) growing out on both sides with the narration; `focus` highlights one branch.",
  useWhen: ["A topic with many facets: causes / course / results / significance", "Literature: characters, themes and craft of a work", "End-of-lesson review"],
  avoidWhen: ["Directed relations between blocks: use Diagram", "Deep hierarchies: use Tree"],
  example: "mindmap-literature.tsx",
  schema: mindMapSchema,
};

/* ----------------------------------------------------------------- Passage */

export const passageSchema = z.object({
  text: z.string().describe("Excerpt / lines of verse (line breaks with \\n in a JS string). At most ~70 words"),
  source: z.string().optional().describe("Author and work: \"— Nguyễn Du, The Tale of Kiều\""),
  at: atSchema.default(0),
  marks: z
    .array(
      z.object({
        phrase: z.string().describe("Phrase to mark, copied EXACTLY from the text (first occurrence)"),
        at: atSchema,
        color: colorSchema.default("accent"),
        mode: z.enum(["marker", "underline", "circle", "text"]).default("marker").describe("marker highlights, underline underlines, circle encircles, text recolors"),
        note: z.string().optional().describe("Analysis note shown in the right column: \"metaphor\", \"contrast\", \"vivid reduplicative word\""),
      }),
    )
    .default([]),
  size: z.number().min(30).max(64).default(44),
  serif: z.boolean().default(true).describe("Serif type (literature); false for informational text"),
  width: z.number().min(600).max(1600).default(1000).describe("Width of the text block (px)"),
});

export function Passage(props: z.input<typeof passageSchema>) {
  const p = parseProps("Passage", passageSchema, props);
  const timing = useSceneTiming();
  const t = useSceneTime();
  const k0 = ease(linear(t, resolveAt(p.at, timing), 0.8));
  // Locate every phrase (first occurrence, not overlapping an earlier mark).
  const spans = useMemo(() => {
    const found: { s: number; e: number; m: number }[] = [];
    p.marks.forEach((m, i) => {
      let from = 0;
      for (;;) {
        const s = p.text.indexOf(m.phrase, from);
        if (s < 0) throw new Error(`<Passage> cannot find the phrase "${m.phrase}" in the text. Copy it word for word.`);
        const e = s + m.phrase.length;
        if (!found.some((f) => s < f.e && e > f.s)) {
          found.push({ s, e, m: i });
          break;
        }
        from = s + 1;
      }
    });
    return found.sort((a, b) => a.s - b.s);
  }, [p.text, p.marks]);
  const parts: React.ReactNode[] = [];
  let pos = 0;
  const numbered = p.marks.map((m, i) => (m.note ? i : -1)).filter((i) => i >= 0);
  for (const sp of spans) {
    if (sp.s > pos) parts.push(<React.Fragment key={`t${pos}`}>{p.text.slice(pos, sp.s)}</React.Fragment>);
    const m = p.marks[sp.m];
    const k = ease(linear(t, resolveAt(m.at, timing), 0.6));
    const c = color(m.color as ColorName);
    const num = numbered.indexOf(sp.m);
    const style: React.CSSProperties =
      m.mode === "marker"
        ? { background: `linear-gradient(${c}44, ${c}44) no-repeat 0 90% / ${k * 100}% 70%`, borderRadius: 4 }
        : m.mode === "underline"
          ? { background: `linear-gradient(${c}, ${c}) no-repeat 0 100% / ${k * 100}% 4px`, paddingBottom: 2 }
          : m.mode === "circle"
            ? { outline: k > 0 ? `3px solid ${c}` : undefined, outlineOffset: 4, borderRadius: 999, padding: "0 6px", opacity: 1, outlineColor: `color-mix(in srgb, ${c} ${Math.round(k * 100)}%, transparent)` }
            : { color: k > 0.5 ? c : undefined };
    parts.push(
      <span key={`m${sp.s}`} style={{ ...style, color: m.mode === "text" ? style.color : k > 0.3 ? color("text") : undefined }}>
        {p.text.slice(sp.s, sp.e)}
        {num >= 0 && k > 0 ? <sup style={{ fontFamily: fonts.mono, fontSize: "0.5em", color: c, opacity: k, marginLeft: 2 }}>{num + 1}</sup> : null}
      </span>,
    );
    pos = sp.e;
  }
  if (pos < p.text.length) parts.push(<React.Fragment key="tail">{p.text.slice(pos)}</React.Fragment>);
  const notes = numbered.map((i, j) => {
    const m = p.marks[i];
    const k = ease(linear(t, resolveAt(m.at, timing) + 0.2, 0.5));
    return (
      <div key={i} style={{ display: "flex", gap: 14, alignItems: "baseline", opacity: k, transform: `translateX(${(1 - k) * 24}px)` }}>
        <span style={{ fontFamily: fonts.mono, fontSize: 26, color: color(m.color as ColorName), minWidth: 26 }}>{j + 1}</span>
        <span style={{ fontSize: sizes.small, lineHeight: 1.25, color: color("text") }}>
          <RichText text={m.note!} />
        </span>
      </div>
    );
  });
  return (
    <div style={{ display: "flex", gap: 64, alignItems: "center" }}>
      <div style={{ width: p.width, opacity: k0, transform: `translateY(${(1 - k0) * 16}px)`, borderLeft: `6px solid ${color("accent")}`, paddingLeft: 36 }}>
        <div style={{ fontFamily: p.serif ? fonts.prose : fonts.sans, fontSize: p.size, lineHeight: 1.55, whiteSpace: "pre-wrap", color: color("muted") }}>{parts}</div>
        {p.source ? <div style={{ marginTop: 20, fontSize: 28, color: color("faint"), fontStyle: "italic" }}>{p.source}</div> : null}
      </div>
      {notes.length ? <div style={{ width: 460, display: "flex", flexDirection: "column", gap: 26 }}>{notes}</div> : null}
    </div>
  );
}

export const passageMeta: KitEntry = {
  name: "Passage",
  category: "component",
  summary: "An excerpt of prose, verse or a source document: it appears, then phrases are highlighted, underlined or circled with the narration, with numbered analysis notes in the right column.",
  useWhen: ["Literature: analysing lines of a poem, figures of speech, well-chosen words", "History: quoting a primary source (a declaration, an edict, a proclamation)", "Languages: pointing out grammar structures in a sentence"],
  avoidWhen: ["Passages longer than ~70 words: split across scenes", "A short definition: use Callout"],
  example: "passage-poem.tsx",
  schema: passageSchema,
};

/* -------------------------------------------------------------- Derivation */

export const derivationSchema = z.object({
  lines: z
    .array(
      z.object({
        tex: z.string().describe('One line of TeX; put "&" before the sign to align on: "x^2 - 4 &= 0"'),
        at: atSchema,
        note: z.string().optional().describe("Reason for this step, shown on the right: \"move to the other side\", \"(since Δ > 0)\""),
        tone: colorSchema.optional(),
        result: z.boolean().default(false).describe("Frame the final result"),
      }),
    )
    .min(1)
    .max(9),
  size: z.number().min(32).max(80).default(54),
  dim: z.boolean().default(true).describe("Dim earlier lines so the eye follows the new one"),
});

export function Derivation(props: z.input<typeof derivationSchema>) {
  const p = parseProps("Derivation", derivationSchema, props);
  const timing = useSceneTiming();
  const t = useSceneTime();
  const html = useMemo(
    () =>
      p.lines.map((l) => {
        const i = l.tex.indexOf("&");
        // "{}" on both sides of the split gives the relation its normal TeX spacing in each half.
        return i < 0 ? ["", renderTex(l.tex, true)] : [renderTex(`${l.tex.slice(0, i)}{}`, true), renderTex(`{}${l.tex.slice(i + 1)}`, true)];
      }),
    [p.lines],
  );
  const starts = p.lines.map((l) => resolveAt(l.at, timing));
  const cur = currentStep(p.lines, t, timing);
  // A table keeps the two halves of every line on one alignment column; rows not shown yet keep their
  // space (visibility hidden), so the block does not shift when a new line arrives.
  return (
    <table style={{ borderCollapse: "separate", borderSpacing: `0 ${p.size * 0.32}px`, fontSize: p.size }}>
      <tbody>
        {p.lines.map((l, i) => {
          const k = clamp01(linear(t, starts[i], Math.min(1.4, 0.4 + l.tex.length * 0.02)));
          const old = p.dim && i < cur && !l.result;
          const tone = color((l.tone ?? (l.result ? "accent" : "text")) as ColorName);
          const mask = k < 1 ? `linear-gradient(90deg, #000 ${k * 120 - 20}%, transparent ${k * 120}%)` : undefined;
          const nk = ease(linear(t, starts[i] + 0.4, 0.5));
          const cell: React.CSSProperties = { whiteSpace: "nowrap", color: tone, opacity: old ? 0.5 : 1, maskImage: mask, WebkitMaskImage: mask, padding: 0, verticalAlign: "middle" };
          // The result line is framed across both halves: each cell draws its side of one box.
          const line = `3px solid ${color("accent")}`;
          const frame = (left: boolean): React.CSSProperties =>
            l.result
              ? left
                ? { borderTop: line, borderBottom: line, borderLeft: line, paddingLeft: 14, borderTopLeftRadius: 10, borderBottomLeftRadius: 10 }
                : { borderTop: line, borderBottom: line, borderRight: line, paddingRight: 14, borderTopRightRadius: 10, borderBottomRightRadius: 10 }
              : {};
          return (
            <tr key={i} style={{ visibility: k > 0 ? "visible" : "hidden" }}>
              <td style={{ ...cell, textAlign: "right", ...frame(true) }} dangerouslySetInnerHTML={{ __html: html[i][0] }} />
              <td style={{ ...cell, textAlign: "left", ...frame(false) }} dangerouslySetInnerHTML={{ __html: html[i][1] }} />
              <td style={{ paddingLeft: 48, fontSize: Math.max(26, p.size * 0.52), color: color("muted"), whiteSpace: "nowrap", opacity: nk * (old ? 0.6 : 1), verticalAlign: "middle" }}>
                {l.note ? <RichText text={l.note} /> : null}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export const derivationMeta: KitEntry = {
  name: "Derivation",
  category: "component",
  summary: "A multi-line solution aligned on \"=\" (with &): each line is written with the narration, its reason on the right; earlier lines dim, the final answer is framed.",
  useWhen: ["Multi-step problems: solving equations, proofs, integrals, physics / chemistry exercises", "When viewers need the earlier steps on screen to compare"],
  avoidWhen: ["To see each term move: use MathMorph", "One formula: use Formula"],
  example: "derivation-physics.tsx",
  schema: derivationSchema,
};
