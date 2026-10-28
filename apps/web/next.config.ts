import type { NextConfig } from "next";

// Config from the repo-root .env.local is loaded by lib/env.ts, not here:
// Next only reads .env files from apps/web.
const config: NextConfig = {
  // NEXT_DIST_DIR lets a second instance (e.g. `next dev` next to `next start`) use its own build folder.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  transpilePackages: ["@lecture/kit"],
  devIndicators: false,
};

export default config;
