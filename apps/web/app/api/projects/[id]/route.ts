import * as A from "@/lib/actions";
import { handle } from "@/lib/http";
import { tr } from "@/lib/i18n/server";
import { deleteProject, HttpError, requireProject } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  return handle(() => requireProject(id));
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  return handle(async () => {
    await deleteProject(id);
    return { ok: true };
  });
}

/** All project mutations go through one endpoint: { action, ...args }. */
export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const b = (await req.json()) as Record<string, any>;
  return handle(async () => {
    switch (b.action) {
      case "acceptSuggestions": return A.resolveSuggestions(id, b.ids ?? [], true);
      case "rejectSuggestions": return A.resolveSuggestions(id, b.ids ?? [], false);
      case "saveSection": return A.saveSection(id, b.section);
      case "addSection": return A.addSection(id, b.afterSectionId ?? null);
      case "deleteSection": return A.deleteSection(id, b.sectionId);
      case "renameLesson": return A.updateLessonMeta(id, String(b.title ?? ""));
      case "restoreLesson": return A.restoreLesson(id, Number(b.version));
      case "lockLesson": return A.lockLesson(id);
      case "unlockLesson": return A.unlockLesson(id);
      case "saveScene": return A.saveScene(id, b.scene);
      case "addScene": return A.addScene(id, b.afterSceneId ?? null);
      case "deleteScene": return A.deleteScene(id, b.sceneId);
      case "moveScene": return A.moveScene(id, b.sceneId, b.dir === -1 ? -1 : 1);
      case "restoreScript": return A.restoreScript(id, Number(b.version));
      case "acknowledgeScene": return A.acknowledgeSceneSource(id, b.sceneId);
      case "lockScript": return A.setScriptLocked(id, true);
      case "unlockScript": return A.setScriptLocked(id, false);
      case "reportError": return A.reportSceneError(id, b.sceneId, b.error ?? null);
      case "saveCode": return A.saveCode(id, b.sceneId, String(b.code ?? ""));
      case "restoreCode": return A.restoreCode(id, b.sceneId, Number(b.version));
      case "setDuration": return A.setSceneDuration(id, b.sceneId, b.seconds ?? null);
      case "setCaptions": return A.setCaptions(id, Boolean(b.captions));
      default: throw new HttpError(400, tr("err.badAction", { a: String(b.action) }));
    }
  });
}
