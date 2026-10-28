/**
 * Renders the site's media with the product's own pipeline:
 *   - public/media/<lang>/<example>.jpg  a still of every kit example, per language
 *   - public/media/<lang>/reel.mp4        the hero reel: real scenes cut together by LectureVideo
 *                                          (transitions, captions), exactly what the app exports
 *   - public/media/<lang>/reel.json       scene boundaries and cue times, for the hero timeline
 *
 * Run from the repo root: npm run media -w @lecture/site   (takes a few minutes; needs Chrome Headless,
 * which Remotion downloads on first use).
 * Pass --stills or --reel to render only one kind.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { openBrowser, renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import { estimateTiming } from "../../../packages/kit/src/timing/estimate";
import { resolveAt } from "../../../packages/kit/src/timing/context";

const here = path.dirname(fileURLToPath(import.meta.url));
const site = path.resolve(here, "..");
const root = path.resolve(site, "../..");
const kit = path.join(root, "packages", "kit");
const media = path.join(site, "public", "media");
const LANGS = ["en", "vi"] as const;
type Lang = (typeof LANGS)[number];
const only = process.argv.find((a) => a === "--stills" || a === "--reel");

/** The hero reel: one scene per subject, in this order. */
export const REEL: { id: string; subject: string; title: Record<Lang, string> }[] = [
  { id: "three-pyramid", subject: "math", title: { en: "Pyramid S.ABCD, hidden edges dashed", vi: "Hình chóp S.ABCD, nét khuất tự đứt" } },
  { id: "stage-physics", subject: "physics", title: { en: "A spring oscillator that moves", vi: "Con lắc lò xo dao động" } },
  { id: "chem-reaction", subject: "chem", title: { en: "Bonds break, atoms rearrange", vi: "Liên kết đứt, nguyên tử sắp xếp lại" } },
  { id: "map-history", subject: "histgeo", title: { en: "The sea route to India", vi: "Đường biển sang Ấn Độ" } },
  { id: "passage-poem", subject: "lit", title: { en: "Close reading of a poem", vi: "Phân tích câu thơ" } },
  { id: "axes-derivative", subject: "math", title: { en: "The secant becomes the tangent", vi: "Cát tuyến thành tiếp tuyến" } },
  { id: "array-quicksort", subject: "cs", title: { en: "Quick sort, step by step", vi: "Quick sort, từng bước" } },
];

const exampleFile = (lang: Lang, id: string) => path.join(kit, "examples", ...(lang === "en" ? ["en"] : []), `${id}.tsx`);

function narrationOf(src: string): string {
  const m = /export const narration =\s*([\s\S]*?);\r?\n/.exec(src);
  if (!m) throw new Error("example has no narration");
  return eval(m[1]) as string;
}

/** Chrome already downloaded by the web app, if any (saves ~100 MB). */
function existingChrome(): string | undefined {
  const base = path.join(root, "apps", "web", "node_modules", ".remotion", "chrome-headless-shell");
  if (!fs.existsSync(base)) return undefined;
  const walk = (d: string): string | undefined => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) {
        const hit = walk(p);
        if (hit) return hit;
      } else if (/^chrome-headless-shell(\.exe)?$/.test(e.name)) return p;
    }
    return undefined;
  };
  return walk(base);
}

async function main() {
  const browserExecutable = existingChrome() ?? null;
  const browser = await openBrowser("chrome", { browserExecutable });
  const alias = (c: any) => ({ ...c, resolve: { ...c.resolve, alias: { ...(c.resolve?.alias ?? {}), "@kit": path.join(kit, "src", "index.ts") } } });
  try {
    if (only !== "--reel") {
      // Stills of every example from the kit gallery (Vietnamese ids "x", English ids "en-x").
      const serveUrl = await bundle({ entryPoint: path.join(kit, "studio", "index.ts"), webpackOverride: alias });
      const ids = fs.readdirSync(path.join(kit, "examples")).filter((f) => f.endsWith(".tsx")).map((f) => f.replace(/\.tsx$/, ""));
      for (const lang of LANGS) {
        fs.mkdirSync(path.join(media, lang), { recursive: true });
        for (const id of ids) {
          const composition = await selectComposition({ serveUrl, id: lang === "en" ? `en-${id}` : id, puppeteerInstance: browser });
          const frame = Math.min(composition.durationInFrames - 1, Math.round(composition.durationInFrames * 0.93));
          await renderStill({ serveUrl, composition, frame, output: path.join(media, lang, `${id}.jpg`), imageFormat: "jpeg", jpegQuality: 84, scale: 0.5, puppeteerInstance: browser });
          process.stdout.write(`still ${lang}/${id}\n`);
        }
      }
    }
    if (only !== "--stills") {
      // The reel goes through the same composition the app renders lectures with.
      const serveUrl = await bundle({ entryPoint: path.join(kit, "render", "entry.ts"), webpackOverride: alias });
      for (const lang of LANGS) {
        fs.mkdirSync(path.join(media, lang), { recursive: true });
        const scenes = REEL.map((r) => {
          const code = fs.readFileSync(exampleFile(lang, r.id), "utf8");
          return { id: r.id, title: r.title[lang], code, timing: estimateTiming(narrationOf(code)) };
        });
        const fps = 30;
        const video = { fps, width: 1920, height: 1080, captions: true, scenes };
        const composition = await selectComposition({ serveUrl, id: "Lecture", inputProps: video, puppeteerInstance: browser });
        await renderMedia({
          serveUrl,
          composition,
          codec: "h264",
          crf: 27,
          scale: 2 / 3,
          inputProps: video,
          outputLocation: path.join(media, lang, "reel.mp4"),
          puppeteerInstance: browser,
          onProgress: ({ progress }) => process.stdout.write(`\rreel ${lang} ${Math.round(progress * 100)}%`),
        });
        process.stdout.write("\n");
        // Timeline data: where each scene starts and when its cues fire (seconds in the reel).
        let start = 0;
        const meta = scenes.map((s, i) => {
          const frames = Math.max(1, Math.ceil(s.timing.duration * fps));
          const cues = [...new Set([...s.code.matchAll(/["'`]cue:([^"'`]+)["'`]/g)].map((m) => m[1]))].map((raw) => resolveAt(`cue:${raw}`, s.timing));
          const entry = { id: s.id, subject: REEL[i].subject, title: s.title, start: start / fps, duration: frames / fps, cues: [...new Set(cues.map((c) => Math.round(c * 10) / 10))].sort((a, b) => a - b) };
          start += frames;
          return entry;
        });
        fs.writeFileSync(path.join(media, lang, "reel.json"), JSON.stringify({ duration: start / fps, scenes: meta }, null, 1));
      }
    }
  } finally {
    await browser.close({ silent: true });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
