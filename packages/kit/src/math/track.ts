import { Easing, interpolate } from "remotion";
import { z } from "zod";
import { ease } from "../theme";
import { atSchema, resolveAt, useSceneTime, useSceneTiming } from "../timing/context";
import type { SceneTiming } from "../timing/estimate";

/*
 * Tracks: a number that changes over the scene, like a slider moved in sync
 * with the narration. The first key is the starting value; every later key
 * animates to its value starting at its `at`. Anything computed from a track
 * (a curve, a point, a label) moves with it.
 */

const easeName = z.enum(["smooth", "linear", "spring"]);

export const trackKeySchema = z.object({
  at: atSchema,
  value: z.number(),
  duration: z.number().nonnegative().optional().describe("Time to reach this value (seconds)"),
  ease: easeName.optional().describe("smooth (default), linear (steady, for continuous sweeps/rotations), spring (slight bounce)"),
});

export const trackSchema = z
  .union([z.number(), z.array(trackKeySchema).min(1)])
  .describe('A fixed number, or keyframes [{ at: 0, value: 1 }, { at: "cue:…", value: 3 }]: the first key is the starting value, each later key moves smoothly to its value');

export type Track = z.input<typeof trackSchema>;
type Key = z.input<typeof trackKeySchema>;

const springy = Easing.out(Easing.back(1.6));
const easeFn = (name: Key["ease"]) => (name === "linear" ? (x: number) => x : name === "spring" ? springy : ease);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Value of a track at scene time t. */
export function evalTrack(track: Track | undefined, t: number, timing: SceneTiming, duration = 0.8): number {
  if (track === undefined) return 0;
  if (typeof track === "number") return track;
  let v = track[0].value;
  for (let i = 1; i < track.length; i++) {
    const k = track[i];
    const s = resolveAt(k.at, timing);
    const d = k.duration ?? duration;
    const p = d <= 0 ? (t >= s ? 1 : 0) : interpolate(t, [s, s + d], [0, 1], clamp);
    v = v + (k.value - v) * easeFn(k.ease)(p);
  }
  return v;
}

/**
 * Discrete view of a track: the value before and after the transition running
 * now, and its 0→1 progress. Used by things that cannot be interpolated
 * (a number of rectangles, a count of dots).
 */
export function trackPhase(track: Track | undefined, t: number, timing: SceneTiming, duration = 0.8): { from: number; to: number; k: number } {
  if (track === undefined) return { from: 0, to: 0, k: 1 };
  if (typeof track === "number") return { from: track, to: track, k: 1 };
  let from = track[0].value;
  let to = track[0].value;
  let k = 1;
  for (let i = 1; i < track.length; i++) {
    const s = resolveAt(track[i].at, timing);
    if (t < s) break;
    const d = track[i].duration ?? duration;
    from = to;
    to = track[i].value;
    k = d <= 0 ? 1 : Math.min(1, (t - s) / d);
  }
  return { from, to, k };
}

/** Current value of a track (hook). Use it in scene code to drive any prop. */
export function useTrack(track: Track, duration = 0.8): number {
  return evalTrack(track, useSceneTime(), useSceneTiming(), duration);
}

/** Evaluate a record of tracks (named parameters of an expression). */
export function evalParams(params: Record<string, Track> | undefined, t: number, timing: SceneTiming, duration = 0.8): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(params ?? {})) out[k] = evalTrack(v, t, timing, duration);
  return out;
}
