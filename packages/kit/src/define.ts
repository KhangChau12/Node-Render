import type React from "react";
import { z } from "zod";

export type KitCategory = "layout" | "component" | "plot" | "primitive";

export type KitMeta = {
  name: string;
  category: KitCategory;
  /** One sentence: what it draws. */
  summary: string;
  useWhen: string[];
  avoidWhen: string[];
  /** File name in packages/kit/examples used in docs and the gallery. */
  example?: string;
  /** Whether it accepts children. */
  children?: string;
};

export type KitEntry = KitMeta & {
  schema: z.ZodTypeAny;
};

export class KitPropsError extends Error {
  constructor(component: string, issues: z.ZodIssue[]) {
    const detail = issues
      .slice(0, 5)
      .map((i) => `${i.path.join(".") || "(props)"}: ${i.message}`)
      .join("; ");
    super(`<${component}> received invalid props: ${detail}`);
    this.name = "KitPropsError";
  }
}

/**
 * Validate props against the component's schema, applying defaults.
 * Children and unknown React props pass through untouched.
 */
export function parseProps<S extends z.ZodTypeAny>(name: string, schema: S, props: object): z.output<S> & { children?: React.ReactNode } {
  const { children, ...rest } = props as { children?: React.ReactNode };
  const res = schema.safeParse(rest);
  if (!res.success) throw new KitPropsError(name, res.error.issues);
  return { ...(res.data as object), children } as z.output<S> & { children?: React.ReactNode };
}
