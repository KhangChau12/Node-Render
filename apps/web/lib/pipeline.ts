import { lintScene } from "@lecture/kit/lint";
import { transform } from "sucrase";
import { errorText, msg, needLesson, needScene, needScript, putCode } from "./actions";
import * as ai from "./ai";
import type { Ctx } from "./ai";
import { kitComponentNames } from "./ai/prompts";
import { tr } from "./i18n/server";
import { renderShots, type Shot } from "./stills";
import { getSettings, HttpError, requireProject, updateProject } from "./storage";
import type { Project, Scene, Settings } from "./types";

/*
 * Scene code pipeline. Whatever produced the code (first draft, a chat edit,
 * a runtime-error fix), it goes through the same checks before and after it
 * is saved:
 *   1. syntax + kit linter, repaired by the model (≤ 2 rounds);
 *   2. saved and pushed to the browser, so the preview updates immediately;
 *   3. optional visual review: screenshots → vision model → one repair round.
 */

/** Streaming context for scene work: progress events plus intermediate project saves. */
export type StreamCtx = Ctx & { project: (p: Project) => void };

function sceneContext(p: Project, sceneId: string, settings: Settings): ai.SceneContext {
  const script = needScript(p);
  const i = script.scenes.findIndex((s) => s.id === sceneId);
  const prev = i > 0 ? script.scenes[i - 1] : null;
  return { lesson: needLesson(p), script, scene: needScene(p, sceneId), sps: settings.syllablesPerSecond, prevCode: prev ? (p.builds[prev.id]?.code ?? null) : null };
}

const label = (p: Project, sceneId: string) => `Scene ${needScript(p).scenes.findIndex((x) => x.id === sceneId) + 1}`;
const bullets = (xs: string[]) => xs.map((x) => `- ${x}`).join("\n");

/** Strip markdown fences or a stray language tag the model sometimes wraps code in. */
export function cleanCode(code: string): string {
  let c = code.trim();
  c = c.replace(/^```[a-zA-Z]*\s*\n/, "").replace(/\n```\s*$/, "");
  c = c.replace(/^(tsx|jsx|typescript)\s*\n/, "");
  return `${c.trim()}\n`;
}

/** Static problems in scene code: syntax errors plus the kit linter. */
export function checkCode(code: string, scene: Scene): string[] {
  const problems: string[] = [];
  try {
    transform(code, { transforms: ["typescript", "jsx", "imports"], jsxRuntime: "automatic", production: true, filePath: "scene.tsx" });
  } catch (e) {
    problems.push(tr("err.syntax", { m: (e as Error).message }));
  }
  problems.push(...lintScene(code, { narration: scene.narration, components: kitComponentNames() }).errors);
  return problems;
}

/** Repair static problems; returns the best code found. */
async function repairStatic(p: Project, sceneId: string, code: string, settings: Settings, ctx: Ctx, rounds = 2): Promise<string> {
  code = cleanCode(code);
  for (let round = 0; round < rounds; round++) {
    const problems = checkCode(code, needScene(p, sceneId));
    if (!problems.length) break;
    ctx.emit({ t: "stage", d: tr("job.fixCheck", { n: problems.length }) });
    code = cleanCode((await ai.repairScene(sceneContext(p, sceneId, settings), code, bullets(problems), ctx)).code);
  }
  return code;
}

/** Below this, the layout shrank the content so much that text is too small to read (measured while rendering). */
const FIT_MIN = 0.85;

type Review = { shots: Shot[]; issues: { severity: string; frame: number; problem: string; fix: string }[]; summary: string };

async function look(p: Project, sceneId: string, code: string, settings: Settings, ctx: Ctx): Promise<Review> {
  ctx.emit({ t: "stage", d: tr("job.capturing") });
  const shots = await renderShots(p, settings, sceneId, ctx.signal);
  ctx.emit({ t: "stage", d: tr("job.reviewing") });
  const r = await ai.reviewScene(sceneContext(p, sceneId, settings), code, shots, ctx);
  const issues = r.issues.filter((x) => x.severity !== "low");
  // Measured, not judged: the layout had to shrink the content, so text ends up too small to read.
  const worst = shots.reduce((w, s, i) => (s.fit < shots[w].fit ? i : w), 0);
  if (shots.length && shots[worst].fit < FIT_MIN) {
    issues.unshift({
      severity: "high",
      frame: worst,
      problem: `Too much on screen: the layout shrinks the content to ${Math.round(shots[worst].fit * 100)}% to fit, so all text is too small to read.`,
      fix: "Show less at once: one main visual plus at most one small supporting element; remove extra notes, labels and wrappers; reduce widths (ArrayViz/Axes/Diagram width); put content that comes later in a Switch so it replaces instead of stacking.",
    });
  }
  return { shots, issues, summary: r.summary };
}

/** Fix what the review found, re-check statically, save. Returns null if no valid fix came out. */
async function applyReview(id: string, p: Project, sceneId: string, code: string, review: Review, settings: Settings, ctx: StreamCtx): Promise<Project | null> {
  ctx.emit({ t: "stage", d: tr("job.fixVisual", { n: review.issues.length }) });
  const list = review.issues.map((x) => `- [${x.severity}, at ${review.shots[x.frame]?.t.toFixed(1) ?? "?"} s] ${x.problem} → ${x.fix}`).join("\n");
  let fixed = (await ai.repairScene(sceneContext(p, sceneId, settings), code, `A visual review of screenshots found:\n${list}`, ctx)).code;
  fixed = await repairStatic(p, sceneId, fixed, settings, ctx, 1);
  if (checkCode(fixed, needScene(p, sceneId)).length) return null;
  return updateProject(id, (q) => {
    const b = putCode(q, needScene(q, sceneId), fixed, tr("note.reviewFix", { n: review.issues.length }));
    q.chats.studio.push(msg("event", tr("ev.reviewFixed", { s: label(q, sceneId), n: review.issues.length, v: b.version, sum: review.summary })));
  });
}

async function finishCode(
  id: string,
  sceneId: string,
  code: string,
  note: string,
  ctx: StreamCtx,
  opts: { review: boolean; onSaved: (p: Project, version: number) => void },
): Promise<Project> {
  const settings = await getSettings();
  let p = await requireProject(id);
  code = await repairStatic(p, sceneId, code, settings, ctx);
  p = await updateProject(id, (q) => {
    const b = putCode(q, needScene(q, sceneId), code, note);
    opts.onSaved(q, b.version);
  });
  ctx.project(p);

  if (!opts.review || !settings.visualReview || ai.isMock(ctx)) return p;
  try {
    const review = await look(p, sceneId, code, settings, ctx);
    if (!review.issues.length) {
      return updateProject(id, (q) => {
        q.chats.studio.push(msg("event", tr("ev.reviewOk", { s: label(q, sceneId), sum: review.summary })));
      });
    }
    return (await applyReview(id, p, sceneId, code, review, settings, ctx)) ?? p;
  } catch (e) {
    if (ctx.signal?.aborted) throw e;
    // A failed review must not lose the code that was already saved.
    return updateProject(id, (q) => {
      q.chats.studio.push(msg("event", tr("ev.reviewFailed", { s: label(q, sceneId), m: (e as Error).message.slice(0, 160) })));
    });
  }
}

/* Actions ------------------------------------------------------------------ */

export async function generateScene(id: string, sceneId: string, ctx: StreamCtx): Promise<Project> {
  const p0 = await requireProject(id);
  ctx.emit({ t: "stage", d: tr("job.writingCode") });
  const out = await ai.writeScene(sceneContext(p0, sceneId, await getSettings()), ctx);
  return finishCode(id, sceneId, out.code, tr("note.ai"), ctx, {
    review: true,
    onSaved: (q, v) => q.chats.studio.push(msg("assistant", out.reply, { scope: label(q, sceneId), change: { kind: "code", label: tr("change.code", { s: label(q, sceneId), v }) } })),
  });
}

const MAX_IMAGES = 4;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Images the teacher attached, as data URLs from the browser. Anything else is rejected. */
export function parseImages(raw: unknown): { data: Buffer; mediaType: string }[] {
  if (!Array.isArray(raw)) return [];
  if (raw.length > MAX_IMAGES) throw new HttpError(400, tr("err.tooManyImages", { n: MAX_IMAGES }));
  return raw.map((u) => {
    const m = typeof u === "string" ? u.match(/^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/=]+)$/) : null;
    if (!m) throw new HttpError(400, tr("err.badImage"));
    const data = Buffer.from(m[2], "base64");
    if (data.length > MAX_IMAGE_BYTES) throw new HttpError(400, tr("err.imageTooBig"));
    return { data, mediaType: m[1] };
  });
}

export async function studioChat(
  id: string,
  sceneId: string,
  text: string,
  atSeconds: number | null,
  quick: boolean,
  ctx: StreamCtx,
  opts: { withFrame?: boolean; images?: { data: Buffer; mediaType: string }[] } = {},
): Promise<Project> {
  const p0 = await requireProject(id);
  const build = p0.builds[sceneId];
  const settings = await getSettings();
  const scope = `${label(p0, sceneId)}${atSeconds !== null ? ` · ${atSeconds.toFixed(1)}s` : ""}`;
  const c = sceneContext(p0, sceneId, settings);
  const images = opts.images ?? [];

  // The paused frame, rendered from the current code. A failed capture must not block the edit.
  let frame: Shot | null = null;
  if (opts.withFrame && build && atSeconds !== null && !ai.isMock(ctx)) {
    ctx.emit({ t: "stage", d: tr("job.captureAt", { t: atSeconds.toFixed(1) }) });
    try {
      [frame] = await renderShots(p0, settings, sceneId, ctx.signal, { times: [atSeconds], captions: p0.captions });
    } catch (e) {
      if (ctx.signal?.aborted) throw e;
      ctx.emit({ t: "stage", d: tr("job.captureFailed") });
    }
  }
  const attached = [frame ? tr("att.frame", { t: frame.t.toFixed(1) }) : null, images.length ? tr("att.images", { n: images.length }) : null].filter(Boolean).join(" · ") || undefined;
  if (frame || images.length) ctx.emit({ t: "stage", d: tr("job.lookingImages") });

  let out;
  try {
    out = build ? await ai.editScene(c, build.code, text, atSeconds, quick, ctx, { frame, attached: images }) : await ai.writeScene(c, ctx, text);
  } catch (e) {
    if (ctx.signal?.aborted) throw e;
    return updateProject(id, (p) => {
      p.chats.studio.push(msg("user", text, { scope, attached }), msg("event", errorText(e)));
    });
  }
  const prevVersion = build?.version ?? 0;
  return finishCode(id, sceneId, out.code, text, ctx, {
    review: !quick,
    onSaved: (q, v) =>
      q.chats.studio.push(
        msg("user", text, { scope, attached }),
        msg("assistant", out.reply, {
          change: { kind: "code", label: tr("change.code", { s: label(q, sceneId), v }), ...(prevVersion ? { undo: { kind: "code" as const, sceneId, version: prevVersion } } : {}) },
        }),
      ),
  });
}

export async function fixSceneCode(id: string, sceneId: string, error: string, ctx: StreamCtx): Promise<Project> {
  const p0 = await requireProject(id);
  const build = p0.builds[sceneId];
  if (!build) throw new HttpError(400, tr("err.noCode"));
  ctx.emit({ t: "stage", d: tr("job.autoFix") });
  const out = await ai.repairScene(sceneContext(p0, sceneId, await getSettings()), build.code, `Runtime error in the browser preview:\n${error}`, ctx);
  return finishCode(id, sceneId, out.code, tr("note.autoFix", { m: error.slice(0, 120) }), ctx, {
    review: false,
    onSaved: (q, v) => q.chats.studio.push(msg("event", tr("ev.autoFixed", { s: label(q, sceneId), m: error.slice(0, 80), v }))),
  });
}

/** Manual "check the visuals" on the current version. */
export async function reviewScene(id: string, sceneId: string, ctx: StreamCtx): Promise<Project> {
  const p = await requireProject(id);
  const build = p.builds[sceneId];
  if (!build) throw new HttpError(400, tr("err.noCode"));
  if (ai.isMock(ctx)) throw new HttpError(400, tr("err.reviewNeedsKey"));
  const settings = await getSettings();
  const review = await look(p, sceneId, build.code, settings, ctx);
  if (!review.issues.length) {
    return updateProject(id, (q) => {
      q.chats.studio.push(msg("event", tr("ev.reviewOk", { s: label(q, sceneId), sum: review.summary })));
    });
  }
  const fixed = await applyReview(id, p, sceneId, build.code, review, settings, ctx);
  if (fixed) return fixed;
  return updateProject(id, (q) => {
    q.chats.studio.push(msg("event", tr("ev.reviewUnfixed", { s: label(q, sceneId), n: review.issues.length, sum: review.summary })));
  });
}
