import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { kitDir, rendersDir, repoRoot } from "./paths";
import { tr } from "./i18n/server";
import { getSettings, HttpError, requireProject, updateProject } from "./storage";
import type { RenderJob, RenderSettings } from "./types";
import { now, slugify, uid } from "./util";
import { buildVideoInput, sceneStatus } from "./video";

/*
 * Renders run in a separate Node process (scripts/render.mjs) so heavy CPU work
 * never blocks the web server. The worker writes progress to <job>.status.json.
 */

type Status = Pick<RenderJob, "status" | "progress" | "renderedFrames" | "totalFrames" | "error" | "sizeBytes">;

const statusFile = (id: string, job: string) => path.join(rendersDir(id), `${job}.status.json`);

export async function startRender(id: string, settings: RenderSettings): Promise<RenderJob> {
  const project = await requireProject(id);
  const scenes = project.script?.scenes ?? [];
  if (!scenes.length) throw new HttpError(400, tr("err.noScenesToRender"));
  const broken = scenes.filter((s) => ["missing", "error"].includes(sceneStatus(project, s)));
  if (broken.length) throw new HttpError(409, tr("err.brokenScenes", { n: broken.length }));

  const input = buildVideoInput(project, await getSettings(), { fps: settings.fps, captions: settings.captions });
  const jobId = uid("r");
  const dir = rendersDir(id);
  await fs.mkdir(dir, { recursive: true });
  const file = `${slugify(project.title)}_v${project.scriptVersion}_${settings.height}p_${jobId.slice(-4)}.mp4`;
  const inputPath = path.join(dir, `${jobId}.input.json`);
  await fs.writeFile(inputPath, JSON.stringify({ video: input, settings }), "utf8");

  const child = spawn(process.execPath, [path.join(repoRoot(), "apps", "web", "scripts", "render.mjs"), inputPath, path.join(dir, file), statusFile(id, jobId), kitDir()], {
    cwd: path.join(repoRoot(), "apps", "web"),
    detached: false,
    stdio: ["ignore", "ignore", "pipe"],
    windowsHide: true,
  });
  let stderr = "";
  child.stderr?.on("data", (d) => (stderr = (stderr + d.toString()).slice(-4000)));
  child.on("exit", async (code) => {
    if (code !== 0) {
      const cur = await readStatus(id, jobId);
      if (cur?.status !== "cancelled" && cur?.status !== "error") {
        await fs.writeFile(statusFile(id, jobId), JSON.stringify({ ...cur, status: "error", error: stderr.trim().split("\n").slice(-6).join("\n") || `exit ${code}` }));
      }
    }
  });

  const job: RenderJob = {
    id: jobId,
    createdAt: now(),
    status: "queued",
    progress: 0,
    renderedFrames: 0,
    totalFrames: 0,
    file,
    settings,
    error: null,
    sizeBytes: null,
    pid: child.pid,
  };
  await updateProject(id, (p) => {
    p.renders.unshift(job);
  });
  return job;
}

async function readStatus(id: string, job: string): Promise<Partial<Status> | null> {
  try {
    return JSON.parse(await fs.readFile(statusFile(id, job), "utf8"));
  } catch {
    return null;
  }
}

/** Jobs with live status merged in from the worker's status files. */
export async function listRenders(id: string): Promise<RenderJob[]> {
  const p = await requireProject(id);
  return Promise.all(p.renders.map(async (j) => ({ ...j, ...((await readStatus(id, j.id)) ?? {}) })));
}

export async function cancelRender(id: string, jobId: string) {
  const jobs = await listRenders(id);
  const j = jobs.find((x) => x.id === jobId);
  if (!j) throw new HttpError(404, tr("err.noRender"));
  if (j.pid && (j.status === "queued" || j.status === "bundling" || j.status === "rendering")) {
    try {
      process.kill(j.pid);
    } catch {
      /* already gone */
    }
  }
  await fs.writeFile(statusFile(id, jobId), JSON.stringify({ ...j, status: "cancelled" }));
  return listRenders(id);
}

export async function deleteRender(id: string, jobId: string) {
  const p = await requireProject(id);
  const j = p.renders.find((x) => x.id === jobId);
  if (!j) return listRenders(id);
  const dir = rendersDir(id);
  await Promise.all(
    [j.file, `${jobId}.status.json`, `${jobId}.input.json`].map((f) => fs.rm(path.join(dir, f), { force: true })),
  );
  await updateProject(id, (pp) => {
    pp.renders = pp.renders.filter((x) => x.id !== jobId);
  });
  return listRenders(id);
}
