import * as ai from "./ai";
import type { Ctx } from "./ai";
import { tr } from "./i18n/server";
import { emptyProject, HttpError, requireProject, saveProject, updateProject } from "./storage";
import { AI_PROVIDERS, type AiProvider, type ChatMessage, type Lesson, type Project, type Scene, type SceneBuild, type Script, type Section, type Suggestion } from "./types";
import { now, sceneHash, sectionsHash, uid } from "./util";

const HISTORY_LIMIT = 30;

export function msg(role: ChatMessage["role"], text: string, extra: Partial<ChatMessage> = {}): ChatMessage {
  return { id: uid("m"), role, text, at: now(), ...extra };
}

function pushLessonHistory(p: Project) {
  if (!p.lesson) return;
  p.lessonHistory.push({ version: p.lessonVersion, lesson: structuredClone(p.lesson), at: now() });
  p.lessonHistory = p.lessonHistory.slice(-HISTORY_LIMIT);
  p.lessonVersion += 1;
}

function pushScriptHistory(p: Project) {
  if (!p.script) return;
  p.scriptHistory.push({ version: p.scriptVersion, script: structuredClone(p.script), at: now() });
  p.scriptHistory = p.scriptHistory.slice(-HISTORY_LIMIT);
  p.scriptVersion += 1;
}

export function needLesson(p: Project): Lesson {
  if (!p.lesson) throw new HttpError(400, tr("err.noLesson"));
  return p.lesson;
}

export function needScript(p: Project): Script {
  if (!p.script) throw new HttpError(400, tr("err.noScript"));
  return p.script;
}

export function needScene(p: Project, sceneId: string): Scene {
  const s = needScript(p).scenes.find((x) => x.id === sceneId);
  if (!s) throw new HttpError(404, tr("err.noScene"));
  return s;
}

export function errorText(err: unknown): string {
  const m = err instanceof Error ? err.message : String(err);
  return tr("err.aiCall", { m });
}

/* Project ---------------------------------------------------------------- */

/** Creates the project right away; the lesson is drafted afterwards, streamed into the editor. */
/** Scene titles are shown to the teacher; models sometimes number them ("Scene 2 — …"). */
export function cleanTitle(title: string): string {
  return title.replace(/^\s*(scene|cảnh|phần|part|section)\s*\d+\s*[—–:.\-]\s*/i, "").trim() || title.trim();
}

/** "3 phút (~650 từ)" → "3 phút", "3 min (~600 words)" → "3 min": word counts are internal planning numbers. */
export function cleanDuration(d: string): string {
  return d.replace(/\s*[(\[][^)\]]*(từ|âm tiết|words?|syllables?)[^)\]]*[)\]]/gi, "").trim() || d;
}

export async function createProject(prompt: string, aiChoice: AiProvider = "openai"): Promise<Project> {
  if (!prompt.trim()) throw new HttpError(400, tr("err.emptyPrompt"));
  if (!AI_PROVIDERS.includes(aiChoice)) throw new HttpError(400, tr("err.badModel", { m: String(aiChoice) }));
  const p = emptyProject(uid(), prompt.trim());
  p.ai = aiChoice;
  p.title = prompt.trim().slice(0, 80);
  p.chats.lesson.push(msg("user", prompt.trim()));
  return saveProject(p);
}

export async function draftLesson(id: string, ctx: Ctx): Promise<Project> {
  const p0 = await requireProject(id);
  if (p0.lesson) return p0;
  ctx.emit({ t: "stage", d: tr("job.draftLesson") });
  const draft = await ai.draftLesson(p0.prompt, ctx);
  return updateProject(id, (p) => {
    if (p.lesson) return;
    p.title = draft.title;
    p.lesson = {
      title: draft.title,
      brief: { ...draft.brief, duration: cleanDuration(draft.brief.duration) },
      sections: draft.sections.map((s) => ({ id: uid("sec"), title: s.title, body: s.body })),
    };
    p.lessonVersion = 1;
    p.chats.lesson.push(msg("assistant", draft.reply));
  });
}

/* Lesson ----------------------------------------------------------------- */

export async function lessonChat(id: string, text: string, sectionId: string | null, ctx: Ctx): Promise<Project> {
  const p0 = await requireProject(id);
  const lesson = needLesson(p0);
  if (p0.lessonLocked) throw new HttpError(409, tr("err.lessonLocked"));
  const scope = sectionId ? lesson.sections.find((s) => s.id === sectionId)?.title : undefined;
  let edit;
  try {
    edit = await ai.editLesson(lesson, text, sectionId, ctx);
  } catch (e) {
    if (ctx.signal?.aborted) throw e;
    return updateProject(id, (p) => {
      p.chats.lesson.push(msg("user", text, { scope }), msg("event", errorText(e)));
    });
  }
  return updateProject(id, (p) => {
    const L = needLesson(p);
    const created: Suggestion[] = [];
    for (const op of edit.ops) {
      const before = op.sectionId ? L.sections.find((s) => s.id === op.sectionId) ?? null : null;
      if (op.op !== "insert" && !before) continue;
      const after: Section | null =
        op.op === "delete" ? null : { id: before?.id ?? uid("sec"), title: op.title ?? before?.title ?? tr("def.newSection"), body: op.body ?? before?.body ?? "" };
      // Replace any older pending suggestion for the same section.
      if (before) p.suggestions = p.suggestions.filter((s) => s.sectionId !== before.id);
      created.push({
        id: uid("sg"),
        op: op.op,
        sectionId: before?.id ?? null,
        afterSectionId: op.op === "insert" ? op.afterSectionId : null,
        before: before ? structuredClone(before) : null,
        after,
        instruction: text,
        createdAt: now(),
      });
    }
    p.suggestions.push(...created);
    p.chats.lesson.push(
      msg("user", text, { scope }),
      msg("assistant", edit.reply, created.length ? { change: { kind: "lesson", label: tr("change.suggestions", { n: created.length }), suggestionIds: created.map((c) => c.id) } } : {}),
    );
  });
}

function applySuggestion(p: Project, s: Suggestion) {
  const L = needLesson(p);
  if (s.op === "update" && s.after) {
    const i = L.sections.findIndex((x) => x.id === s.sectionId);
    if (i >= 0) L.sections[i] = { ...s.after, id: L.sections[i].id };
  } else if (s.op === "delete") {
    L.sections = L.sections.filter((x) => x.id !== s.sectionId);
  } else if (s.op === "insert" && s.after) {
    const i = s.afterSectionId ? L.sections.findIndex((x) => x.id === s.afterSectionId) : -1;
    L.sections.splice(i + 1, 0, s.after);
  }
}

export function resolveSuggestions(id: string, ids: string[], accept: boolean) {
  return updateProject(id, (p) => {
    const chosen = p.suggestions.filter((s) => ids.includes(s.id));
    if (!chosen.length) return;
    if (accept) {
      pushLessonHistory(p);
      chosen.forEach((s) => applySuggestion(p, s));
    }
    p.suggestions = p.suggestions.filter((s) => !ids.includes(s.id));
    p.chats.lesson.push(msg("event", tr(accept ? "ev.accepted" : "ev.rejected", { n: chosen.length })));
  });
}

export function saveSection(id: string, section: Section) {
  return updateProject(id, (p) => {
    const L = needLesson(p);
    if (p.lessonLocked) throw new HttpError(409, tr("err.lessonLockedShort"));
    pushLessonHistory(p);
    const i = L.sections.findIndex((s) => s.id === section.id);
    if (i >= 0) L.sections[i] = section;
    p.chats.lesson.push(msg("event", tr("ev.handEditSection", { t: section.title })));
  });
}

export function addSection(id: string, afterSectionId: string | null) {
  return updateProject(id, (p) => {
    const L = needLesson(p);
    pushLessonHistory(p);
    const i = afterSectionId ? L.sections.findIndex((s) => s.id === afterSectionId) : L.sections.length - 1;
    L.sections.splice(i + 1, 0, { id: uid("sec"), title: tr("def.newSection"), body: "" });
  });
}

export function deleteSection(id: string, sectionId: string) {
  return updateProject(id, (p) => {
    const L = needLesson(p);
    pushLessonHistory(p);
    L.sections = L.sections.filter((s) => s.id !== sectionId);
    p.suggestions = p.suggestions.filter((s) => s.sectionId !== sectionId);
  });
}

export function updateLessonMeta(id: string, title: string) {
  return updateProject(id, (p) => {
    const L = needLesson(p);
    pushLessonHistory(p);
    L.title = title;
    p.title = title;
  });
}

export function restoreLesson(id: string, version: number) {
  return updateProject(id, (p) => {
    const h = p.lessonHistory.find((x) => x.version === version);
    if (!h) throw new HttpError(404, tr("err.noVersion"));
    pushLessonHistory(p);
    p.lesson = structuredClone(h.lesson);
    p.chats.lesson.push(msg("event", tr("ev.restoreLesson", { v: version })));
  });
}

export async function lockLesson(id: string): Promise<Project> {
  return updateProject(id, (p) => {
    needLesson(p);
    if (p.suggestions.length) throw new HttpError(409, tr("err.pendingSug"));
    p.lessonLocked = true;
    p.chats.lesson.push(msg("event", tr("ev.approveLesson", { v: p.lessonVersion })));
  });
}

/** Writes the script from the locked lesson (first time only), streamed into the script editor. */
export async function draftScript(id: string, ctx: Ctx): Promise<Project> {
  const p0 = await requireProject(id);
  const lesson = needLesson(p0);
  if (!p0.lessonLocked) throw new HttpError(409, tr("err.approveLessonFirst"));
  if (p0.script) return p0;
  ctx.emit({ t: "stage", d: tr("job.writeScript") });
  const draft = await ai.draftScript(lesson, ctx);
  return updateProject(id, (p) => {
    if (p.script) return;
    const L = needLesson(p);
    const validIds = new Set(L.sections.map((s) => s.id));
    p.script = {
      scenes: draft.scenes.map((s) => ({ id: uid("sc"), ...s, title: cleanTitle(s.title), sectionIds: s.sectionIds.filter((x) => validIds.has(x)) })),
    };
    p.scriptVersion = 1;
    p.sceneSectionHashes = Object.fromEntries(p.script.scenes.map((s) => [s.id, sectionsHash(L, s.sectionIds)]));
    p.chats.script.push(msg("event", tr("ev.scriptCreated", { n: p.script.scenes.length, v: p.lessonVersion })), msg("assistant", draft.reply));
  });
}

export function unlockLesson(id: string) {
  return updateProject(id, (p) => {
    p.lessonLocked = false;
    p.scriptLocked = false;
    p.chats.lesson.push(msg("event", tr("ev.reopenLesson")));
  });
}

/* Script ----------------------------------------------------------------- */

export async function scriptChat(id: string, text: string, sceneId: string | null, ctx: Ctx): Promise<Project> {
  const p0 = await requireProject(id);
  const lesson = needLesson(p0);
  const script = needScript(p0);
  if (p0.scriptLocked) throw new HttpError(409, tr("err.scriptLocked"));
  const scope = sceneId ? `Scene ${script.scenes.findIndex((s) => s.id === sceneId) + 1}` : undefined;
  let edit;
  try {
    edit = await ai.editScript(lesson, script, text, sceneId, ctx);
  } catch (e) {
    if (ctx.signal?.aborted) throw e;
    return updateProject(id, (p) => {
      p.chats.script.push(msg("user", text, { scope }), msg("event", errorText(e)));
    });
  }
  return updateProject(id, (p) => {
    const S = needScript(p);
    const L = needLesson(p);
    const undoVersion = p.scriptVersion;
    pushScriptHistory(p);
    let n = 0;
    for (const op of edit.ops) {
      const i = op.sceneId ? S.scenes.findIndex((s) => s.id === op.sceneId) : -1;
      if (op.op === "delete" && i >= 0) {
        S.scenes.splice(i, 1);
        n++;
      } else if (op.op === "update" && i >= 0) {
        const old = S.scenes[i];
        S.scenes[i] = {
          ...old,
          title: op.title ? cleanTitle(op.title) : old.title,
          sectionIds: op.sectionIds ?? old.sectionIds,
          narration: op.narration ?? old.narration,
          visual: op.visual ?? old.visual,
          onScreenText: op.onScreenText ?? old.onScreenText,
        };
        n++;
      } else if (op.op === "insert") {
        const at = op.afterSceneId ? S.scenes.findIndex((s) => s.id === op.afterSceneId) : -1;
        const scene: Scene = {
          id: uid("sc"),
          title: op.title ? cleanTitle(op.title) : tr("def.newScene"),
          sectionIds: op.sectionIds ?? [],
          narration: op.narration ?? "",
          visual: op.visual ?? "",
          onScreenText: op.onScreenText ?? "",
        };
        S.scenes.splice(at + 1, 0, scene);
        p.sceneSectionHashes[scene.id] = sectionsHash(L, scene.sectionIds);
        n++;
      }
    }
    p.chats.script.push(
      msg("user", text, { scope }),
      msg("assistant", edit.reply, n ? { change: { kind: "script", label: tr("change.scenes", { n }), undo: { kind: "script", version: undoVersion } } } : {}),
    );
  });
}

export function saveScene(id: string, scene: Scene) {
  return updateProject(id, (p) => {
    const S = needScript(p);
    pushScriptHistory(p);
    const i = S.scenes.findIndex((s) => s.id === scene.id);
    if (i >= 0) S.scenes[i] = scene;
    p.chats.script.push(msg("event", tr("ev.handEditScene", { n: i + 1 })));
  });
}

export function addScene(id: string, afterSceneId: string | null) {
  return updateProject(id, (p) => {
    const S = needScript(p);
    pushScriptHistory(p);
    const i = afterSceneId ? S.scenes.findIndex((s) => s.id === afterSceneId) : S.scenes.length - 1;
    const scene: Scene = { id: uid("sc"), title: tr("def.newScene"), sectionIds: [], narration: "", visual: "", onScreenText: "" };
    S.scenes.splice(i + 1, 0, scene);
    p.sceneSectionHashes[scene.id] = "";
  });
}

export function deleteScene(id: string, sceneId: string) {
  return updateProject(id, (p) => {
    const S = needScript(p);
    pushScriptHistory(p);
    S.scenes = S.scenes.filter((s) => s.id !== sceneId);
  });
}

export function moveScene(id: string, sceneId: string, dir: -1 | 1) {
  return updateProject(id, (p) => {
    const S = needScript(p);
    const i = S.scenes.findIndex((s) => s.id === sceneId);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= S.scenes.length) return;
    pushScriptHistory(p);
    [S.scenes[i], S.scenes[j]] = [S.scenes[j], S.scenes[i]];
  });
}

export function restoreScript(id: string, version: number) {
  return updateProject(id, (p) => {
    const h = p.scriptHistory.find((x) => x.version === version);
    if (!h) throw new HttpError(404, tr("err.noVersion"));
    pushScriptHistory(p);
    p.script = structuredClone(h.script);
    p.chats.script.push(msg("event", tr("ev.undoScript", { v: version })));
  });
}

/** Mark a scene's lesson link as up to date (after the teacher reviewed it). */
export function acknowledgeSceneSource(id: string, sceneId: string) {
  return updateProject(id, (p) => {
    const s = needScene(p, sceneId);
    p.sceneSectionHashes[sceneId] = sectionsHash(p.lesson, s.sectionIds);
  });
}

export function setScriptLocked(id: string, locked: boolean) {
  return updateProject(id, (p) => {
    needScript(p);
    if (locked && !p.lessonLocked) throw new HttpError(409, tr("err.approveLessonFirst"));
    p.scriptLocked = locked;
    p.chats.script.push(msg("event", locked ? tr("ev.approveScript", { v: p.scriptVersion }) : tr("ev.reopenScript")));
  });
}

/* Scene code ------------------------------------------------------------- */

export function putCode(p: Project, scene: Scene, code: string, note: string): SceneBuild {
  const prev = p.builds[scene.id];
  const version = (prev?.version ?? 0) + 1;
  const history = [...(prev?.history ?? []), { version, code, note, at: now() }].slice(-HISTORY_LIMIT);
  const b: SceneBuild = {
    sceneId: scene.id,
    version,
    code,
    sourceHash: sceneHash(scene),
    error: null,
    updatedAt: now(),
    history,
    durationOverride: prev?.durationOverride ?? null,
  };
  p.builds[scene.id] = b;
  return b;
}

export function reportSceneError(id: string, sceneId: string, error: string | null) {
  return updateProject(id, (p) => {
    const b = p.builds[sceneId];
    if (b) b.error = error;
  });
}

export function saveCode(id: string, sceneId: string, code: string) {
  return updateProject(id, (p) => {
    const s = needScene(p, sceneId);
    putCode(p, s, code, tr("note.handEdit"));
  });
}

export function restoreCode(id: string, sceneId: string, version: number) {
  return updateProject(id, (p) => {
    const s = needScene(p, sceneId);
    const h = p.builds[sceneId]?.history.find((x) => x.version === version);
    if (!h) throw new HttpError(404, tr("err.noCodeVersion"));
    putCode(p, s, h.code, tr("note.restore", { v: version }));
  });
}

export function setSceneDuration(id: string, sceneId: string, seconds: number | null) {
  return updateProject(id, (p) => {
    const b = p.builds[sceneId];
    if (!b) throw new HttpError(400, tr("err.noCode"));
    b.durationOverride = seconds && seconds > 0 ? Math.min(600, seconds) : null;
  });
}

export function setCaptions(id: string, captions: boolean) {
  return updateProject(id, (p) => {
    p.captions = captions;
  });
}
