/**
 * Builds the static site into dist/: src/index.html + kit metadata (English from the kit,
 * Vietnamese from src/kit-vi.json) + hero reel data, and copies public/ (rendered media).
 * Run: npm run build -w @lecture/site   (render media first with npm run media -w @lecture/site)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const site = path.dirname(fileURLToPath(import.meta.url));
const kitDocs = path.join(site, "..", "..", "packages", "kit", "docs", "kit-meta.json");
const media = path.join(site, "public", "media");
const dist = path.join(site, "dist");
const LANGS = ["en", "vi"];

const meta = JSON.parse(fs.readFileSync(kitDocs, "utf8"));
const vi = JSON.parse(fs.readFileSync(path.join(site, "src", "kit-vi.json"), "utf8"));
const toVi = (s) => (s && vi[s]) || s;
const hasStill = (id) => LANGS.every((l) => fs.existsSync(path.join(media, l, `${id}.jpg`)));

const kit = meta.map((e) => {
  const ex = e.example ? e.example.replace(/\.tsx$/, "") : null;
  return {
    name: e.name,
    category: e.category,
    ex: ex && hasStill(ex) ? ex : null,
    example: e.example,
    en: { summary: e.summary, useWhen: e.useWhen, avoidWhen: e.avoidWhen, children: e.children },
    vi: { summary: toVi(e.summary), useWhen: e.useWhen.map(toVi), avoidWhen: e.avoidWhen.map(toVi), children: toVi(e.children) },
    props: e.props.map((p) => ({ name: p.name, type: p.type, def: p.def, en: p.description, vi: toVi(p.description) })),
  };
});
const examples = fs.readdirSync(path.join(site, "..", "..", "packages", "kit", "examples")).filter((f) => f.endsWith(".tsx")).length;
const reels = Object.fromEntries(LANGS.map((l) => {
  const f = path.join(media, l, "reel.json");
  if (!fs.existsSync(f)) throw new Error(`Missing ${path.relative(site, f)}: run npm run media -w @lecture/site first.`);
  return [l, JSON.parse(fs.readFileSync(f, "utf8"))];
}));

const data = `const KIT = ${JSON.stringify(kit)};\nconst KIT_STATS = ${JSON.stringify({ elements: kit.length, examples })};\nconst REELS = ${JSON.stringify(reels)};`;
const html = fs.readFileSync(path.join(site, "src", "index.html"), "utf8").replace("/*SITE_DATA*/", data);

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });
fs.cpSync(path.join(site, "public"), dist, { recursive: true });
fs.writeFileSync(path.join(dist, "index.html"), html);
const size = (d) => fs.readdirSync(d, { withFileTypes: true }).reduce((n, e) => n + (e.isDirectory() ? size(path.join(d, e.name)) : fs.statSync(path.join(d, e.name)).size), 0);
console.log(`dist/ ${(size(dist) / 1024 / 1024).toFixed(1)} MB · ${kit.length} kit entries · ${examples} examples · reels ${LANGS.map((l) => `${l} ${reels[l].duration.toFixed(0)}s`).join(", ")}`);
