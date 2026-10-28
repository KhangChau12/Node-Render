import { notFound, redirect } from "next/navigation";
import { getProject } from "@/lib/storage";

export const dynamic = "force-dynamic";

/** Open a project at the stage it is in. */
export default async function ProjectIndex({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await getProject(id);
  if (!p) notFound();
  if (p.scriptLocked) redirect(`/projects/${id}/studio`);
  if (p.lessonLocked && p.script) redirect(`/projects/${id}/script`);
  redirect(`/projects/${id}/lesson`);
}
