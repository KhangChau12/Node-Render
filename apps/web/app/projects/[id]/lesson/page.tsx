import { notFound } from "next/navigation";
import { LessonEditor } from "@/components/LessonEditor";
import { modelLabel } from "@/lib/ai";
import { getProject, getSettings } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [p, settings] = await Promise.all([getProject(id), getSettings()]);
  if (!p) notFound();
  return <LessonEditor initial={p} model={modelLabel("lesson", p.ai)} settings={settings} />;
}
