"use client";
import { useCallback, useState } from "react";
import type { Project } from "./types";

export async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || `HTTP ${res.status}`);
  return data as T;
}

/** Project state on the client; every mutation returns the fresh project. */
export function useProject(initial: Project) {
  const [project, setProject] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (action: string, args: Record<string, unknown> = {}, label = action): Promise<Project | null> => {
      setBusy(label);
      setError(null);
      try {
        const p = await postJson<Project>(`/api/projects/${initial.id}`, { action, ...args });
        setProject(p);
        return p;
      } catch (e) {
        setError((e as Error).message);
        return null;
      } finally {
        setBusy(null);
      }
    },
    [initial.id],
  );

  return { project, setProject, busy, error, setError, run };
}
