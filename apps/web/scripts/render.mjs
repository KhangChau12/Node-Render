// Render worker: node render.mjs <input.json> <out.mp4> <status.json> <kitDir>
// Spawned by the web app; reports progress through the status file.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";

const [inputPath, outPath, statusPath, kitDir] = process.argv.slice(2);
const { video, settings } = JSON.parse(fs.readFileSync(inputPath, "utf8"));

let last = 0;
function status(patch, force = false) {
  const t = Date.now();
  if (!force && t - last < 400) return;
  last = t;
  let cur = {};
  try {
    cur = JSON.parse(fs.readFileSync(statusPath, "utf8"));
  } catch {}
  if (cur.status === "cancelled") process.exit(1);
  fs.writeFileSync(statusPath, JSON.stringify({ ...cur, ...patch }));
}

try {
  status({ status: "bundling", progress: 0, error: null }, true);
  const serveUrl = await bundle({
    entryPoint: path.join(kitDir, "render", "entry.ts"),
    // Bundle the kit fresh each time; webpack cache keeps this fast after the first run.
    enableCaching: true,
  });

  const composition = await selectComposition({ serveUrl, id: "Lecture", inputProps: video });
  const totalFrames = composition.durationInFrames;
  status({ status: "rendering", totalFrames, renderedFrames: 0 }, true);

  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    crf: settings.crf ?? 18,
    outputLocation: outPath,
    inputProps: video,
    scale: (settings.height ?? 1080) / 1080,
    concurrency: Math.max(1, Math.floor(os.cpus().length * 0.75)),
    onProgress: ({ progress, renderedFrames }) => status({ progress, renderedFrames }),
  });

  status({ status: "done", progress: 1, renderedFrames: totalFrames, sizeBytes: fs.statSync(outPath).size }, true);
  process.exit(0);
} catch (err) {
  status({ status: "error", error: String(err?.stack || err).split("\n").slice(0, 6).join("\n") }, true);
  process.exit(1);
}
