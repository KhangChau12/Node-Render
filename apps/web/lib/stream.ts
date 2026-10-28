"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Project } from "./types";

/** What the UI shows while one AI job runs. */
export type Live = {
  label: string;
  stage: string | null;
  /** Reasoning summary streamed by the model (tail only). */
  thinking: string;
  /** The structured answer as it is being written. */
  partial: any;
  startedAt: number;
};

type Message =
  | { t: "thinking"; d: string }
  | { t: "partial"; d: unknown }
  | { t: "stage"; d: string }
  | { t: "project"; d: Project }
  | { t: "error"; d: string; status: number };

const THINKING_TAIL = 3000;

/**
 * Runs streamed AI actions (POST /api/projects/:id/stream). Jobs are keyed, so
 * several can run at once (one per scene in the Studio); starting a job with a
 * key that is already running replaces it.
 */
export function useAi(projectId: string, onProject: (p: Project) => void, onError: (message: string) => void) {
  const [live, setLive] = useState<Record<string, Live>>({});
  const ctrls = useRef(new Map<string, AbortController>());
  const handlers = useRef({ onProject, onError });
  handlers.current = { onProject, onError };

  // Jobs are deliberately not aborted on unmount: a scene that is being written
  // keeps going (and gets saved) when the teacher switches pages. Reloading the
  // tab or pressing Stop does abort, and the server stops the model call.

  const patch = (key: string, f: (l: Live) => Partial<Live>) =>
    setLive((all) => (all[key] ? { ...all, [key]: { ...all[key], ...f(all[key]) } } : all));

  const start = useCallback(
    async (key: string, body: Record<string, unknown>, label: string): Promise<Project | null> => {
      ctrls.current.get(key)?.abort();
      const ac = new AbortController();
      ctrls.current.set(key, ac);
      setLive((all) => ({ ...all, [key]: { label, stage: null, thinking: "", partial: null, startedAt: Date.now() } }));
      let final: Project | null = null;
      try {
        const res = await fetch(`/api/projects/${projectId}/stream`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: ac.signal,
        });
        if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let buf = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let nl: number;
          while ((nl = buf.indexOf("\n")) >= 0) {
            const line = buf.slice(0, nl).trim();
            buf = buf.slice(nl + 1);
            if (!line) continue;
            const m = JSON.parse(line) as Message;
            if (m.t === "thinking") patch(key, (l) => ({ thinking: (l.thinking + m.d).slice(-THINKING_TAIL) }));
            else if (m.t === "partial") patch(key, () => ({ partial: m.d }));
            else if (m.t === "stage") patch(key, () => ({ stage: m.d, partial: null, thinking: "" }));
            else if (m.t === "project") {
              final = m.d;
              handlers.current.onProject(m.d);
            } else if (m.t === "error" && m.status !== 499) handlers.current.onError(m.d);
          }
        }
      } catch (e) {
        if (!ac.signal.aborted) handlers.current.onError((e as Error).message);
      } finally {
        if (ctrls.current.get(key) === ac) {
          ctrls.current.delete(key);
          setLive((all) => {
            const { [key]: _, ...rest } = all;
            return rest;
          });
        }
      }
      return final;
    },
    [projectId],
  );

  const stop = useCallback((key: string) => ctrls.current.get(key)?.abort(), []);

  return { live, start, stop };
}

/** Seconds since a job started, updated every second while it runs. */
export function useElapsed(since: number | null | undefined): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!since) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [since]);
  return since ? Math.max(0, Math.floor((now - since) / 1000)) : 0;
}
