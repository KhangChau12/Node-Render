import fs from "node:fs";
import path from "node:path";
import { repoRoot } from "./paths";

// Next only loads .env files from apps/web and may reset process.env after
// next.config runs, so the shared .env.local at the repo root is loaded here,
// lazily, on first access. Variables already set in the environment win.
let loaded = false;

function loadRootEnv() {
  if (loaded) return;
  loaded = true;
  const root = repoRoot();
  const mode = process.env.NODE_ENV === "production" ? "production" : "development";
  for (const name of [`.env.${mode}.local`, ".env.local", `.env.${mode}`, ".env"]) {
    const file = path.join(root, name);
    if (fs.existsSync(file)) process.loadEnvFile(file);
  }
}

/** Read a config variable, loading the repo-root .env files on first use. */
export function env(name: string): string | undefined {
  loadRootEnv();
  const v = process.env[name];
  return v === undefined || v === "" ? undefined : v;
}
