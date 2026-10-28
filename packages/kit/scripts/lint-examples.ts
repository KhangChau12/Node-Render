/**
 * Runs the scene linter on every example with its own narration, as the app
 * does for AI-written scenes. Examples double as AI docs, so they must pass.
 * Run: npx tsx scripts/lint-examples.ts
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { registry } from "../src/registry";
import { lintScene } from "../src/runtime/lint";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
// Vietnamese examples (also used in the AI docs) and their English versions in examples/en.
const dirs = [path.join(root, "examples"), path.join(root, "examples", "en")];
const components = registry.map((e) => e.name);
let failed = 0;
for (const dir of dirs) for (const name of fs.readdirSync(dir).filter((f) => f.endsWith(".tsx"))) {
  const file = path.relative(path.join(root, "examples"), path.join(dir, name)).split(path.sep).join("/");
  const src = fs.readFileSync(path.join(dir, name), "utf8");
  const m = /export const narration =\s*([\s\S]*?);\n/.exec(src.replace(/\r\n/g, "\n"));
  const narration = m ? (eval(m[1]) as string) : "";
  const code = src.replace(/export const narration =[\s\S]*?;\r?\n/, "");
  const { errors, warnings } = lintScene(code, { narration, components });
  if (errors.length) failed++;
  for (const e of errors) console.log(`✗ ${file}: ${e}`);
  for (const w of warnings) console.log(`! ${file}: ${w}`);
}
console.log(failed ? `${failed} example(s) failed the linter` : "All examples pass the linter");
process.exit(failed ? 1 : 0);
