import { spawn } from "node:child_process";
import fs from "node:fs";
import { handle } from "@/lib/http";
import { tr } from "@/lib/i18n/server";
import { rendersDir } from "@/lib/paths";
import { HttpError } from "@/lib/storage";

/** Open a project's render folder in the OS file manager (local app only). */
export async function POST(req: Request) {
  const { id } = (await req.json()) as { id: string };
  return handle(async () => {
    const dir = rendersDir(id);
    if (!fs.existsSync(dir)) throw new HttpError(404, tr("err.noRenderDir"));
    const cmd = process.platform === "win32" ? "explorer" : process.platform === "darwin" ? "open" : "xdg-open";
    spawn(cmd, [dir], { detached: true, stdio: "ignore" }).unref();
    return { ok: true };
  });
}
