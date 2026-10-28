import React from "react";
import { interpolate } from "remotion";
import { z } from "zod";
import { parseProps, type KitEntry } from "../define";
import { colorSchema } from "../primitives";
import { color, ease, fonts, sizes, type ColorName } from "../theme";
import { atSchema, resolveAt, useSceneTime, useSceneTiming, type At } from "../timing/context";
import { RichText } from "./formula";

/*
 * ArrayViz: an array of cells driven by declarative steps (swap, move, set,
 * pointers, ranges, regions). Every position is computed here, so scenes never
 * hand-place cells, pointer labels or brackets, and nothing can overlap.
 */

const idx = z.number().int();

const regionSchema = z.object({
  from: idx.describe("First index (inclusive)"),
  to: idx.describe("Last index (inclusive)"),
  label: z.string().default("").describe("Label under the bracket, supports $…$"),
  tone: colorSchema.default("info"),
});

const stepSchema = z.object({
  at: atSchema.describe("When this step happens"),
  swap: z.tuple([idx, idx]).optional().describe("Swap two cells by their current indices"),
  move: z.tuple([idx, idx]).optional().describe("Lift cell [from] and insert it at [to]; the others shift (insertion sort)"),
  set: z.array(z.object({ index: idx, value: z.union([z.number(), z.string()]) })).optional().describe("Write new values into cells (merge sort, array updates)"),
  pointers: z.record(z.string(), idx.nullable()).optional().describe("Pointer positions, e.g. { i: -1, j: 0 }. -1 and n are allowed. null hides a pointer. Pointers not mentioned stay where they are"),
  compare: z.array(idx).optional().describe("Cells compared in this step (tinted info, this step only)"),
  pivot: idx.nullable().optional().describe("Pivot cell (accent outline, follows the element when swapped). null to clear"),
  done: z.array(idx).optional().describe("Add cells that are in their final place (tinted ok, kept to the end)"),
  range: z.tuple([idx, idx]).nullable().optional().describe("Range under consideration [l, r]: framed, the rest dimmed. null to clear"),
  regions: z.array(regionSchema).optional().describe("Replace all region brackets under the array, e.g. the ≤ pivot region. [] to clear"),
  note: z.string().optional().describe("One note line under the array (≤ 10 words), replacing the previous one. \"\" to clear"),
  split: z.array(idx).optional().describe("Split the array into chunks: open a gap right after these indices (divide and conquer). [] to join again"),
});

export const arrayVizSchema = z.object({
  values: z.array(z.union([z.number(), z.string()])).min(1).max(16).describe("Initial values, at most 16 cells"),
  steps: z.array(stepSchema).default([]).describe("Steps in time order"),
  at: atSchema.default(0).describe("When the array appears"),
  label: z.string().optional().describe("Array name shown on the left, e.g. \"A\""),
  showIndices: z.boolean().default(true),
  pointerTones: z.record(z.string(), colorSchema).default({}).describe("Color of each pointer, e.g. { i: \"ok\", j: \"info\" }"),
  width: z.number().default(1500).describe("Maximum width (px)"),
  transition: z.number().positive().default(0.6).describe("Duration of each step's motion (seconds)"),
});

type ArrayVizProps = z.output<typeof arrayVizSchema>;
type Step = ArrayVizProps["steps"][number];
type Region = z.output<typeof regionSchema>;

type State = {
  /** Element id at each position. */
  order: number[];
  /** Value of each element id. */
  values: (number | string)[];
  pointers: Record<string, number | null>;
  pivot: number | null; // element id
  done: Set<number>; // positions
  range: [number, number] | null;
  regions: Region[];
  note: string;
  compare: Set<number>; // positions, this step only
  splits: Set<number>; // gap after these positions
  /** Elements that arc during this step, with direction (+1 up, -1 down). */
  arcs: Map<number, number>;
};

const DEFAULT_TONES: ColorName[] = ["ok", "info", "warn", "err", "muted"];

function apply(prev: State, s: Step, n: number, name: string): State {
  const next: State = {
    order: [...prev.order],
    values: [...prev.values],
    pointers: { ...prev.pointers },
    pivot: prev.pivot,
    done: new Set(prev.done),
    range: prev.range,
    regions: prev.regions,
    note: prev.note,
    compare: new Set(),
    splits: prev.splits,
    arcs: new Map(),
  };
  const check = (i: number, what: string) => {
    if (i < 0 || i >= n) throw new Error(`<${name}> ${what}: index ${i} is outside the array 0…${n - 1}`);
  };
  if (s.set) {
    for (const { index, value } of s.set) {
      check(index, "set");
      next.values[next.order[index]] = value;
    }
  }
  if (s.swap) {
    const [a, b] = s.swap;
    check(a, "swap");
    check(b, "swap");
    if (a !== b) {
      next.arcs.set(next.order[a], 1);
      next.arcs.set(next.order[b], -1);
      [next.order[a], next.order[b]] = [next.order[b], next.order[a]];
    }
  }
  if (s.move) {
    const [from, to] = s.move;
    check(from, "move");
    check(to, "move");
    const [el] = next.order.splice(from, 1);
    next.order.splice(to, 0, el);
    next.arcs.set(el, 1);
  }
  if (s.pointers) {
    for (const [k, v] of Object.entries(s.pointers)) {
      if (v !== null && (v < -1 || v > n)) throw new Error(`<${name}> pointer ${k}=${v} is outside -1…${n}`);
      next.pointers[k] = v;
    }
  }
  if (s.pivot !== undefined) {
    if (s.pivot !== null) check(s.pivot, "pivot");
    next.pivot = s.pivot === null ? null : next.order[s.pivot];
  }
  if (s.done) for (const i of s.done) (check(i, "done"), next.done.add(i));
  if (s.compare) for (const i of s.compare) (check(i, "compare"), next.compare.add(i));
  if (s.range !== undefined) {
    if (s.range) (check(s.range[0], "range"), check(s.range[1], "range"));
    next.range = s.range;
  }
  if (s.regions) {
    for (const r of s.regions) (check(r.from, "regions"), check(r.to, "regions"));
    next.regions = s.regions;
  }
  if (s.note !== undefined) next.note = s.note;
  if (s.split) {
    for (const i of s.split) check(i, "split");
    next.splits = new Set(s.split.filter((i) => i < n - 1));
  }
  return next;
}

/** Greedy lane assignment so overlapping regions sit on different rows. */
function regionLanes(regions: Region[]): number[] {
  const lanes: number[][] = [];
  return regions.map((r) => {
    let lane = lanes.findIndex((l) => l.every((j) => regions[j].to < r.from || regions[j].from > r.to));
    if (lane < 0) lane = lanes.push([]) - 1;
    lanes[lane].push(regions.indexOf(r));
    return lane;
  });
}

export function ArrayViz(props: z.input<typeof arrayVizSchema>) {
  const p = parseProps("ArrayViz", arrayVizSchema, props);
  const timing = useSceneTiming();
  const t = useSceneTime();
  const n = p.values.length;

  // States after each step (index 0 = initial).
  const starts = p.steps.map((s) => resolveAt(s.at as At, timing));
  const init: State = {
    order: p.values.map((_, i) => i),
    values: [...p.values],
    pointers: {},
    pivot: null,
    done: new Set(),
    range: null,
    regions: [],
    note: "",
    compare: new Set(),
    splits: new Set(),
    arcs: new Map(),
  };
  const states = [init];
  p.steps.forEach((s) => states.push(apply(states[states.length - 1], s, n, "ArrayViz")));

  let k = 0; // number of steps that have started
  starts.forEach((s, i) => {
    if (t >= s) k = i + 1;
  });
  const before = states[Math.max(0, k - 1)];
  const after = states[k];
  const stepStart = k > 0 ? starts[k - 1] : 0;
  const nextStart = k < starts.length ? starts[k] : Number.POSITIVE_INFINITY;
  const dur = Math.max(0.15, Math.min(p.transition, (nextStart - stepStart) * 0.85));
  const prog = k === 0 ? 1 : interpolate(t, [stepStart, stepStart + dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });

  // Geometry: everything derives from the cell size.
  const pointerNames: string[] = [];
  for (const s of p.steps) for (const name of Object.keys(s.pointers ?? {})) if (!pointerNames.includes(name)) pointerNames.push(name);
  const usesOutside = p.steps.some((s) => Object.values(s.pointers ?? {}).some((v) => v === -1 || v === n));
  const labelW = p.label ? 90 : 0;
  const gap = 14;
  const maxSplits = Math.max(0, ...states.map((s) => s.splits.size));
  const slots = n + (usesOutside ? 2 : 0) + maxSplits * 0.6;
  const cell = Math.max(56, Math.min(150, (p.width - labelW - gap * (slots - 1)) / slots));
  const splitGap = cell * 0.6;
  const margin = usesOutside ? cell + gap : 0;
  const font = Math.max(28, Math.min(64, cell * 0.42));
  const rowW = n * cell + (n - 1) * gap + maxSplits * splitGap;
  const totalW = labelW + margin * 2 + rowW;
  const x0 = labelW + margin;
  // x of a position in a given state (splits push later cells right), and blended for "now".
  const xOfS = (s: State, pos: number) => x0 + pos * (cell + gap) + splitGap * [...s.splits].filter((k) => k < pos).length;
  const xOf = (pos: number) => xOfS(before, pos) + (xOfS(after, pos) - xOfS(before, pos)) * prog;

  const top = 8;
  const idxH = p.showIndices ? 40 : 0;
  const laneH = 50;
  const pointersTop = top + cell + idxH + 10;
  const maxRegionLanes = Math.max(0, ...states.map((s) => (s.regions.length ? Math.max(...regionLanes(s.regions)) + 1 : 0)));
  const regionsTop = pointersTop + pointerNames.length * laneH + (pointerNames.length ? 8 : 0);
  const regionH = 58;
  const hasNotes = p.steps.some((s) => s.note);
  const noteTop = regionsTop + maxRegionLanes * regionH + (maxRegionLanes ? 6 : 0);
  const totalH = noteTop + (hasNotes ? 64 : 0);

  const appear = (i: number) => interpolate(t, [resolveAt(p.at, timing) + i * 0.05, resolveAt(p.at, timing) + i * 0.05 + 0.5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
  const shown = appear(0);

  const posOf = (s: State, el: number) => s.order.indexOf(el);
  const toneOfCell = (s: State, pos: number, el: number, live: boolean): { border: string; fill: string; text: string } => {
    if (live && s.compare.has(pos)) return { border: color("info"), fill: `${color("info")}33`, text: color("text") };
    if (s.pivot === el) return { border: color("accent"), fill: `${color("accent")}2e`, text: color("text") };
    if (s.done.has(pos)) return { border: color("ok"), fill: `${color("ok")}2a`, text: color("text") };
    return { border: color("grid"), fill: color("raised"), text: color("text") };
  };
  const tonesNow = prog < 0.5 ? before : after;
  const live = prog >= 0.5 || k === 0;

  // Range box (interpolated).
  const rangeBox = (s: State) => (s.range ? { l: xOf(s.range[0]) - 8, r: xOf(s.range[1]) + cell + 8 } : null);
  const rb0 = rangeBox(before);
  const rb1 = rangeBox(after);
  const rb = rb1 && rb0 ? { l: rb0.l + (rb1.l - rb0.l) * prog, r: rb0.r + (rb1.r - rb0.r) * prog } : rb1;
  const rangeOpacity = rb1 ? (rb0 ? 1 : prog) : rb0 ? 1 - prog : 0;
  const inRange = (s: State, pos: number) => !s.range || (pos >= s.range[0] && pos <= s.range[1]);

  return (
    <div style={{ position: "relative", width: totalW, height: totalH, opacity: shown, fontFamily: fonts.mono }}>
      {p.label ? (
        <div style={{ position: "absolute", left: 0, top, width: labelW - 20, height: cell, display: "flex", alignItems: "center", justifyContent: "flex-end", fontSize: font * 0.8, color: color("muted"), fontFamily: fonts.serif, fontStyle: "italic" }}>
          <RichText text={p.label} />
        </div>
      ) : null}

      {rb ? (
        <div style={{ position: "absolute", left: rb.l, top: top - 8, width: rb.r - rb.l, height: cell + 16, border: `3px solid ${color("accent")}`, borderRadius: 14, opacity: rangeOpacity * 0.85 }} />
      ) : null}

      {/* Cells: each element interpolates from its old to its new position. */}
      {after.order.map((el) => {
        const p0 = posOf(before, el);
        const p1 = posOf(after, el);
        const x = xOfS(before, p0) + (xOfS(after, p1) - xOfS(before, p0)) * prog;
        const arc = k > 0 ? (after.arcs.get(el) ?? 0) : 0;
        const bump = Math.sin(Math.PI * prog);
        // Cells under comparison lift up; they settle back when the next step starts.
        const lift = k === 0 ? 0 : after.compare.has(p1) ? prog : before.compare.has(p0) ? 1 - prog : 0;
        const y = top - arc * bump * cell * (arc > 0 ? 0.85 : 0.5) - lift * cell * 0.16;
        const justDone = k > 0 && after.done.has(p1) && !before.done.has(p1);
        const scale = 1 + (justDone ? 0.14 * bump : 0) + lift * 0.05;
        const rotate = arc * 9 * bump;
        const pos = prog < 0.5 ? p0 : p1;
        const tone = toneOfCell(tonesNow, pos, el, live);
        const v0 = before.values[el];
        const v1 = after.values[el];
        const changed = v0 !== v1;
        const dim = inRange(tonesNow, pos) ? 1 : 0.35;
        return (
          <div
            key={el}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: cell,
              height: cell,
              borderRadius: 12,
              border: `3px solid ${tone.border}`,
              background: tone.fill,
              color: tone.text,
              display: "grid",
              placeItems: "center",
              fontSize: font,
              fontWeight: 500,
              opacity: appear(p1) * dim,
              transform: `scale(${scale * (0.7 + 0.3 * appear(p1))}) rotate(${rotate}deg)`,
              boxShadow: lift > 0 ? `0 ${14 * lift}px ${28 * lift}px rgba(0,0,0,0.45)` : undefined,
              zIndex: arc || lift ? 2 : 1,
            }}
          >
            {changed ? (
              <span style={{ display: "grid", placeItems: "center" }}>
                <span style={{ gridArea: "1/1", opacity: 1 - prog }}>{String(v0)}</span>
                <span style={{ gridArea: "1/1", opacity: prog, color: color("accent") }}>{String(v1)}</span>
              </span>
            ) : (
              String(v1)
            )}
          </div>
        );
      })}

      {p.showIndices
        ? p.values.map((_, i) => (
            <div key={i} style={{ position: "absolute", left: xOf(i), top: top + cell + 6, width: cell, textAlign: "center", fontSize: 26, color: color("faint"), opacity: appear(i) * (inRange(tonesNow, i) ? 1 : 0.5) }}>
              {i}
            </div>
          ))
        : null}

      {/* Pointers: one fixed lane per pointer name, so labels never collide. */}
      {pointerNames.map((name, lane) => {
        const a = before.pointers[name];
        const b = after.pointers[name];
        if ((a === undefined || a === null) && (b === undefined || b === null)) return null;
        const from = a ?? b!;
        const to = b ?? a!;
        const cx = xOf(from) + cell / 2 + (xOf(to) - xOf(from)) * prog;
        const op = a == null ? prog : b == null ? 1 - prog : 1;
        const tone = color(p.pointerTones[name] ?? DEFAULT_TONES[lane % DEFAULT_TONES.length]);
        const yTop = pointersTop + lane * laneH;
        return (
          <div key={name} style={{ position: "absolute", left: cx, top: top + cell + idxH - 4, transform: "translateX(-50%)", opacity: op, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ width: 0, height: 0, borderLeft: "10px solid transparent", borderRight: "10px solid transparent", borderBottom: `14px solid ${tone}` }} />
            <div style={{ width: 3, height: yTop - (top + cell + idxH - 4) - 14 + 6, background: tone, opacity: 0.6 }} />
            <div style={{ fontSize: 30, fontWeight: 600, color: tone, lineHeight: 1, padding: "2px 6px" }}>{name}</div>
          </div>
        );
      })}

      {/* Regions: brackets under the array, lanes assigned to avoid overlap. */}
      {([before, after] as const).map((s, which) => {
        const lanes = regionLanes(s.regions);
        const same = before.regions === after.regions;
        if (same && which === 0) return null;
        const op = same ? 1 : which === 0 ? 1 - prog : prog;
        return s.regions.map((r, i) => {
          const l = xOf(Math.min(r.from, r.to));
          const rr = xOf(Math.max(r.from, r.to)) + cell;
          const y = regionsTop + lanes[i] * regionH;
          const c = color(r.tone);
          return (
            <div key={`${which}-${i}`} style={{ position: "absolute", left: l, top: y, width: rr - l, opacity: op }}>
              <div style={{ height: 14, borderLeft: `3px solid ${c}`, borderRight: `3px solid ${c}`, borderBottom: `3px solid ${c}` }} />
              {r.label ? (
                <div style={{ textAlign: "center", fontFamily: fonts.sans, fontSize: 28, color: c, marginTop: 4, whiteSpace: "nowrap" }}>
                  <RichText text={r.label} />
                </div>
              ) : null}
            </div>
          );
        });
      })}

      {hasNotes ? (
        <div style={{ position: "absolute", left: 0, width: totalW, top: noteTop, height: 64, display: "grid", placeItems: "center", fontFamily: fonts.sans, fontSize: sizes.small + 4, color: color("text") }}>
          {before.note !== after.note ? (
            <>
              <span style={{ gridArea: "1/1", opacity: 1 - prog }}><RichText text={before.note} /></span>
              <span style={{ gridArea: "1/1", opacity: prog }}><RichText text={after.note} /></span>
            </>
          ) : (
            <span style={{ gridArea: "1/1" }}><RichText text={after.note} /></span>
          )}
        </div>
      ) : null}
    </div>
  );
}

export const arrayVizMeta: KitEntry = {
  name: "ArrayViz",
  category: "component",
  summary:
    "An array of cells driven step by step, animated: swaps (two cells arc around each other), inserts, writes, compared cells lifting, i/j pointers sliding, pivot, current range, region brackets, splitting into chunks (divide and conquer), cells bouncing when placed. Computes every position itself, text never overlaps.",
  useWhen: [
    "Algorithms on arrays: sorting (quick, merge, insertion, bubble), binary search, two pointers, sliding window",
    "Step-by-step simulation, one step per narration sentence",
  ],
  avoidWhen: ["More than 16 elements", "More than ~10 steps in one scene: split the scene; the next scene starts from the previous end state (pass the new values)"],
  example: "array-quicksort.tsx",
  schema: arrayVizSchema,
};
