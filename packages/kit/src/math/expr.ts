import { localizeDecimal } from "../locale";

/*
 * Safe math expressions: "x^2 - 2sin(x)", "a*cos(t)". Only math functions,
 * constants and the declared variables are allowed, so AI-written strings can
 * never run arbitrary code.
 */

const FUNCS: Record<string, string> = {
  sin: "Math.sin", cos: "Math.cos", tan: "Math.tan", asin: "Math.asin", acos: "Math.acos", atan: "Math.atan",
  atan2: "Math.atan2", sinh: "Math.sinh", cosh: "Math.cosh", tanh: "Math.tanh",
  sqrt: "Math.sqrt", cbrt: "Math.cbrt", abs: "Math.abs", exp: "Math.exp", ln: "Math.log", log: "Math.log10", log2: "Math.log2",
  floor: "Math.floor", ceil: "Math.ceil", round: "Math.round", min: "Math.min", max: "Math.max", sign: "Math.sign", pow: "Math.pow",
};
const CONSTS: Record<string, string> = { pi: "Math.PI", e: "Math.E", tau: "(2*Math.PI)" };

type Compiled = (...args: number[]) => number;
const cache = new Map<string, Compiled>();

/**
 * Compile an expression over the given variables into a JS function taking
 * them in order. Throws a readable error for anything unsupported.
 */
export function compileExpr(expr: string, vars: string[] = ["x"]): Compiled {
  const key = `${vars.join(",")}|${expr}`;
  const hit = cache.get(key);
  if (hit) return hit;
  if (!/^[\w\s+\-*/^().,]*$/.test(expr)) throw new Error(`Expression "${expr}" contains unsupported characters`);
  let js = expr.replace(/\^/g, "**");
  // Implicit multiplication: 2x, 3(x+1), )( , )x
  js = js
    .replace(/(\d)\s*([a-z_(])/gi, "$1*$2")
    .replace(/\)\s*\(/g, ")*(")
    .replace(/\)\s*([a-z_])/gi, ")*$1");
  const lower = new Map(vars.map((v) => [v.toLowerCase(), v]));
  js = js.replace(/[a-z_]\w*/gi, (id) => {
    const k = id.toLowerCase();
    if (lower.has(k)) return `__v_${lower.get(k)}`;
    if (FUNCS[k]) return FUNCS[k];
    if (CONSTS[k]) return CONSTS[k];
    throw new Error(`Expression "${expr}" uses an unsupported name: "${id}". Valid variables: ${vars.join(", ")}; write multiplication explicitly (a*x, not ax).`);
  });
  let f: Compiled;
  try {
    // eslint-disable-next-line no-new-func
    f = new Function(...vars.map((v) => `__v_${v}`), `"use strict"; return (${js});`) as Compiled;
    f(...vars.map(() => 0.5));
  } catch (err) {
    throw new Error(`Expression "${expr}" is invalid (${(err as Error).message}). Use forms like "x^2 + 2x - 1", "sin(x)", "a*cos(t)".`);
  }
  cache.set(key, f);
  return f;
}

/** Single-variable shortcut kept for Graph. */
export function compileExpression(expr: string): (x: number) => number {
  const f = compileExpr(expr, ["x"]);
  return (x: number) => f(x);
}

/** A function of one variable given either as an expression string or a JS function. */
export type Fn1 = string | ((x: number) => number);

/** Resolve a Fn1 with extra named parameters (already evaluated for this frame). */
export function toFn1(fn: Fn1, variable = "x", params: Record<string, number> = {}): (x: number) => number {
  if (typeof fn === "function") return fn;
  const names = Object.keys(params);
  const f = compileExpr(fn, [variable, ...names]);
  const vals = names.map((n) => params[n]);
  return (x: number) => f(x, ...vals);
}

/** Readable tick values: 1, 2, 5 × 10^k. */
export function niceStep(span: number, target = 6): number {
  const raw = Math.abs(span) / target || 1;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const m = raw / p;
  return (m < 1.5 ? 1 : m < 3 ? 2 : m < 7 ? 5 : 10) * p;
}

/** Number formatting for on-screen labels: decimal separator of the content language, real minus sign. */
export function fmtNumber(n: number, decimals = 2): string {
  const k = Math.pow(10, decimals);
  const r = Math.round(n * k) / k;
  return localizeDecimal(String(Object.is(r, -0) ? 0 : r));
}
