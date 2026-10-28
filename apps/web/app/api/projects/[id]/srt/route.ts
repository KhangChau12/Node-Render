import { captionChunks } from "@lecture/kit/timing";
import { getSettings, requireProject } from "@/lib/storage";
import { slugify } from "@/lib/util";
import { buildVideoInput, toSrt } from "@/lib/video";

export const dynamic = "force-dynamic";

/** Narration as an .srt file, timed with the same estimate the video uses. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await requireProject(id).catch(() => null);
  if (!p) return new Response("Not found", { status: 404 });
  const srt = toSrt(buildVideoInput(p, await getSettings()), captionChunks);
  return new Response(srt, {
    headers: { "Content-Type": "application/x-subrip; charset=utf-8", "Content-Disposition": `attachment; filename="${slugify(p.title)}.srt"` },
  });
}
