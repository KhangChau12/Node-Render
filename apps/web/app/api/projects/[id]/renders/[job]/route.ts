import fs from "node:fs";
import path from "node:path";
import { rendersDir } from "@/lib/paths";
import { requireProject } from "@/lib/storage";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string; job: string }> };

/** Stream a rendered MP4, with Range support so <video> can seek. */
export async function GET(req: Request, { params }: Ctx) {
  const { id, job } = await params;
  const p = await requireProject(id).catch(() => null);
  const j = p?.renders.find((r) => r.id === job);
  if (!j) return new Response("Not found", { status: 404 });
  const file = path.join(rendersDir(id), j.file);
  if (!fs.existsSync(file)) return new Response("Not found", { status: 404 });
  const size = fs.statSync(file).size;
  const download = new URL(req.url).searchParams.has("download");
  const headers: Record<string, string> = {
    "Content-Type": "video/mp4",
    "Accept-Ranges": "bytes",
    ...(download ? { "Content-Disposition": `attachment; filename="${j.file}"` } : {}),
  };
  const range = req.headers.get("range");
  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    const start = m?.[1] ? parseInt(m[1], 10) : 0;
    const end = m?.[2] ? Math.min(parseInt(m[2], 10), size - 1) : size - 1;
    const stream = fs.createReadStream(file, { start, end });
    return new Response(stream as unknown as ReadableStream, {
      status: 206,
      headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": String(end - start + 1) },
    });
  }
  return new Response(fs.createReadStream(file) as unknown as ReadableStream, { headers: { ...headers, "Content-Length": String(size) } });
}
