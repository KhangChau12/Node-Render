import fs from "node:fs";
import path from "node:path";
import { env } from "./env";

/** Repo root: nearest ancestor whose package.json declares workspaces. */
export function repoRoot(): string {
  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    const pkg = path.join(dir, "package.json");
    if (fs.existsSync(pkg)) {
      try {
        if (JSON.parse(fs.readFileSync(pkg, "utf8")).workspaces) return dir;
      } catch {
        /* keep walking */
      }
    }
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return process.cwd();
}

export function dataDir(): string {
  const d = env("DATA_DIR") || "./data";
  return path.isAbsolute(d) ? d : path.join(repoRoot(), d);
}

export const projectsDir = () => path.join(dataDir(), "projects");
export const projectDir = (id: string) => path.join(projectsDir(), safeId(id));
export const rendersDir = (id: string) => path.join(projectDir(id), "renders");
export const kitDir = () => path.join(repoRoot(), "packages", "kit");

export function safeId(id: string): string {
  if (!/^[a-z0-9-]+$/i.test(id)) throw new Error("Invalid id");
  return id;
}
