import { notFound, redirect } from "next/navigation";
import { ExportView } from "@/components/ExportView";
import { getProject, getSettings } from "@/lib/storage";
import { buildVideoInput, sceneStatus } from "@/lib/video";

export const dynamic = "force-dynamic";

export default async function ExportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [p, settings] = await Promise.all([getProject(id), getSettings()]);
  if (!p) notFound();
  if (!p.scriptLocked) redirect(`/projects/${id}/script`);
  const input = buildVideoInput(p, settings);
  const duration = input.scenes.reduce((n, s) => n + s.timing.duration, 0);
  const blocking = (p.script?.scenes ?? []).filter((s) => ["missing", "error"].includes(sceneStatus(p, s))).length;
  return <ExportView project={p} durationSec={duration} blocking={blocking} />;
}
