import { estimateTiming, fitTiming, type SceneTiming } from "@lecture/kit/timing";
import type { Project, Scene, Settings } from "./types";
import { sceneHash, sectionsHash } from "./util";

/* Shared by the browser preview and the render worker. No Node imports here. */

export type VideoSceneInput = { id: string; title: string; code: string; timing: SceneTiming };

export type VideoInputData = {
  fps: number;
  width: number;
  height: number;
  captions: boolean;
  scenes: VideoSceneInput[];
};

export function placeholderCode(title: string, note: string): string {
  return `import { FullVisual, TitleCard } from "@kit";

export default function Scene() {
  return (
    <FullVisual align="left">
      <TitleCard kicker=${JSON.stringify(note)} title=${JSON.stringify(title)} />
    </FullVisual>
  );
}
`;
}

export function sceneTiming(project: Project, scene: Scene, settings: Settings): SceneTiming {
  const base = estimateTiming(scene.narration, { syllablesPerSecond: settings.syllablesPerSecond });
  return fitTiming(base, project.builds[scene.id]?.durationOverride);
}

export type SceneStatus = "missing" | "ok" | "error" | "outdated";

export function sceneStatus(project: Project, scene: Scene): SceneStatus {
  const b = project.builds[scene.id];
  if (!b) return "missing";
  if (b.error) return "error";
  if (b.sourceHash !== sceneHash(scene)) return "outdated";
  return "ok";
}

/** Scene whose linked lesson sections changed since the scene was written. */
export function lessonChangedFor(project: Project, scene: Scene): boolean {
  const h = project.sceneSectionHashes[scene.id];
  return h !== undefined && h !== "" && h !== sectionsHash(project.lesson, scene.sectionIds);
}

export function buildVideoInput(project: Project, settings: Settings, opts: { fps?: number; captions?: boolean } = {}): VideoInputData {
  const scenes = project.script?.scenes ?? [];
  return {
    fps: opts.fps ?? 30,
    width: 1920,
    height: 1080,
    captions: opts.captions ?? project.captions,
    scenes: scenes.map((s, i) => ({
      id: s.id,
      title: s.title,
      code: project.builds[s.id]?.code ?? placeholderCode(s.title, `Scene ${i + 1} · …`),
      timing: sceneTiming(project, s, settings),
    })),
  };
}

export function toSrt(input: VideoInputData, captionChunks: (t: SceneTiming) => { text: string; start: number; end: number }[]): string {
  const ts = (sec: number) => {
    const ms = Math.round(sec * 1000);
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms % 1000).padStart(3, "0")}`;
  };
  let offset = 0;
  let n = 1;
  const out: string[] = [];
  for (const sc of input.scenes) {
    for (const c of captionChunks(sc.timing)) {
      out.push(`${n++}\n${ts(offset + c.start)} --> ${ts(offset + c.end)}\n${c.text}\n`);
    }
    offset += Math.ceil(sc.timing.duration * input.fps) / input.fps;
  }
  return out.join("\n");
}

/** Cue references ("cue:phrase+0.5") used in scene code, unique, with the bare phrase. */
export function cueRefs(code: string): { raw: string; phrase: string }[] {
  const out: { raw: string; phrase: string }[] = [];
  const seen = new Set<string>();
  for (const m of code.matchAll(/["'`]cue:([^"'`]+)["'`]/g)) {
    if (seen.has(m[1])) continue;
    seen.add(m[1]);
    out.push({ raw: m[1], phrase: m[1].replace(/[+-]\d+(?:\.\d+)?$/, "").replace(/@end$/, "").trim() });
  }
  return out;
}

/** Lecture Kit components a scene imports. */
export function kitComponents(code: string): string[] {
  const m = code.match(/import\s*\{([^}]*)\}\s*from\s*["']@kit["']/);
  // Components are PascalCase; skip tokens and helpers (colors, sizes…).
  return m ? m[1].split(",").map((s) => s.trim().split(/\s+as\s+/)[0]).filter((s) => /^[A-Z]/.test(s)) : [];
}
