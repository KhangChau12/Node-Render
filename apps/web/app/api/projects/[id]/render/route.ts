import { handle } from "@/lib/http";
import { cancelRender, deleteRender, listRenders, startRender } from "@/lib/render";
import type { RenderSettings } from "@/lib/types";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  return handle(() => listRenders(id));
}

export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const b = (await req.json()) as { action?: string; jobId?: string; settings?: Partial<RenderSettings> };
  return handle(async () => {
    if (b.action === "cancel" && b.jobId) return cancelRender(id, b.jobId);
    if (b.action === "delete" && b.jobId) return deleteRender(id, b.jobId);
    const s = b.settings ?? {};
    const settings: RenderSettings = {
      height: ([720, 1080, 1440, 2160] as const).includes(s.height as never) ? (s.height as RenderSettings["height"]) : 1080,
      fps: s.fps === 60 ? 60 : 30,
      captions: s.captions !== false,
      crf: Math.min(35, Math.max(10, Number(s.crf) || 18)),
    };
    await startRender(id, settings);
    return listRenders(id);
  });
}
