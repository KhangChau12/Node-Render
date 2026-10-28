import { createProject } from "@/lib/actions";
import { handle } from "@/lib/http";
import { listProjects } from "@/lib/storage";
import type { AiProvider } from "@/lib/types";

export const dynamic = "force-dynamic";

export function GET() {
  return handle(() => listProjects());
}

export async function POST(req: Request) {
  const { prompt, ai } = (await req.json()) as { prompt: string; ai?: AiProvider };
  return handle(() => createProject(prompt ?? "", ai ?? "openai"));
}
