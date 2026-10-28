import katex from "katex";
// Registers the mhchem chemistry commands (ce, pu) on the same KaTeX instance.
import "katex/contrib/mhchem";
import React, { useMemo } from "react";
import { colors } from "../theme";

/*
 * TeX helpers shared by every component that shows text. Depends only on
 * KaTeX and the theme, so primitives can use it without an import cycle.
 */

/**
 * Undo the most common escaping slip in generated code: "\frac" written in a
 * JS string becomes a form feed + "rac", "\times" a tab + "imes". Control
 * characters never belong in TeX, so map them back to their commands.
 */
export function repairTex(tex: string): string {
  return tex
    .replace(/\t/g, "\\t")
    .replace(/\f/g, "\\f")
    .replace(/\x08/g, "\\b")
    .replace(/\v/g, "\\v")
    .replace(/\r/g, "\\r")
    .replace(/\n(?=[a-zA-Z])/g, "\\n")
    // "\\lfloor" (escaped twice) is a line break followed by text; inline math never wants that.
    .replace(/\\\\(?=[a-zA-Z])/g, "\\");
}

/**
 * Theme colors as TeX commands, so a quantity wears the same color in a
 * formula and in the picture: \accent{x}, \info{f(x)}, \ok{…}, \warn{…}, \err{…}, \muted{…}.
 */
// Hex without "#": inside a macro body "#5…" would read as argument 5.
const TEX_MACROS: Record<string, string> = Object.fromEntries(
  (["accent", "info", "ok", "warn", "err", "muted", "faint"] as const).map((name) => [`\\${name}`, `\\textcolor{${colors[name].slice(1)}}{#1}`]),
);

// Display formulas use inline mode + \displaystyle to avoid KaTeX's block margins.
export function renderTex(tex: string, display: boolean): string {
  const src = repairTex(tex);
  return katex.renderToString(display ? `\\displaystyle ${src}` : src, { displayMode: false, throwOnError: false, output: "html", strict: "ignore", macros: { ...TEX_MACROS } });
}

const SYMBOLS: Record<string, string> = {
  le: "≤", leq: "≤", ge: "≥", geq: "≥", ne: "≠", neq: "≠", cdot: "·", times: "×", div: "÷", pm: "±", approx: "≈",
  to: "→", rightarrow: "→", Rightarrow: "⇒", infty: "∞", in: "∈", sqrt: "√", log: "log", ln: "ln", sin: "sin", cos: "cos",
  alpha: "α", beta: "β", gamma: "γ", delta: "δ", Delta: "Δ", theta: "θ", lambda: "λ", mu: "μ", pi: "π", sigma: "σ", Sigma: "Σ", omega: "ω",
};
const SUP: Record<string, string> = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", n: "ⁿ" };

/**
 * Text with $…$ turned into plain Unicode, for places KaTeX cannot render
 * (SVG <text>): "$n \le 2^3$" → "n ≤ 2³". Unknown commands lose their backslash.
 */
export function plainTex(text: string): string {
  if (!text.includes("$") && !text.includes("\\")) return text;
  return repairTex(text)
    .replace(/\\([a-zA-Z]+)/g, (_, cmd: string) => SYMBOLS[cmd] ?? cmd)
    .replace(/\^\{?([0-9n])\}?/g, (_, d: string) => SUP[d])
    .replace(/\{,\}/g, " ")
    .replace(/\\[,;!: ]/g, " ")
    .replace(/[{}$]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Text with inline $…$ math. Used by every text component. */
export function RichText({ text }: { text: string }) {
  const parts = useMemo(() => text.split(/(\$[^$]+\$)/g).filter(Boolean), [text]);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("$") && part.endsWith("$") && part.length > 2 ? (
          <span key={i} dangerouslySetInnerHTML={{ __html: renderTex(part.slice(1, -1), false) }} />
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        ),
      )}
    </>
  );
}
