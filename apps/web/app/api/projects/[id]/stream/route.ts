import * as A from "@/lib/actions";
import type { AiEvent } from "@/lib/ai";
import { tr, withLocale } from "@/lib/i18n/server";
import * as P from "@/lib/pipeline";
import { getProject, HttpError } from "@/lib/storage";
import type { Project } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 800;

type Ctx = { params: Promise<{ id: string }> };

/** Server → browser events, one JSON object per line (NDJSON). */
export type StreamMessage = AiEvent | { t: "project"; d: Project } | { t: "error"; d: string; status: number };

/**
 * Every AI action, streamed: reasoning summary, partial answer, pipeline stage,
 * intermediate project saves, then the final project. Aborting the request
 * (Stop button, closed tab) aborts the model call.
 */
export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const b = (await req.json()) as Record<string, any>;
  const enc = new TextEncoder();
  const signal = req.signal;

  const stream = new ReadableStream<Uint8Array>({
    // Messages streamed from deep inside the actions use the UI language of this request.
    start: (controller) => withLocale(async () => {
      let open = true;
      const send = (m: StreamMessage) => {
        if (!open) return;
        try {
          controller.enqueue(enc.encode(JSON.stringify(m) + "\n"));
        } catch {
          open = false;
        }
      };
      // Every model call of this request uses the provider chosen for the project.
      const ai = (await getProject(id).catch(() => null))?.ai ?? "openai";
      const ctx: P.StreamCtx = { emit: send, signal, ai, project: (p) => send({ t: "project", d: p }) };
      try {
        let p: Project;
        switch (b.action) {
          case "draftLesson": p = await A.draftLesson(id, ctx); break;
          case "lessonChat": p = await A.lessonChat(id, String(b.text ?? ""), b.sectionId ?? null, ctx); break;
          case "draftScript": p = await A.draftScript(id, ctx); break;
          case "scriptChat": p = await A.scriptChat(id, String(b.text ?? ""), b.sceneId ?? null, ctx); break;
          case "generateScene": p = await P.generateScene(id, String(b.sceneId), ctx); break;
          case "studioChat":
            p = await P.studioChat(id, String(b.sceneId), String(b.text ?? ""), b.atSeconds ?? null, Boolean(b.quick), ctx, {
              withFrame: Boolean(b.withFrame),
              images: P.parseImages(b.images),
            });
            break;
          case "fixScene": p = await P.fixSceneCode(id, String(b.sceneId), String(b.error ?? ""), ctx); break;
          case "reviewScene": p = await P.reviewScene(id, String(b.sceneId), ctx); break;
          default: throw new HttpError(400, tr("err.badAction", { a: String(b.action) }));
        }
        send({ t: "project", d: p });
      } catch (err) {
        if (signal.aborted) send({ t: "error", d: tr("common.stopped"), status: 499 });
        else {
          if (!(err instanceof HttpError)) console.error(err);
          const status = err instanceof HttpError ? err.status : 502;
          const m = err instanceof Error ? err.message : String(err);
          send({ t: "error", d: err instanceof HttpError ? m : A.errorText(err), status });
        }
      } finally {
        open = false;
        try {
          controller.close();
        } catch {}
      }
    }),
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no" },
  });
}
