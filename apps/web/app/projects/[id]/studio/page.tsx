import { notFound, redirect } from "next/navigation";
import { StudioLoader } from "@/components/StudioLoader";
import { modelLabel } from "@/lib/ai";
import { getProject, getSettings } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function StudioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [p, settings] = await Promise.all([getProject(id), getSettings()]);
  if (!p) notFound();
  if (!p.scriptLocked) redirect(`/projects/${id}/script`);
  return <StudioLoader initial={p} model={modelLabel("codegen", p.ai)} settings={settings} />;
}
