import React, { createContext, useContext } from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { ease } from "../theme";
import { normalizeWord, type SceneTiming } from "./estimate";

/**
 * A moment inside the scene:
 * - number: seconds from scene start
 * - "cue:<phrase>": when the narrator starts saying <phrase>
 * - "cue:<phrase>@end": when the narrator finishes <phrase>
 * - "end" / "end-1.5": relative to the end of the scene
 * Any form may carry an offset: "cue:tiếp tuyến+0.3".
 */
export type At = number | string;

export const atSchema = z
  .union([z.number(), z.string()])
  .describe('Time: seconds, "cue:<phrase from the narration>", "cue:<phrase>@end", or "end-<seconds>"');

const EMPTY: SceneTiming = { text: "", words: [], duration: 10, source: "estimate" };

const TimingContext = createContext<SceneTiming>(EMPTY);

export function SceneTimingProvider({ timing, children }: { timing: SceneTiming; children: React.ReactNode }) {
  return <TimingContext.Provider value={timing}>{children}</TimingContext.Provider>;
}

export function useSceneTiming(): SceneTiming {
  return useContext(TimingContext);
}

/** Cues that did not match the narration; surfaced in the editor as warnings. */
export const missingCues = new Set<string>();

function findPhrase(timing: SceneTiming, phrase: string): { start: number; end: number } | null {
  const target = phrase.split(/\s+/).map(normalizeWord).filter(Boolean);
  if (!target.length) return null;
  const words = timing.words;
  outer: for (let i = 0; i + target.length <= words.length; i++) {
    for (let j = 0; j < target.length; j++) {
      if (words[i + j].norm !== target[j]) continue outer;
    }
    return { start: words[i].start, end: words[i + target.length - 1].end };
  }
  return null;
}

/** Resolve an At to seconds within the scene. */
export function resolveAt(at: At | undefined, timing: SceneTiming): number {
  if (at === undefined || at === null) return 0;
  if (typeof at === "number") return Math.max(0, at);
  const s = at.trim();
  const m = /^(.*?)([+-]\d+(?:\.\d+)?)?$/.exec(s)!;
  const body = m[1].trim();
  const offset = m[2] ? parseFloat(m[2]) : 0;
  if (body === "end" || body === "") return Math.max(0, (body === "end" ? timing.duration : 0) + offset);
  if (body.startsWith("cue:")) {
    let phrase = body.slice(4).trim();
    const atEnd = phrase.endsWith("@end");
    if (atEnd) phrase = phrase.slice(0, -4).trim();
    const hit = findPhrase(timing, phrase);
    if (!hit) {
      missingCues.add(phrase);
      return Math.max(0, offset);
    }
    return Math.max(0, (atEnd ? hit.end : hit.start) + offset);
  }
  const n = Number(body);
  return Number.isFinite(n) ? Math.max(0, n + offset) : 0;
}

/** Current time in seconds inside the scene. */
export function useSceneTime(): number {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return frame / fps;
}

/** Seconds at which `at` happens. */
export function useAt(at: At | undefined): number {
  return resolveAt(at, useSceneTiming());
}

/** 0→1 progress of an animation that starts at `at` (+delay) and lasts `duration` seconds. */
export function useProgress(at: At | undefined, duration = 0.6, delay = 0): number {
  const start = useAt(at) + delay;
  const t = useSceneTime();
  if (duration <= 0) return t >= start ? 1 : 0;
  return interpolate(t, [start, start + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });
}

/** True once `at` has been reached. */
export function useIsAfter(at: At | undefined): boolean {
  return useSceneTime() >= useAt(at);
}
