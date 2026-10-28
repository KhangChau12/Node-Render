import fs from "node:fs/promises";
import path from "node:path";
import { dataDir, projectDir, projectsDir } from "./paths";
import { DEFAULT_SETTINGS, type Project, type Settings } from "./types";
import { tr } from "./i18n/server";
import { now } from "./util";

/*
 * File-based storage: data/projects/<id>/project.json.
 * Writes are serialized per project and done atomically (tmp + rename).
 */

const locks = new Map<string, Promise<unknown>>();

async function writeJson(file: string, value: unknown) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(value, null, 2), "utf8");
  await fs.rename(tmp, file);
}

const projectFile = (id: string) => path.join(projectDir(id), "project.json");

export async function getProject(id: string): Promise<Project | null> {
  try {
    return JSON.parse(await fs.readFile(projectFile(id), "utf8")) as Project;
  } catch {
    return null;
  }
}

export async function requireProject(id: string): Promise<Project> {
  const p = await getProject(id);
  if (!p) throw new HttpError(404, tr("err.noProject"));
  return p;
}

export async function listProjects(): Promise<Project[]> {
  let ids: string[] = [];
  try {
    ids = await fs.readdir(projectsDir());
  } catch {
    return [];
  }
  const all = await Promise.all(ids.map((id) => getProject(id).catch(() => null)));
  return (all.filter(Boolean) as Project[]).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function saveProject(p: Project): Promise<Project> {
  p.updatedAt = now();
  await writeJson(projectFile(p.id), p);
  return p;
}

/** Read-modify-write under a per-project lock. */
export async function updateProject(id: string, fn: (p: Project) => void | Promise<void>): Promise<Project> {
  const prev = locks.get(id) ?? Promise.resolve();
  const run = prev.then(async () => {
    const p = await requireProject(id);
    await fn(p);
    return saveProject(p);
  });
  locks.set(id, run.catch(() => undefined));
  return run;
}

export async function deleteProject(id: string) {
  await fs.rm(projectDir(id), { recursive: true, force: true });
}

export function emptyProject(id: string, prompt: string): Project {
  const t = now();
  return {
    id,
    title: tr("def.newLesson"),
    prompt,
    createdAt: t,
    updatedAt: t,
    lesson: null,
    lessonVersion: 0,
    lessonLocked: false,
    lessonHistory: [],
    script: null,
    scriptVersion: 0,
    scriptLocked: false,
    scriptHistory: [],
    sceneSectionHashes: {},
    builds: {},
    chats: { lesson: [], script: [], studio: [] },
    suggestions: [],
    renders: [],
    captions: true,
  };
}

/* Settings --------------------------------------------------------------- */

const settingsFile = () => path.join(dataDir(), "settings.json");

export async function getSettings(): Promise<Settings> {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(await fs.readFile(settingsFile(), "utf8")) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(s: Partial<Settings>): Promise<Settings> {
  const next = { ...(await getSettings()), ...s };
  await writeJson(settingsFile(), next);
  return next;
}

export async function dirSize(dir: string): Promise<number> {
  let total = 0;
  try {
    for (const e of await fs.readdir(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      total += e.isDirectory() ? await dirSize(p) : (await fs.stat(p)).size;
    }
  } catch {
    /* missing dir */
  }
  return total;
}

/* Errors ----------------------------------------------------------------- */

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
