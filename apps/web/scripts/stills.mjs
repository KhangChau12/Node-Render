// Stills worker: node stills.mjs <input.json> <outDir> <kitDir> <cacheDir>
// input.json = { video, times: number[] } (times in seconds from the start of the video).
// Prints one JSON line: { files: string[], fit: number[] } or { error: string }.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { openBrowser, renderStill, selectComposition } from "@remotion/renderer";

const [inputPath, outDir, kitDir, cacheDir] = process.argv.slice(2);
const { video, times } = JSON.parse(fs.readFileSync(inputPath, "utf8"));

/** Hash of the kit sources: the bundle is rebuilt only when the kit changes. */
function kitHash() {
  const h = crypto.createHash("sha1");
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else {
        const st = fs.statSync(p);
        h.update(`${p}:${st.size}:${st.mtimeMs}`);
      }
    }
  };
  walk(path.join(kitDir, "src"));
  walk(path.join(kitDir, "render"));
  return h.digest("hex").slice(0, 12);
}

async function serveUrl() {
  const dir = path.join(cacheDir, `bundle-${kitHash()}`);
  if (fs.existsSync(path.join(dir, "index.html"))) return dir;
  const tmp = `${dir}-tmp-${process.pid}`;
  await bundle({ entryPoint: path.join(kitDir, "render", "entry.ts"), outDir: tmp, enableCaching: true });
  try {
    fs.renameSync(tmp, dir);
  } catch {
    // Another worker finished first; use theirs.
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  return dir;
}

try {
  fs.mkdirSync(outDir, { recursive: true });
  const url = await serveUrl();
  const browser = await openBrowser("chrome");
  try {
    const composition = await selectComposition({ serveUrl: url, id: "Lecture", inputProps: video, puppeteerInstance: browser });
    const files = [];
    // fit[i]: smallest scale a layout applied to squeeze its content into shot i (1 = not shrunk).
    const fit = [];
    for (const [i, t] of times.entries()) {
      const frame = Math.max(0, Math.min(composition.durationInFrames - 1, Math.round(t * video.fps)));
      const output = path.join(outDir, `shot-${i}.png`);
      // Layouts log "[kit-fit] <area> <scale>" each time they measure; the last value of each area is the settled one.
      const areas = new Map();
      const onBrowserLog = (log) => {
        const m = /\[kit-fit\] (\S+) ([\d.]+)/.exec(log.text);
        if (m) areas.set(m[1], Number(m[2]));
      };
      await renderStill({ composition, serveUrl: url, frame, inputProps: video, output, scale: 0.5, puppeteerInstance: browser, onBrowserLog });
      files.push(output);
      fit.push(Math.min(1, ...areas.values()));
    }
    process.stdout.write(JSON.stringify({ files, fit }) + "\n");
  } finally {
    await browser.close({ silent: true });
  }
  process.exit(0);
} catch (err) {
  process.stdout.write(JSON.stringify({ error: String(err?.message || err).split("\n").slice(0, 4).join("\n") }) + "\n");
  process.exit(1);
}
