export type SceneError = {
  sceneId: string;
  kind: "compile" | "runtime";
  message: string;
};

type Listener = (e: SceneError) => void;
const listeners = new Set<Listener>();

/** Editor subscribes here to auto-fix scenes whose code fails. */
export function onSceneError(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function reportSceneError(e: SceneError) {
  for (const fn of listeners) fn(e);
}

export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
