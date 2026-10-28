import { notFound } from "next/navigation";
import { ScriptEditor } from "@/components/ScriptEditor";
import { modelLabel } from "@/lib/ai";
import { getProject, getSettings } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function ScriptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [p, settings] = await Promise.all([getProject(id), getSettings()]);
  if (!p) notFound();
  return <ScriptEditor initial={p} model={modelLabel("script", p.ai)} settings={settings} />;
}
