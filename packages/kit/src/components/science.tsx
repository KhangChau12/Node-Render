import React from "react";
import { z } from "zod";
import { parseProps, type KitEntry } from "../define";
import { colorSchema, linear } from "../primitives";
import { color, colors, ease, fonts, type ColorName } from "../theme";
import { atSchema, resolveAt, useSceneTime, useSceneTiming } from "../timing/context";
import { RichText } from "./richtext";

/*
 * Chemistry and physics pictures: a Bohr atom with orbiting electrons and a 2D
 * molecule whose atoms can move and whose bonds can break and form, so a
 * reaction can be shown happening. Equations use \ce{…} (mhchem) in any TeX.
 */

/** Element colors mapped onto the theme (close to the usual CPK conventions). */
const ELEMENT_TONE: Record<string, ColorName> = {
  H: "text", C: "muted", N: "info", O: "err", F: "ok", Cl: "ok", Br: "warn", I: "warn", S: "warn", P: "accent",
  Na: "accent", K: "accent", Li: "accent", Mg: "ok", Ca: "ok", Fe: "warn", Cu: "accent", Zn: "info", Al: "muted", Si: "muted",
};
const toneOf = (el: string): ColorName => ELEMENT_TONE[el] ?? "info";

/* -------------------------------------------------------------------- Atom */

export const atomSchema = z.object({
  symbol: z.string().describe('Nucleus symbol, e.g. "Na" or "11+"'),
  shells: z.array(z.number().int().min(0).max(32)).min(1).max(7).describe("Electrons per shell from the inside out, e.g. Na: [2, 8, 1]"),
  at: atSchema.default(0).describe("When the nucleus appears; the electron shells follow one by one"),
  size: z.number().min(300).max(800).default(560),
  spin: z.boolean().default(true).describe("Electrons orbit the nucleus"),
  highlight: z.array(z.object({ at: atSchema, shell: z.number().int().describe("Shell index (0 = innermost); -1 = outermost shell") })).default([]).describe("Highlight a shell (the outer shell / valence electrons)"),
  lose: z.object({ at: atSchema, count: z.number().int().min(1).max(8).default(1) }).optional().describe("The outer shell loses electrons (they fly away): a positive ion"),
  gain: z.object({ at: atSchema, count: z.number().int().min(1).max(8).default(1) }).optional().describe("The outer shell gains electrons (they fly in): a negative ion"),
  label: z.string().optional().describe("Name under the atom, supports $…$"),
  color: colorSchema.default("accent"),
});

export function Atom(props: z.input<typeof atomSchema>) {
  const p = parseProps("Atom", atomSchema, props);
  const timing = useSceneTiming();
  const t = useSceneTime();
  const S = p.size;
  const c = S / 2;
  const start = resolveAt(p.at, timing);
  const nk = ease(linear(t, start, 0.6));
  const n = p.shells.length;
  const rN = Math.max(34, S * 0.08);
  const step = (S / 2 - rN - 28) / n;
  let hi = -1;
  let hk = 0;
  p.highlight.forEach((h) => {
    const s = resolveAt(h.at, timing);
    if (t >= s) {
      hi = h.shell < 0 ? n - 1 : h.shell;
      hk = ease(linear(t, s, 0.5));
    }
  });
  const outer = n - 1;
  const loseK = p.lose ? ease(linear(t, resolveAt(p.lose.at, timing), 1.2)) : 0;
  const gainK = p.gain ? ease(linear(t, resolveAt(p.gain.at, timing), 1.2)) : 0;
  const shells = p.shells.map((count, i) => {
    const r = rN + step * (i + 1);
    const sk = ease(linear(t, start + 0.4 + i * 0.35, 0.6));
    if (sk <= 0) return null;
    const lit = hi === i;
    const ring = lit ? color(p.color as ColorName) : color("grid");
    const rot = p.spin ? (t - start) * (0.9 / (i + 1)) : 0;
    const total = count + (i === outer && p.gain ? p.gain.count : 0);
    const els: React.ReactNode[] = [];
    for (let j = 0; j < total; j++) {
      const extra = j >= count;
      const leaving = i === outer && p.lose && j >= count - p.lose.count && !extra;
      let a = rot + (2 * Math.PI * j) / Math.max(1, total) - Math.PI / 2;
      let rr = r;
      let op = sk;
      if (leaving) {
        rr = r + loseK * S * 0.45;
        op *= 1 - loseK;
      }
      if (extra) {
        rr = r + (1 - gainK) * S * 0.45;
        op *= gainK;
        a += (1 - gainK) * 1.2;
      }
      if (op <= 0) continue;
      els.push(<circle key={j} cx={c + rr * Math.cos(a)} cy={c + rr * Math.sin(a)} r={11} fill={extra || lit ? color(p.color as ColorName) : color("info")} opacity={op} stroke={colors.bg} strokeWidth={3} />);
    }
    return (
      <g key={i}>
        <circle cx={c} cy={c} r={r} fill="none" stroke={ring} strokeWidth={lit ? 3 + 2 * hk : 2.5} strokeOpacity={sk} pathLength={1} strokeDasharray={`${sk} 1`} />
        {els}
      </g>
    );
  });
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <svg width={S} height={S} style={{ display: "block", overflow: "visible" }}>
        {shells}
        <circle cx={c} cy={c} r={rN * (0.6 + 0.4 * nk)} fill={color("raised")} stroke={color("warn")} strokeWidth={4} opacity={nk} />
        <text x={c} y={c + 11} textAnchor="middle" fontSize={Math.min(40, rN * 0.9)} fontFamily={fonts.sans} fontWeight={600} fill={color("text")} opacity={nk}>
          {p.symbol}
        </text>
      </svg>
      {p.label ? (
        <div style={{ fontSize: 32, color: color("muted"), opacity: nk }}>
          <RichText text={p.label} />
        </div>
      ) : null}
    </div>
  );
}

export const atomMeta: KitEntry = {
  name: "Atom",
  category: "component",
  summary: "Bohr model of an atom: nucleus, electron shells appearing one by one and orbiting; highlight the outer shell; `lose` / `gain` send electrons out / in to make ions.",
  useWhen: ["Atomic structure, electron configuration, valence electrons", "Ionic bonding: Na loses 1 electron, Cl gains 1 (two Atoms in a Row + Arrow)"],
  avoidWhen: ["Bonds within a molecule: use Molecule"],
  example: "chem-ionic.tsx",
  schema: atomSchema,
};

/* ---------------------------------------------------------------- Molecule */

const bondSchema = z.object({
  a: z.string(),
  b: z.string(),
  order: z.number().int().min(1).max(3).default(1),
});

export const moleculeSchema = z.object({
  atoms: z
    .array(z.object({ id: z.string().describe("The atom's own name: \"O1\", \"H2\""), el: z.string().describe("Element: \"H\", \"O\", \"C\"…"), x: z.number(), y: z.number(), charge: z.string().optional().describe("\"+\", \"2−\"…") }))
    .min(1)
    .max(40)
    .describe("Atoms with 2D coordinates (unit = bond length, y up). E.g. H₂O: O(0,0), H(-0.8,-0.6), H(0.8,-0.6)"),
  bonds: z.array(bondSchema).default([]).describe("Initial bonds (single, double, triple)"),
  at: atSchema.default(0).describe("When the molecule appears (atoms pop in, bonds draw after)"),
  steps: z
    .array(
      z.object({
        at: atSchema,
        move: z.record(z.string(), z.tuple([z.number(), z.number()])).optional().describe("Atoms move to new coordinates: { H1: [3, 0] }"),
        break: z.array(z.string()).optional().describe('Bonds that break: ["H1-H2"]'),
        form: z.array(bondSchema).optional().describe("New bonds that form"),
        highlight: z.array(z.string()).optional().describe("Atoms highlighted in this step"),
        note: z.string().optional().describe("One note line under the picture, \"\" to clear"),
      }),
    )
    .default([])
    .describe("How the reaction unfolds with the narration"),
  scale: z.number().min(40).max(220).default(120).describe("Pixels per unit (bond length)"),
  labels: z.boolean().default(true).describe("Write the element symbol on each ball"),
});

export function Molecule(props: z.input<typeof moleculeSchema>) {
  const p = parseProps("Molecule", moleculeSchema, props);
  const timing = useSceneTiming();
  const t = useSceneTime();
  const start = resolveAt(p.at, timing);
  const D = 0.7;
  const pos = new Map(p.atoms.map((a) => [a.id, [a.x, a.y] as [number, number]]));
  const key = (a: string, b: string) => [a, b].sort().join("-");
  type B = { a: string; b: string; order: number; born: number; died: number };
  const bonds = new Map<string, B>(p.bonds.map((b) => [key(b.a, b.b), { ...b, born: start + 0.5, died: Infinity }]));
  let highlight = new Set<string>();
  let note = "";
  let hk = 0;
  // Bounds over every position the atoms ever take, so the frame never jumps.
  const all: [number, number][] = p.atoms.map((a) => [a.x, a.y]);
  for (const s of p.steps) for (const v of Object.values(s.move ?? {})) all.push(v);
  for (const s of p.steps) {
    const st = resolveAt(s.at, timing);
    for (const [id, to] of Object.entries(s.move ?? {})) {
      const from = pos.get(id);
      if (!from) throw new Error(`<Molecule> has no atom "${id}"`);
      const e = ease(linear(t, st, 1.1));
      pos.set(id, [from[0] + (to[0] - from[0]) * e, from[1] + (to[1] - from[1]) * e]);
    }
    for (const b of s.break ?? []) {
      const [a, c] = b.split("-").map((x) => x.trim());
      const bb = bonds.get(key(a, c));
      if (bb && bb.died === Infinity) bb.died = st;
    }
    for (const b of s.form ?? []) bonds.set(key(b.a, b.b), { ...b, born: st + 0.5, died: Infinity });
    if (t >= st) {
      highlight = new Set(s.highlight ?? []);
      hk = ease(linear(t, st, 0.4));
      if (s.note !== undefined) note = s.note;
    }
  }
  const xs = all.map((q) => q[0]);
  const ys = all.map((q) => q[1]);
  const pad = 0.9;
  const x0 = Math.min(...xs) - pad;
  const y1 = Math.max(...ys) + pad;
  const W = (Math.max(...xs) + pad - x0) * p.scale;
  const H = (y1 - (Math.min(...ys) - pad)) * p.scale;
  const px = (q: [number, number]): [number, number] => [(q[0] - x0) * p.scale, (y1 - q[1]) * p.scale];
  const radius = (el: string) => (el === "H" ? 0.26 : 0.36) * p.scale;
  const elOf = new Map(p.atoms.map((a) => [a.id, a.el]));
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
      <svg width={W} height={H} style={{ display: "block", overflow: "visible" }}>
        {[...bonds.values()].map((b, i) => {
          const k = ease(linear(t, b.born, 0.5)) * (b.died === Infinity ? 1 : 1 - ease(linear(t, b.died, 0.6)));
          if (k <= 0) return null;
          const A = pos.get(b.a);
          const Bp = pos.get(b.b);
          if (!A || !Bp) throw new Error(`<Molecule> bond ${b.a}-${b.b} uses an atom that does not exist`);
          const a = px(A);
          const c = px(Bp);
          const dx = c[0] - a[0];
          const dy = c[1] - a[1];
          const L = Math.hypot(dx, dy) || 1;
          const nx = -dy / L;
          const ny = dx / L;
          const offs = b.order === 1 ? [0] : b.order === 2 ? [-7, 7] : [-11, 0, 11];
          const broken = t >= b.died;
          return (
            <g key={i} opacity={k}>
              {offs.map((o, j) => (
                <line key={j} x1={a[0] + nx * o} y1={a[1] + ny * o} x2={a[0] + nx * o + dx * (broken ? 1 : k)} y2={a[1] + ny * o + dy * (broken ? 1 : k)} stroke={color("muted")} strokeWidth={6} strokeLinecap="round" strokeDasharray={broken ? "6 8" : undefined} />
              ))}
            </g>
          );
        })}
        {p.atoms.map((a, i) => {
          const k = ease(linear(t, start + i * 0.08, 0.45));
          if (k <= 0) return null;
          const [x, y] = px(pos.get(a.id)!);
          const r = radius(a.el);
          const tone = toneOf(a.el);
          const lit = highlight.has(a.id);
          return (
            <g key={a.id} opacity={k} transform={`translate(${x} ${y}) scale(${(0.5 + 0.5 * k) * (lit ? 1 + 0.12 * hk : 1)})`}>
              {lit ? <circle r={r + 10} fill="none" stroke={color("accent")} strokeWidth={4} opacity={hk} /> : null}
              <circle r={r} fill={`color-mix(in srgb, ${color(tone)} 70%, ${colors.bg})`} stroke={color(tone)} strokeWidth={3} />
              <circle cx={-r * 0.3} cy={-r * 0.3} r={r * 0.28} fill="white" opacity={0.18} />
              {p.labels ? (
                <text y={r * 0.32} textAnchor="middle" fontSize={Math.max(24, r * 0.85)} fontWeight={700} fontFamily={fonts.sans} fill={tone === "text" || tone === "warn" || tone === "ok" ? colors.bg : color("text")}>
                  {a.el}
                </text>
              ) : null}
              {a.charge ? (
                <text x={r * 0.85} y={-r * 0.7} fontSize={26} fontFamily={fonts.mono} fill={color("warn")}>
                  {a.charge}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      <div style={{ minHeight: 40, fontSize: 32, color: color("muted"), textAlign: "center" }}>
        <RichText text={note} />
      </div>
    </div>
  );
}

export const moleculeMeta: KitEntry = {
  name: "Molecule",
  category: "component",
  summary:
    "A 2D ball-and-stick molecule (colored by element): atoms pop in, single/double/triple bonds draw themselves; `steps` move atoms, break bonds (dashed, then fading) and form new ones: the reaction happens on screen.",
  useWhen: ["Molecular structure: H₂O, CO₂, CH₄, C₂H₄", "Reactions: 2H₂ + O₂ → 2H₂O (old bonds break, atoms rearrange, new bonds form)", "Isomers, functional groups (organic chemistry)"],
  avoidWhen: ["Only the equation is needed: use Formula with \\ce{…}", "Molecules with more than ~40 atoms"],
  example: "chem-reaction.tsx",
  schema: moleculeSchema,
};
