import React, { useMemo } from "react";
import { interpolate } from "remotion";
import { z } from "zod";
import { parseProps, type KitEntry } from "../define";
import { colorSchema } from "../primitives";
import { color, ease } from "../theme";
import { atSchema, resolveAt, useProgress, useSceneTime, useSceneTiming } from "../timing/context";

export { plainTex, renderTex, repairTex, RichText } from "./richtext";
import { renderTex } from "./richtext";

/* ----------------------------------------------------------------- Formula */

export const formulaSchema = z.object({
  tex: z
    .string()
    .describe("LaTeX formula. In a JSX attribute (tex=\"…\") write \\ once; in a JS string use String.raw`…`"),
  at: atSchema.default(0),
  size: z.number().default(72).describe("Font size (px)"),
  color: colorSchema.default("text"),
  align: z.enum(["left", "center"]).default("center"),
  reveal: z.enum(["fade", "write"]).default("fade").describe("fade: fades in; write: appears left to right as if being written"),
  duration: z.number().positive().optional().describe("Time to appear (seconds); 0.7 for fade by default, by length for write"),
});

export function Formula(props: z.input<typeof formulaSchema>) {
  const p = parseProps("Formula", formulaSchema, props);
  const write = p.reveal === "write";
  const k = useProgress(p.at, p.duration ?? (write ? Math.min(2.2, 0.5 + p.tex.length * 0.025) : 0.7));
  const html = useMemo(() => renderTex(p.tex, true), [p.tex]);
  // "write": a soft-edged mask sweeps left to right, like a pen finishing the line.
  const mask = write && k < 1 ? `linear-gradient(90deg, #000 ${k * 120 - 20}%, transparent ${k * 120}%)` : undefined;
  return (
    <div
      style={{
        fontSize: p.size,
        whiteSpace: "nowrap",
        color: color(p.color),
        textAlign: p.align,
        opacity: write ? (k > 0 ? 1 : 0) : k,
        transform: write ? undefined : `translateY(${(1 - k) * 20}px) scale(${0.96 + 0.04 * k})`,
        transformOrigin: p.align === "center" ? "50% 50%" : "0 50%",
        maskImage: mask,
        WebkitMaskImage: mask,
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export const formulaMeta: KitEntry = {
  name: "Formula",
  category: "component",
  summary: "Shows a math formula (LaTeX via KaTeX) with an entrance effect.",
  useWhen: ["Formulas, definitions, equations"],
  avoidWhen: ["A formula transformed over several steps: use FormulaSteps", "A small symbol inside a sentence: write $…$ in the text"],
  example: "formula.tsx",
  schema: formulaSchema,
};

/* ------------------------------------------------------------ FormulaSteps */

export const formulaStepsSchema = z.object({
  steps: z
    .array(z.object({ tex: z.string(), at: atSchema }))
    .min(1)
    .describe("Transformation steps; each step replaces the previous one at `at`"),
  size: z.number().default(72),
  color: colorSchema.default("text"),
  keepPrevious: z.boolean().default(false).describe("Keep earlier steps (dimmed) above instead of replacing them"),
});

export function FormulaSteps(props: z.input<typeof formulaStepsSchema>) {
  const p = parseProps("FormulaSteps", formulaStepsSchema, props);
  const timing = useSceneTiming();
  const t = useSceneTime();
  const starts = p.steps.map((s) => resolveAt(s.at, timing));
  let current = -1;
  starts.forEach((s, i) => {
    if (t >= s) current = i;
  });
  if (p.keepPrevious) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: p.size * 0.45, alignItems: "center", fontSize: p.size }}>
        {p.steps.map((s, i) => {
          const k = interpolate(t, [starts[i], starts[i] + 0.6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
          const old = i < current;
          return <div key={i} style={{ opacity: k * (old ? 0.75 : 1), color: color(old ? "muted" : p.color) }} dangerouslySetInnerHTML={{ __html: renderTex(s.tex, true) }} />;
        })}
      </div>
    );
  }
  return (
    <div style={{ position: "relative", fontSize: p.size, color: color(p.color), display: "grid", placeItems: "center" }}>
      {p.steps.map((s, i) => {
        const inK = interpolate(t, [starts[i], starts[i] + 0.5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
        const next = starts[i + 1];
        const outK = next === undefined ? 0 : interpolate(t, [next, next + 0.4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        return (
          <div
            key={i}
            style={{ gridArea: "1 / 1", opacity: inK * (1 - outK), transform: `translateY(${(1 - inK) * 18 - outK * 18}px)` }}
            dangerouslySetInnerHTML={{ __html: renderTex(s.tex, true) }}
          />
        );
      })}
    </div>
  );
}

export const formulaStepsMeta: KitEntry = {
  name: "FormulaSteps",
  category: "component",
  summary: "Transforms a formula over several steps, each appearing with the narration.",
  useWhen: ["Proofs, simplifications, step-by-step calculations"],
  avoidWhen: ["Only one formula: use Formula"],
  example: "formula-steps.tsx",
  schema: formulaStepsSchema,
};
