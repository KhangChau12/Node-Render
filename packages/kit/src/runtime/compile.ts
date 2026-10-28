import React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import * as Remotion from "remotion";
import { transform } from "sucrase";
import * as Kit from "../index";

/**
 * Compile AI-written scene source (TSX) into a React component, in the browser
 * and inside Remotion's renderer alike.
 *
 * Contract for scene code:
 *   import { ... } from "@kit";        // kit components, hooks, theme
 *   import { ... } from "remotion";    // optional, low-level
 *   export default function Scene() { ... }
 */

const ALLOWED = ["react", "react/jsx-runtime", "remotion", "@kit"] as const;
const cache = new Map<string, React.ComponentType>();

function moduleFor(name: string): unknown {
  switch (name) {
    case "react":
      return React;
    case "react/jsx-runtime":
      return jsxRuntime;
    case "remotion":
      return Remotion;
    case "@kit":
    case "@lecture/kit":
      return Kit;
    default:
      throw new Error(`Import of "${name}" is not allowed. Use only: ${ALLOWED.join(", ")}.`);
  }
}

export function transpileScene(code: string): string {
  return transform(code, {
    transforms: ["typescript", "jsx", "imports"],
    jsxRuntime: "automatic",
    production: true,
    filePath: "scene.tsx",
  }).code;
}

export function compileScene(code: string): React.ComponentType {
  const hit = cache.get(code);
  if (hit) return hit;
  let js: string;
  try {
    js = transpileScene(code);
  } catch (err) {
    throw new Error(`Syntax error: ${(err as Error).message}`);
  }
  const module = { exports: {} as Record<string, unknown> };
  // eslint-disable-next-line no-new-func
  const run = new Function("require", "module", "exports", "React", js);
  run(moduleFor, module, module.exports, React);
  const exp = module.exports;
  const Comp = (exp.default ?? exp.Scene) as React.ComponentType | undefined;
  if (typeof Comp !== "function") throw new Error("The scene must have `export default function Scene() { … }`.");
  cache.set(code, Comp);
  return Comp;
}
