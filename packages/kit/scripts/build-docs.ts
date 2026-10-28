/**
 * Generates docs/kit-docs.md: the single file given to the AI when it writes scenes.
 * Sources: docs/rules.md (hand-written) + registry metadata + Zod schemas + example files.
 * Run: npm run kit:docs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { zodToJsonSchema } from "zod-to-json-schema";
import { registry } from "../src/registry";
import { colorNames } from "../src/theme";

const COLOR_UNION = colorNames.map((c) => JSON.stringify(c)).join(" | ");

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

type JsonSchema = {
  type?: string | string[];
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema | JsonSchema[];
  anyOf?: JsonSchema[];
  enum?: unknown[];
  const?: unknown;
  default?: unknown;
  description?: string;
  minItems?: number;
  maxItems?: number;
};

function typeOf(s: JsonSchema): string {
  if (s.enum && s.enum.map((v) => JSON.stringify(v)).join(" | ") === COLOR_UNION) return "Color";
  if (s.enum) return s.enum.map((v) => JSON.stringify(v)).join(" | ");
  if (s.const !== undefined) return JSON.stringify(s.const);
  if (s.anyOf) return s.anyOf.map(typeOf).join(" | ");
  // z.custom function props (fn={(x) => …}) have no JSON type.
  if (!s.type && !s.properties && !s.items) return "function";
  const t = Array.isArray(s.type) ? s.type.join(" | ") : s.type;
  if (t === "array") {
    if (Array.isArray(s.items)) return `[${s.items.map(typeOf).join(", ")}]`;
    return `${s.items ? typeOf(s.items) : "unknown"}[]`;
  }
  if (t === "object" && s.properties) {
    const req = new Set(s.required ?? []);
    const fields = Object.entries(s.properties).map(([k, v]) => `${k}${req.has(k) ? "" : "?"}: ${typeOf(v)}`);
    return `{ ${fields.join("; ")} }`;
  }
  return t ?? "unknown";
}

function propsTable(schema: JsonSchema): string {
  const props = schema.properties ?? {};
  const req = new Set(schema.required ?? []);
  const rows = Object.entries(props).map(([name, s]) => {
    const def = s.default !== undefined ? `\`${JSON.stringify(s.default)}\`` : req.has(name) ? "**required**" : "–";
    const desc = (s.description ?? "").replace(/\|/g, "\\|");
    return `| \`${name}\` | \`${typeOf(s).replace(/\|/g, "\\|")}\` | ${def} | ${desc} |`;
  });
  return ["| prop | type | default | description |", "|---|---|---|---|", ...rows].join("\n");
}

const parts: string[] = [];
parts.push(fs.readFileSync(path.join(root, "docs", "rules.md"), "utf8").trim());
parts.push("\n# Components\n");
parts.push(`\`Color\` = ${COLOR_UNION}. Props typed \`number | string\` named \`at\`/\`draw\`/\`*At\` take seconds or a cue (see Timing).\n`);

const categories = [
  ["layout", "Layouts (root of every scene)"],
  ["component", "Components"],
  ["plot", "Inside <Axes> (math objects placed by coordinates)"],
  ["primitive", "Primitives (for custom visuals)"],
] as const;

for (const [cat, heading] of categories) {
  parts.push(`## ${heading}\n`);
  for (const e of registry.filter((r) => r.category === cat)) {
    const json = zodToJsonSchema(e.schema, { target: "jsonSchema7", $refStrategy: "none" }) as JsonSchema;
    parts.push(`### ${e.name}\n`);
    parts.push(`${e.summary}\n`);
    parts.push(`- Use when: ${e.useWhen.join("; ")}`);
    parts.push(`- Avoid when: ${e.avoidWhen.join("; ")}`);
    if (e.children) parts.push(`- Children: ${e.children}`);
    parts.push("");
    parts.push(propsTable(json));
    parts.push("");
  }
}

parts.push("# Examples\n");
parts.push("Each example shows the narration it was written for, then the scene code.\n");
const exampleFiles = [...new Set(registry.map((e) => e.example).filter(Boolean) as string[])];
for (const file of exampleFiles) {
  const src = fs.readFileSync(path.join(root, "examples", file), "utf8");
  const m = /export const narration =\s*([\s\S]*?);\n/.exec(src);
  const narration = m ? (eval(m[1]) as string) : "";
  const code = src.replace(/export const narration =[\s\S]*?;\n\n?/, "").trim();
  parts.push(`## ${file}\n`);
  parts.push(`Narration: "${narration}"\n`);
  parts.push("```tsx\n" + code + "\n```\n");
}

const out = path.join(root, "docs", "kit-docs.md");
fs.writeFileSync(out, parts.join("\n"));

// Machine-readable copy for the web app's Kit library page (avoids importing
// React components into server code).
const meta = registry.map((e) => {
  const json = zodToJsonSchema(e.schema, { target: "jsonSchema7", $refStrategy: "none" }) as JsonSchema;
  const req = new Set(json.required ?? []);
  return {
    name: e.name,
    category: e.category,
    summary: e.summary,
    useWhen: e.useWhen,
    avoidWhen: e.avoidWhen,
    children: e.children ?? null,
    example: e.example ?? null,
    props: Object.entries(json.properties ?? {}).map(([name, s]) => ({
      name,
      type: typeOf(s),
      def: s.default !== undefined ? JSON.stringify(s.default) : req.has(name) ? "required" : "–",
      description: s.description ?? "",
    })),
  };
});
fs.writeFileSync(path.join(root, "docs", "kit-meta.json"), JSON.stringify(meta, null, 2));
console.log(`Wrote ${path.relative(process.cwd(), out)} (${(fs.statSync(out).size / 1024).toFixed(1)} KB, ${registry.length} entries, ${exampleFiles.length} examples)`);
