import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { dataDir, kitDir, repoRoot } from "./paths";
import { tr } from "./i18n/server";
import type { Project, Settings } from "./types";
import { uid } from "./util";
import { buildVideoInput } from "./video";

/*
 * Screenshots of one scene, for the visual review. Rendering runs in a separate
 * process (scripts/stills.mjs), like full renders, so the server stays responsive.
 */

/** `fit`: how much the layout shrank the content to fit (1 = not at all). */
export type Shot = { png: Buffer; t: number; fit: number };

/** Moments worth checking: mid-scene, late, and the final (most crowded) state. */
export function shotTimes(duration: number): number[] {
  const ts = [duration * 0.45, duration * 0.8, duration - 0.4].map((t) => Math.max(0.3, Math.min(duration - 0.1, t)));
  return [...new Set(ts.map((t) => Math.round(t * 10) / 10))];
}

/**
 * Renders stills of one scene. By default the review moments with captions on;
 * pass `times` (seconds into the scene) and `captions` to grab what the teacher sees.
 */
export async function renderShots(
  project: Project,
  settings: Settings,
  sceneId: string,
  signal?: AbortSignal,
  opts: { times?: number[]; captions?: boolean } = {},
): Promise<Shot[]> {
  const input = buildVideoInput(project, settings, { fps: 30, captions: opts.captions ?? true });
  const scene = input.scenes.find((s) => s.id === sceneId);
  if (!scene) throw new Error(tr("err.noScene"));
  const video = { ...input, scenes: [scene] };
  const times = opts.times ?? shotTimes(scene.timing.duration);

  const cache = path.join(dataDir(), ".cache");
  const dir = path.join(cache, "stills", uid("s"));
  await fs.mkdir(dir, { recursive: true });
  const inputPath = path.join(dir, "input.json");
  await fs.writeFile(inputPath, JSON.stringify({ video, times }), "utf8");

  try {
    const out = await new Promise<string>((resolve, reject) => {
      const child = spawn(process.execPath, [path.join(repoRoot(), "apps", "web", "scripts", "stills.mjs"), inputPath, dir, kitDir(), cache], {
        cwd: path.join(repoRoot(), "apps", "web"),
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      });
      let stdout = "";
      let stderr = "";
      child.stdout.on("data", (d) => (stdout += d.toString()));
      child.stderr.on("data", (d) => (stderr = (stderr + d.toString()).slice(-2000)));
      const abort = () => child.kill();
      signal?.addEventListener("abort", abort, { once: true });
      child.on("exit", (code) => {
        signal?.removeEventListener("abort", abort);
        const line = stdout.trim().split("\n").pop() ?? "";
        if (code === 0) resolve(line);
        else {
          let msg = stderr.trim().split("\n").slice(-3).join("\n") || `exit ${code}`;
          try {
            msg = JSON.parse(line).error ?? msg;
          } catch {}
          reject(new Error(tr("err.stills", { m: msg })));
        }
      });
    });
    const { files, fit } = JSON.parse(out) as { files: string[]; fit?: number[] };
    return Promise.all(files.map(async (f, i) => ({ png: await fs.readFile(f), t: times[i], fit: fit?.[i] ?? 1 })));
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}
