import { normalizeWord } from "../timing/estimate";

/*
 * Static checks for AI-written scene code, run before a version is saved.
 * Pure string analysis (no React), so the server can import it directly.
 * Each problem is phrased as an instruction the model can act on.
 */

export type LintResult = { errors: string[]; warnings: string[] };

/** Non-component names scene code may import from "@kit". */
const KIT_HELPERS = [
  "color", "colors", "colorNames", "fonts", "sizes", "space", "ease", "theme",
  "useSceneTime", "useAt", "useProgress", "useIsAfter", "useSceneTiming", "resolveAt",
  "useTrack", "evalTrack", "trackPhase", "fmtNumber",
  "RichText", "AbsoluteFill", "Easing", "interpolate", "spring", "useCurrentFrame", "useVideoConfig",
];

const LAYOUTS = ["TitleWithVisual", "TwoColumn", "FullVisual"];
const AXES_CHILDREN = [
  "Plot", "Parametric", "Point", "Vector", "Segment", "Polygon", "Circle", "Angle", "AreaUnder", "Riemann", "Tangent", "VectorField", "Label",
  "Group", "Secant", "Region", "BraceBetween", "Scatter", "Epicycles", "Path", "Spring",
];
const AXES3D_CHILDREN = ["Surface", "Curve3D", "Point3D", "Vector3D", "Segment3D", "Solid"];
const SVG_BOXES: [string, string[]][] = [["Axes", AXES_CHILDREN], ["Stage", AXES_CHILDREN], ["Axes3D", AXES3D_CHILDREN]];
const CANVAS_W = 1920 - 2 * 96;
const MIN_FONT = 24;

function cuePhrases(code: string): string[] {
  const out: string[] = [];
  for (const m of code.matchAll(/["'`]cue:([^"'`]+)["'`]/g)) {
    const phrase = m[1].replace(/[+-]\d+(?:\.\d+)?$/, "").replace(/@end$/, "").trim();
    if (phrase && !out.includes(phrase)) out.push(phrase);
  }
  return out;
}

function hasPhrase(words: string[], phrase: string): boolean {
  const target = phrase.split(/\s+/).map(normalizeWord).filter(Boolean);
  if (!target.length) return false;
  outer: for (let i = 0; i + target.length <= words.length; i++) {
    for (let j = 0; j < target.length; j++) if (words[i + j] !== target[j]) continue outer;
    return true;
  }
  return false;
}

export function lintScene(code: string, opts: { narration?: string; components?: string[] } = {}): LintResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const src = code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

  // Module contract
  const first = code.trim().split("\n")[0]?.trim() ?? "";
  if (first.startsWith("```") || /^(tsx|jsx|typescript)\s*$/.test(first)) errors.push("The code starts with a markdown fence (```tsx). Return plain TSX, without ``` fences.");
  for (const m of src.matchAll(/import\s+[\s\S]*?from\s+["']([^"']+)["']/g)) {
    if (!["@kit", "remotion", "react"].includes(m[1])) errors.push(`Import "${m[1]}" is not allowed. Import only from "@kit", "remotion", "react".`);
  }
  if (!/export\s+default\s+function/.test(src)) errors.push("Missing `export default function Scene()`.");

  // Names imported from @kit must exist.
  if (opts.components) {
    const known = new Set([...opts.components, ...KIT_HELPERS]);
    for (const m of src.matchAll(/import\s*\{([^}]*)\}\s*from\s*["']@kit["']/g)) {
      for (const raw of m[1].split(",")) {
        const name = raw.trim().split(/\s+as\s+/)[0].replace(/^type\s+/, "");
        if (name && !known.has(name)) errors.push(`"${name}" is not in the kit. Use the components listed in the docs.`);
      }
    }
  }

  // Every component used must be imported (or defined in the file), or the scene crashes when it runs.
  const defined = new Set<string>();
  for (const m of src.matchAll(/import\s*\{([^}]*)\}\s*from/g)) {
    for (const raw of m[1].split(",")) {
      const name = raw.trim().replace(/^type\s+/, "").split(/\s+as\s+/).pop();
      if (name) defined.add(name);
    }
  }
  for (const m of src.matchAll(/import\s+(?:\*\s+as\s+)?([A-Za-z_]\w*)/g)) defined.add(m[1]);
  for (const m of src.matchAll(/\b(?:function|const|let|class)\s+([A-Z]\w*)/g)) defined.add(m[1]);
  const used = [...new Set([...src.matchAll(/(?<![\w.])<([A-Z]\w*)[\s>/]/g)].map((m) => m[1]))];
  const notImported = used.filter((tag) => !defined.has(tag));
  if (notImported.length) {
    const inKit = opts.components ? notImported.filter((t) => opts.components!.includes(t)) : notImported;
    const unknown = notImported.filter((t) => !inKit.includes(t));
    if (inKit.length) errors.push(`<${inKit.join(">, <")}> used but not imported: add it to the import { … } from "@kit" line.`);
    if (unknown.length) errors.push(`<${unknown.join(">, <")}> is not in the kit and not defined in the file. Use only components from the kit docs.`);
  }

  // "$…$" typed directly as JSX text is shown raw; only kit text props and RichText render math.
  // String literals are blanked first: "$a > b$" inside a prop is fine.
  const noStrings = src.replace(/"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`|'(?:\\.|[^'\\\n])*'(?=\s*[,)}\]:;])/g, (s) => `"${" ".repeat(Math.max(0, s.length - 2))}"`);
  for (const m of noStrings.matchAll(/>([^<>{}]*\$[^<>{}$]+\$[^<>{}]*)</g)) {
    errors.push(`The text "${m[1].trim().slice(0, 50)}" sits directly in JSX, so $…$ will show raw. Use <RichText text="…" /> or <Formula tex="…" />.`);
    break;
  }

  // Layout: absolute positioning is how scenes ended up with overlapping elements.
  const abs = (src.match(/position\s*:\s*["'](absolute|fixed)["']/g) ?? []).length;
  if (abs) {
    errors.push(
      `${abs} place(s) use position absolute/fixed. Do not place things by coordinates: use a layout, <Stack>/<Row> and kit components (ArrayViz, Tree, Diagram, Graph, Table, Cards…), which lay themselves out without overlaps.`,
    );
  }
  const outs = (src.match(/\boutAt\s*=/g) ?? []).length;
  if (outs >= 2) {
    errors.push(
      `${outs} elements use outAt to replace each other. A faded element still takes its space, so the layout grows and gets shrunk. Use <Switch at={[…]}> to replace content in the same place; to move a code highlight use CodeBlock steps.`,
    );
  }
  // Axes / Stage / Axes3D children are drawn inside an <svg>: HTML elements there are invisible.
  for (const [box, allowed] of SVG_BOXES) {
    for (const m of src.matchAll(new RegExp(`<${box}[\\s>][\\s\\S]*?<\\/${box}>`, "g"))) {
      const inner = m[0].replace(new RegExp(`^<${box}[\\s\\S]*?>`), "");
      const bad = [...inner.matchAll(/<([A-Za-z][A-Za-z0-9]*)[\s>/]/g)].map((x) => x[1]).filter((tag) => !allowed.includes(tag) && tag !== box);
      if (bad.length) {
        const what = box === "Axes3D" ? "3D objects" : "coordinate objects";
        errors.push(`<${box}> may only contain ${what} (${allowed.join(", ")}); it has <${[...new Set(bad)].join(">, <")}>. Put formulas/text outside it (in a Stack/Row)${box === "Axes3D" ? "" : " or use <Label> inside"}.`);
      }
    }
  }
  const blocks = (src.match(/<CodeBlock[\s>]/g) ?? []).length;
  if (blocks > 1) errors.push(`There are ${blocks} CodeBlocks. Use one CodeBlock with \`steps\` to move the highlight with the narration.`);
  if (!LAYOUTS.some((l) => new RegExp(`<${l}[\\s>]`).test(src))) errors.push(`The root element must be a layout: ${LAYOUTS.join(", ")}.`);

  // Legibility
  for (const m of src.matchAll(/fontSize\s*[:=]\s*\{?\s*(\d+(?:\.\d+)?)/g)) {
    const v = Number(m[1]);
    if (v < MIN_FONT) errors.push(`fontSize ${v} is too small to read in a video. Minimum ${MIN_FONT}px; prefer sizes.small (30) or larger.`);
  }
  for (const m of src.matchAll(/\b(width|minWidth)\s*[:=]\s*\{?\s*(\d{4,})/g)) {
    const v = Number(m[2]);
    if (v > CANVAS_W) errors.push(`${m[1]} ${v}px exceeds the safe area (max ${CANVAS_W}px).`);
  }
  const hex = src.match(/["'`]#[0-9a-fA-F]{3,8}["'`]/g);
  if (hex) errors.push(`Do not use hex colors (${hex.slice(0, 3).join(", ")}). Use color("accent"), color("muted")…`);

  // Every string must have balanced $…$, or half the line is rendered as raw TeX.
  for (const m of src.matchAll(/(["'`])((?:\\.|(?!\1)[^\\\n])*)\1/g)) {
    const dollars = (m[2].replace(/\$\{/g, "").match(/\$/g) ?? []).length;
    if (dollars % 2 === 1) {
      errors.push(`The string "${m[2].slice(0, 50)}" has an odd number of $: a formula is not closed with $.`);
      break;
    }
  }

  // JSX attributes and String.raw are literal: "\\frac" there is a TeX line break, not \frac.
  for (const m of src.matchAll(/(?:=\s*"([^"\n]*)"|String\.raw`([^`]*)`)/g)) {
    const body = m[1] ?? m[2] ?? "";
    const bad = body.match(/\\\\[a-zA-Z]+/);
    if (bad) {
      errors.push(`In a JSX attribute (tex="…") or String.raw write only ONE \\: "${bad[0].slice(1)}" instead of "${bad[0]}".`);
      break;
    }
  }

  // TeX inside JS strings and plain template literals: "\log" silently becomes "log".
  for (const m of src.matchAll(/(^|[^=\w.])(["'`])((?:\\.|(?!\2)[^\\\n])*)\2/g)) {
    if (m[2] === "`" && /String\.raw\s*$/.test(src.slice(Math.max(0, (m.index ?? 0) - 12), (m.index ?? 0) + m[1].length))) continue;
    const body = m[3];
    if (!body.includes("$") && !/\\[a-zA-Z]{2,}/.test(body)) continue;
    const bad = body.match(/(?<!\\)\\(?![\\"'nrtbfvux0])[a-zA-Z]+/g) ?? body.match(/(?<!\\)\\[tfbvr][a-zA-Z]+/g);
    if (bad) {
      errors.push(`TeX commands in a JS string need a doubled \\: write "${bad[0].replace("\\", "\\\\")}" instead of "${bad[0]}" (or use String.raw\`…\`).`);
      break;
    }
  }

  // Determinism
  for (const [re, what] of [
    [/Math\.random\s*\(/, "Math.random()"],
    [/Date\.now\s*\(|new Date\s*\(/, "Date"],
    [/\bset(Timeout|Interval)\s*\(/, "setTimeout/setInterval"],
    [/\bfetch\s*\(/, "fetch"],
    [/\buse(State|Effect)\s*\(/, "useState/useEffect"],
  ] as const) {
    if (re.test(src)) errors.push(`Do not use ${what}: every frame must depend only on time (use useSceneTime, useProgress).`);
  }

  // Cues must come from the narration, or the element appears at 0 s.
  if (opts.narration) {
    const words = opts.narration.split(/\s+/).map(normalizeWord).filter(Boolean);
    const missing = cuePhrases(src).filter((ph) => !hasPhrase(words, ph));
    if (missing.length) {
      errors.push(`Cues not found in the narration: ${missing.map((m) => `"cue:${m}"`).join(", ")}. Copy 1–3 consecutive words exactly from the narration.`);
    }
  }

  // Motion density: a scene where nothing changes while the narrator keeps talking feels dead.
  if (opts.narration) {
    const sentences = (opts.narration.match(/[^.!?…]+[.!?…]*/g) ?? []).filter((x) => x.trim().split(/\s+/).length >= 3).length;
    const beats = new Set<string>();
    for (const m of src.matchAll(/["'`](cue:[^"'`]+|end-[\d.]+)["'`]/g)) beats.add(m[1].replace(/\s+/g, " ").toLowerCase());
    for (const m of src.matchAll(/\b(?:at|draw|moveAt|shrinkAt|highlightAt|toneAt)\s*[:=]\s*\{?\s*(\d+(?:\.\d+)?)/g)) beats.add(`t${m[1]}`);
    const need = Math.min(8, Math.ceil(sentences * 0.75));
    if (sentences >= 2 && beats.size < need && !/<TitleCard[\s>]/.test(src)) {
      errors.push(
        `The scene is too static: the narration has ${sentences} sentences but the picture changes at only ${beats.size} moments. Each sentence should change something: a new element, an ArrayViz/BarChart step, a Pulse, a Camera zoom, a Switch, a Counter, pulses/highlights on a diagram.`,
      );
    }
  }

  const lines = code.split("\n").length;
  if (lines > 160) warnings.push(`The scene is ${lines} lines long; keep it under 120.`);
  return { errors, warnings };
}
