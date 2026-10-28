import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { parseProps, type KitEntry } from "../define";
import { colorSchema, linear } from "../primitives";
import { color, ease, type ColorName } from "../theme";
import { atSchema, resolveAt, useSceneTime, useSceneTiming } from "../timing/context";
import { renderTex } from "./formula";

/*
 * MathMorph: an equation rewritten step by step where every piece that exists
 * in both steps slides to its new place (a term moving across the "=" sign,
 * a factor being pulled out), new pieces fade in and dropped ones fade out.
 * Positions are measured from the real KaTeX layout, never guessed.
 */

const tokenSchema = z.union([
  z.string(),
  z.object({
    tex: z.string(),
    key: z.string().optional().describe("Name used to match a piece in another step when the text differs (e.g. \"+b\" becoming \"-b\")"),
    color: colorSchema.optional(),
  }),
]);

export const mathMorphSchema = z.object({
  steps: z
    .array(z.object({ at: atSchema, tokens: z.array(tokenSchema).min(1).describe("TeX pieces of this step, in order") }))
    .min(1)
    .describe("Each step is one line of the formula split into pieces. Pieces with the same TeX (or the same key) in two steps slide to their new place"),
  size: z.number().min(32).max(140).default(80),
  color: colorSchema.default("text"),
  duration: z.number().positive().default(1.1).describe("Duration of each transformation (seconds)"),
  spacing: z.number().min(0).max(1).default(0.12).describe("Extra space between pieces (em)"),
});

type Tok = { tex: string; key: string; color?: ColorName };
type Box = { x: number; y: number };

// A lone operator gets no spacing in KaTeX; empty groups on both sides give it the normal TeX spacing.
const OPERATOR = /^\s*(=|<|>|\+|-|\\(le|ge|leq|geq|ne|neq|approx|equiv|cdot|times|div|pm|mp|to|Rightarrow|Leftrightarrow|iff|implies))\s*$/;
const texOf = (tex: string) => (OPERATOR.test(tex) ? `{}${tex}{}` : tex);

function normalize(tokens: z.output<typeof tokenSchema>[]): Tok[] {
  return tokens.map((t) => (typeof t === "string" ? { tex: t, key: t } : { tex: t.tex, key: t.key ?? t.tex, color: t.color as ColorName | undefined }));
}

/** For each token of `next`, the index of the matching token in `prev` (same key, in order), or -1. */
function match(prev: Tok[], next: Tok[]): number[] {
  const used = new Set<number>();
  return next.map((tk) => {
    const i = prev.findIndex((p, j) => !used.has(j) && p.key === tk.key);
    if (i >= 0) used.add(i);
    return i;
  });
}

export function MathMorph(props: z.input<typeof mathMorphSchema>) {
  const p = parseProps("MathMorph", mathMorphSchema, props);
  const timing = useSceneTiming();
  const t = useSceneTime();
  const steps = useMemo(() => p.steps.map((s) => normalize(s.tokens)), [p.steps]);
  const html = useMemo(() => steps.map((s) => s.map((tk) => renderTex(texOf(tk.tex), true))), [steps]);
  const starts = p.steps.map((s) => resolveAt(s.at, timing));

  // Measure every step's real layout (hidden copies stacked in one grid cell).
  const box = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<Box[][] | null>(null);
  useLayoutEffect(() => {
    const root = box.current;
    if (!root) return;
    const rows = Array.from(root.querySelectorAll<HTMLElement>("[data-row]"));
    const next = rows.map((row) => Array.from(row.querySelectorAll<HTMLElement>("[data-tok]")).map((el) => ({ x: el.offsetLeft, y: el.offsetTop })));
    if (JSON.stringify(next) !== JSON.stringify(pos)) setPos(next);
  });

  let cur = -1;
  starts.forEach((s, i) => {
    if (t >= s) cur = i;
  });

  const visible: React.ReactNode[] = [];
  if (pos && cur >= 0) {
    const q = linear(t, starts[cur], cur === 0 ? 0.8 : p.duration);
    const e = ease(q);
    const tone = (tk: Tok) => color((tk.color ?? p.color) as ColorName);
    const place = (key: string, h: string, b: Box, style: React.CSSProperties, tk: Tok) =>
      visible.push(
        <span
          key={key}
          style={{ position: "absolute", left: b.x, top: b.y, whiteSpace: "nowrap", color: tone(tk), ...style }}
          dangerouslySetInnerHTML={{ __html: h }}
        />,
      );
    if (cur === 0 || q >= 1) {
      steps[cur].forEach((tk, j) => {
        // First appearance: pieces rise in one after another.
        const k = cur === 0 && q < 1 ? ease(Math.max(0, Math.min(1, q * 1.8 - (j / steps[cur].length) * 0.8))) : 1;
        place(`s${cur}-${j}`, html[cur][j], pos[cur][j], { opacity: k, transform: `translateY(${(1 - k) * 0.3 * p.size}px)` }, tk);
      });
    } else {
      const prev = steps[cur - 1];
      const next = steps[cur];
      const m = match(prev, next);
      const kept = new Set(m.filter((i) => i >= 0));
      prev.forEach((tk, i) => {
        if (kept.has(i)) return;
        const k = ease(Math.min(1, q / 0.5));
        place(`o${i}`, html[cur - 1][i], pos[cur - 1][i], { opacity: 1 - k, transform: `translateY(${-k * 0.25 * p.size}px) scale(${1 - 0.3 * k})` }, tk);
      });
      next.forEach((tk, j) => {
        const i = m[j];
        if (i >= 0) {
          const a = pos[cur - 1][i];
          const b = pos[cur][j];
          // Pieces that travel far lift on a gentle arc, so they do not slide through each other.
          const lift = Math.min(1, Math.abs(b.x - a.x) / (p.size * 3)) * Math.sin(Math.PI * e) * p.size * 0.45 * (j % 2 ? 1 : -1);
          place(`m${j}`, html[cur][j], { x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e + lift }, {}, tk);
        } else {
          const k = ease(Math.max(0, (q - 0.35) / 0.65));
          place(`n${j}`, html[cur][j], pos[cur][j], { opacity: k, transform: `scale(${0.6 + 0.4 * k})`, transformOrigin: "50% 60%" }, tk);
        }
      });
    }
  }

  return (
    <div ref={box} style={{ position: "relative", display: "grid", fontSize: p.size, lineHeight: 1.2 }}>
      {steps.map((s, i) => (
        <div key={i} data-row style={{ gridArea: "1 / 1", justifySelf: "center", alignSelf: "center", display: "flex", alignItems: "baseline", gap: `${p.spacing}em`, visibility: "hidden", whiteSpace: "nowrap" }}>
          {s.map((_, j) => (
            <span key={j} data-tok dangerouslySetInnerHTML={{ __html: html[i][j] }} />
          ))}
        </div>
      ))}
      {visible}
    </div>
  );
}

export const mathMorphMeta: KitEntry = {
  name: "MathMorph",
  category: "component",
  summary:
    "Equation rewriting by \"matching symbols\": the formula is split into pieces, pieces present in both steps slide to their new place (moving a term across, factoring out), new pieces appear, removed ones fade out.",
  useWhen: ["Solving an equation step by step: moving terms across, multiplying both sides, simplifying", "Algebra where the viewer needs to see where each term goes"],
  avoidWhen: ["A formula on its own: use Formula", "Steps with nothing in common: use FormulaSteps"],
  example: "math-morph.tsx",
  schema: mathMorphSchema,
};
