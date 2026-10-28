import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { Output, parsePartialJson, streamText, type LanguageModel, type UserContent } from "ai";
import type { z } from "zod";
import { env } from "../env";
import { requestLocale, tr } from "../i18n/server";
import type { AiProvider, Lesson, Scene, Script } from "../types";
import * as mock from "./mock";
import { soclaasBaseUrl, soclaasFetch, soclaasKey, soclaasRoute } from "./soclaas";
import {
  DEEPSEEK_GUIDE,
  EDIT_IMAGES_GUIDE,
  LESSON_EDIT_SYSTEM,
  LESSON_SYSTEM,
  lessonForPrompt,
  REVIEW_SYSTEM,
  sceneBrief,
  sceneSystem,
  scriptEditSystem,
  scriptForPrompt,
  scriptSystem,
} from "./prompts";
import {
  lessonDraftSchema,
  lessonEditSchema,
  reviewSchema,
  sceneCodeSchema,
  scriptDraftSchema,
  scriptEditSchema,
  type LessonDraft,
  type LessonEdit,
  type Review,
  type SceneCode,
  type ScriptDraft,
  type ScriptEdit,
} from "./schemas";

export type Task = "lesson" | "script" | "codegen" | "quick" | "review";
// "none" is accepted by the API for Terra but dropped by the AI SDK for 6.x models, so the lowest useful level is "low".
type Effort = "minimal" | "low" | "medium" | "high" | "xhigh" | "max";

// One model for everything (text + image input, structured outputs); tasks differ only in reasoning effort.
const TERRA = "gpt-6.1-terra";
const DEFAULT_MODELS: Record<Task, string> = { lesson: TERRA, script: TERRA, codegen: TERRA, quick: TERRA, review: TERRA };
const DEFAULT_EFFORT: Record<Task, Effort> = { lesson: "medium", script: "medium", codegen: "high", quick: "low", review: "low" };
const ENV_KEY: Record<Task, string> = { lesson: "LESSON", script: "SCRIPT", codegen: "CODEGEN", quick: "QUICK_EDIT", review: "REVIEW" };
const TASKS: Task[] = ["lesson", "script", "codegen", "quick", "review"];

// DeepSeek V4.1 Flash on SoCLaaS ("x-test-2": a trial slot the gateway may swap, hence configurable).
// It reads images and supports structured outputs, so it can do every task.
const DEEPSEEK_MODEL = "x-test-2";
// The gateway accepts only none / low / high / max for this model.
const DEEPSEEK_EFFORT: Record<Effort, string> = { minimal: "low", low: "low", medium: "high", high: "high", xhigh: "max", max: "max" };

export const PROVIDER_LABEL: Record<AiProvider, string> = { openai: "OpenAI", deepseek: "DeepSeek" };

function hasKey(ai: AiProvider): boolean {
  return Boolean(ai === "deepseek" ? soclaasKey() : env("OPENAI_API_KEY"));
}

/** The backend that actually runs: the project's choice, or "mock" when forced or when its key is missing. */
export function provider(ai: AiProvider = "openai"): AiProvider | "mock" {
  if ((env("LLM_PROVIDER") || "").toLowerCase() === "mock") return "mock";
  return hasKey(ai) ? ai : "mock";
}

export const isMock = (ctx: { ai?: AiProvider }) => provider(ctx.ai) === "mock";

export function modelFor(task: Task, ai: AiProvider = "openai"): string {
  if (ai === "deepseek") return env(`DEEPSEEK_MODEL_${ENV_KEY[task]}`) || env("DEEPSEEK_MODEL") || DEEPSEEK_MODEL;
  return env(`MODEL_${ENV_KEY[task]}`) || DEFAULT_MODELS[task];
}

export function effortFor(task: Task, ai: AiProvider = "openai"): string {
  const base = (env(`REASONING_${ENV_KEY[task]}`) as Effort) || DEFAULT_EFFORT[task];
  if (ai === "deepseek") return env(`DEEPSEEK_REASONING_${ENV_KEY[task]}`) || DEEPSEEK_EFFORT[base] || "high";
  return base;
}

/** Label shown next to the chat box: the model, or "mock". */
export function modelLabel(task: Task, ai: AiProvider = "openai"): string {
  const p = provider(ai);
  if (p === "mock") return "mock";
  const m = modelFor(task, ai);
  return p === "deepseek" && m === DEEPSEEK_MODEL ? "DeepSeek V4.1 Flash" : m;
}

export function aiConfig() {
  const key = (ai: AiProvider) => (ai === "deepseek" ? soclaasKey() : env("OPENAI_API_KEY"));
  const backends = (["openai", "deepseek"] as AiProvider[]).map((ai) => {
    const k = key(ai);
    return {
      id: ai,
      label: PROVIDER_LABEL[ai],
      available: provider(ai) === ai,
      keyHint: k ? `…${k.slice(-4)}` : null,
      endpoint: ai === "deepseek" ? soclaasBaseUrl() : "api.openai.com",
      route: ai === "deepseek" ? soclaasRoute() : null,
      tasks: TASKS.map((t) => ({ task: t, model: modelFor(t, ai), effort: effortFor(t, ai) })),
    };
  });
  // `provider` / `hasKey` / `tasks` describe OpenAI, as before, for existing callers.
  return { provider: provider("openai"), hasKey: Boolean(key("openai")), keyHint: backends[0].keyHint, tasks: backends[0].tasks, backends };
}

/* Streaming ---------------------------------------------------------------- */

/** Progress events streamed to the browser while a model works. */
export type AiEvent =
  | { t: "thinking"; d: string } // reasoning summary text (delta)
  | { t: "partial"; d: unknown } // the structured answer so far
  | { t: "stage"; d: string }; // what the pipeline is doing now
/** `ai` is the project's provider; every call made for that project goes through it. */
export type Ctx = { emit: (e: AiEvent) => void; signal?: AbortSignal; ai?: AiProvider };
export const silent: Ctx = { emit: () => {} };

let openai: ReturnType<typeof createOpenAI> | null = null;
let soclaas: ReturnType<typeof createOpenAICompatible> | null = null;
// Reasoning summaries need a verified OpenAI organization; switched off after the first refusal.
let summaries = env("REASONING_SUMMARY") !== "off";

/** Model + provider options for one call. */
function target(task: Task, ai: AiProvider, withSummary: boolean): { model: LanguageModel; providerOptions: NonNullable<Parameters<typeof streamText>[0]["providerOptions"]>; reasoning: boolean } {
  const model = modelFor(task, ai);
  if (ai === "deepseek") {
    soclaas ??= createOpenAICompatible({ name: "soclaas", baseURL: soclaasBaseUrl(), apiKey: soclaasKey(), fetch: soclaasFetch, supportsStructuredOutputs: true });
    // The gateway streams the model's raw reasoning as `reasoning_content`; it shows as "thinking".
    return { model: soclaas.chatModel(model), providerOptions: { soclaas: { reasoningEffort: effortFor(task, ai) } }, reasoning: false };
  }
  openai ??= createOpenAI({ apiKey: env("OPENAI_API_KEY") });
  const reasoning = /^(gpt-(?:[5-9]|\d{2,})|o\d)/.test(model);
  return {
    model: openai(model),
    reasoning,
    providerOptions: {
      openai: {
        strictJsonSchema: true,
        promptCacheKey: `node-render-${task}`,
        ...(reasoning ? { reasoningEffort: effortFor(task, ai), ...(withSummary ? { reasoningSummary: "auto" } : {}) } : {}),
      },
    },
  };
}

// "so" (so sánh) and "to" (to lớn) are left out: they are Vietnamese words too.
const EN_WORDS =
  /\b(the|is|are|for|of|and|with|we|let|me|need|needs|should|maybe|better|have|this|that|it|its|scene|use|write|okay|ok|but|or|be|will|can|then|now|good|fine|also|which|what|wants?|brief|add|keep|make|show|line|step|beat|frame|code|text|narration|visual|component|actually|wait|hmm|perhaps|instead|could|would)\b/gi;
// Code-ish lines: cue strings, prop names, camelCase / CamelCase identifiers, chains of quoted fragments.
const CODEISH = /[<>{};=]|\$\{|cue:|\b[a-z]+[A-Z]\w*|\b[A-Z][a-z]+[A-Z]\w*|\b(at|tex|title|label|note|steps)\s*:/;
const VI_MARKS =/[ăâđêôơưàáạảãầấậẩẫằắặẳẵèéẹẻẽềếệểễìíịỉĩòóọỏõồốộổỗờớợởỡùúụủũừứựửữỳýỵỷỹ]/gi;

/**
 * DeepSeek streams its raw chain of thought, in English, thousands of words per
 * step. The teacher only sees what is useful: the Vietnamese lines it drafts
 * while thinking (titles, narration, labels). Code and English are dropped.
 */
export function draftedLines(emit: (d: string) => void): (d: string) => void {
  let buf = "";
  let started = false;
  return (d) => {
    if (!started) {
      started = true;
      emit(`${tr("job.thinking")}\n`);
    }
    buf += d;
    const parts = buf.split(/(?<=[.!?…])\s+|\n+/);
    buf = parts.pop() ?? "";
    for (const raw of parts) {
      const line = raw.trim().replace(/^[-*•\d.)\s"“'`]+/, "").replace(/["”'`]+$/, "");
      const words = line.split(/\s+/).length;
      const marks = (line.match(VI_MARKS) ?? []).length;
      // English planning that merely quotes Vietnamese ("Better to have: «…»") is dropped too.
      const english = (line.match(EN_WORDS) ?? []).length;
      const quotes = (line.match(/"/g) ?? []).length;
      if (line.length >= 12 && words >= 3 && marks / words >= 0.4 && english === 0 && quotes < 4 && !CODEISH.test(line)) emit(`${line}\n`);
    }
  };
}

/** Pauses before retrying a call that failed for a transient reason (ms). */
const TRANSIENT_WAITS = [5000, 15000];

/** Appended to the system prompt for DeepSeek projects, per task. */
const GUIDE_FOR: Record<Task, keyof typeof DEEPSEEK_GUIDE> = { lesson: "lesson", script: "script", codegen: "codegen", quick: "codegen", review: "review" };

/**
 * One structured call. `check` validates the answer beyond the schema; when it
 * finds problems the model gets them back once and answers again.
 */
async function ask<S extends z.ZodTypeAny>(task: Task, schema: S, system: string, content: UserContent, ctx: Ctx, check?: (v: z.infer<S>) => string[]): Promise<z.infer<S>> {
  const ai = ctx.ai ?? "openai";
  if (ai === "deepseek") system += DEEPSEEK_GUIDE[GUIDE_FOR[task]];

  const run = async (withSummary: boolean, feedback?: string[]) => {
    const { model, providerOptions } = target(task, ai, withSummary);
    const think = ai === "deepseek" ? draftedLines((d) => ctx.emit({ t: "thinking", d })) : (d: string) => ctx.emit({ t: "thinking", d });
    const userContent: UserContent = !feedback
      ? content
      : [
          ...(typeof content === "string" ? [{ type: "text" as const, text: content }] : content),
          { type: "text" as const, text: `Your previous answer had these problems:\n${feedback.map((f) => `- ${f}`).join("\n")}\nReturn the complete answer again with every problem fixed.` },
        ];
    const result = streamText({
      model,
      system,
      messages: [{ role: "user", content: userContent }],
      experimental_output: Output.object({ schema }),
      abortSignal: ctx.signal,
      maxRetries: 1,
      providerOptions,
    });
    let text = "";
    let last = 0;
    for await (const part of result.fullStream) {
      if (part.type === "reasoning-delta") {
        if (part.text) think(part.text);
      } else if (part.type === "text-delta") {
        text += part.text;
        const now = Date.now();
        if (now - last > 100) {
          last = now;
          const { value } = await parsePartialJson(text);
          if (value && typeof value === "object") ctx.emit({ t: "partial", d: value });
        }
      } else if (part.type === "error") {
        throw part.error;
      }
    }
    if (!text.trim()) throw new Error(tr("err.modelEmpty"));
    // Some open models wrap the JSON in a ``` fence even in structured-output mode.
    const json = text.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
    const parsed = schema.safeParse(JSON.parse(json));
    if (!parsed.success) throw new Error(tr("err.modelFormat", { m: parsed.error.issues[0]?.message ?? "" }));
    return parsed.data as z.infer<S>;
  };

  const reasoning = ai === "openai" && target(task, ai, false).reasoning;
  // A stream that breaks halfway (busy gateway, dropped connection) is retried with a pause; other errors are not.
  const sturdy = async (withSummary: boolean, feedback?: string[]) => {
    for (let attempt = 0; ; attempt++) {
      try {
        return await run(withSummary, feedback);
      } catch (e) {
        const msg = e instanceof Error ? `${e.message} ${String((e as { cause?: unknown }).cause ?? "")}` : String(e);
        const transient = /Failed to process successful response|fetch failed|terminated|socket|ECONNRESET|ETIMEDOUT|Không kết nối được máy chủ|Could not connect to the SoCLaaS|\b(502|503|504)\b|overloaded|rate limit/i.test(msg);
        if (!transient || ctx.signal?.aborted || attempt >= TRANSIENT_WAITS.length) throw e;
        ctx.emit({ t: "stage", d: tr("job.busy", { s: TRANSIENT_WAITS[attempt] / 1000 }) });
        await new Promise((r) => setTimeout(r, TRANSIENT_WAITS[attempt]));
      }
    }
  };
  const checked = async (withSummary: boolean) => {
    const first = await sturdy(withSummary);
    const problems = check?.(first) ?? [];
    if (!problems.length) return first;
    ctx.emit({ t: "stage", d: tr("job.repairing") });
    const second = await sturdy(withSummary, problems);
    // Keep the retry only if it is not worse.
    return (check?.(second).length ?? 0) <= problems.length ? second : first;
  };
  try {
    return await checked(reasoning && summaries);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (reasoning && summaries && /summar|verif/i.test(msg)) {
      summaries = false;
      return checked(false);
    }
    throw e;
  }
}


/** Replays a finished mock answer as a stream so the offline mode shows the same UI. */
async function replay<T>(value: T, ctx: Ctx, thinking: string): Promise<T> {
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
  for (const w of thinking.split(" ")) {
    if (ctx.signal?.aborted) throw new Error(tr("common.stopped"));
    ctx.emit({ t: "thinking", d: `${w} ` });
    await wait(25);
  }
  const json = JSON.stringify(value);
  const step = Math.max(24, Math.ceil(json.length / 40));
  for (let i = step; i < json.length; i += step) {
    if (ctx.signal?.aborted) throw new Error(tr("common.stopped"));
    const { value: v } = await parsePartialJson(json.slice(0, i));
    if (v) ctx.emit({ t: "partial", d: v });
    await wait(35);
  }
  return value;
}

/* Public API: each call has a mock twin for running without an API key. ----- */

export async function draftLesson(request: string, ctx: Ctx): Promise<LessonDraft> {
  if (isMock(ctx)) return replay(await mock.draftLesson(request), ctx, tr("mock.draftLesson"));
  return ask("lesson", lessonDraftSchema, LESSON_SYSTEM, `Teacher's request:\n"""${request}"""`, ctx);
}

export async function editLesson(lesson: Lesson, instruction: string, sectionId: string | null, ctx: Ctx): Promise<LessonEdit> {
  if (isMock(ctx)) return replay(await mock.editLesson(lesson, instruction, sectionId), ctx, tr("mock.editLesson"));
  const scope = sectionId ? `The teacher selected section id=${sectionId}.` : "No section selected: the instruction may apply to the whole lesson.";
  return ask("lesson", lessonEditSchema, LESSON_EDIT_SYSTEM, `${lessonForPrompt(lesson)}\n\n---\n${scope}\nInstruction: """${instruction}"""`, ctx);
}

export async function draftScript(lesson: Lesson, ctx: Ctx): Promise<ScriptDraft> {
  if (isMock(ctx)) return replay(await mock.draftScript(lesson), ctx, tr("mock.draftScript"));
  return ask("script", scriptDraftSchema, scriptSystem(), `Lesson (locked):\n${lessonForPrompt(lesson)}`, ctx, (d) => scriptProblems(d.scenes));
}

export async function editScript(lesson: Lesson, script: Script, instruction: string, sceneId: string | null, ctx: Ctx): Promise<ScriptEdit> {
  if (isMock(ctx)) return replay(await mock.editScript(script, instruction, sceneId), ctx, tr("mock.editScript"));
  const scope = sceneId ? `The teacher selected scene id=${sceneId}.` : "No scene selected.";
  return ask(
    "script",
    scriptEditSchema,
    scriptEditSystem(),
    `Lesson:\n${lessonForPrompt(lesson)}\n\n---\nCurrent script:\n${scriptForPrompt(script)}\n\n---\n${scope}\nInstruction: """${instruction}"""`,
    ctx,
  );
}

/** Problems a script draft must not have, whatever model wrote it. */
function scriptProblems(scenes: { title: string; narration: string }[]): string[] {
  const out: string[] = [];
  scenes.forEach((s, i) => {
    if (s.narration.trim().split(/\s+/).filter(Boolean).length < 4) out.push(`Scene ${i + 1} ("${s.title}") has no real narration. Every scene, the title scene too, needs spoken narration.`);
  });
  return out;
}

export type SceneContext ={ lesson: Lesson; script: Script; scene: Scene; sps: number; prevCode: string | null };

const brief = (c: SceneContext) => sceneBrief(c.lesson, c.script, c.scene, c.sps, c.prevCode);

export async function writeScene(c: SceneContext, ctx: Ctx, extraWish?: string): Promise<SceneCode> {
  if (isMock(ctx)) return replay(await mock.writeScene(c.script, c.scene), ctx, tr("mock.writeScene"));
  return ask("codegen", sceneCodeSchema, sceneSystem(), `${brief(c)}\n\n${extraWish ? `Extra wish from the teacher: """${extraWish}"""\n\n` : ""}Write the scene file.`, ctx);
}

/** Images for a Studio edit: the paused frame rendered from the current code, and the teacher's own pictures. */
export type EditImages = {
  frame?: { png: Buffer; t: number } | null;
  attached?: { data: Buffer; mediaType: string }[];
};

export async function editScene(c: SceneContext, code: string, instruction: string, atSeconds: number | null, quick: boolean, ctx: Ctx, images: EditImages = {}): Promise<SceneCode> {
  if (isMock(ctx)) return replay(await mock.editScene(code, instruction), ctx, tr("mock.editScene"));
  const moment = atSeconds !== null ? `The teacher paused the preview at ${atSeconds.toFixed(1)} s into this scene.` : "The teacher did not pause on a particular moment.";
  const attached = images.attached ?? [];
  const hasImages = Boolean(images.frame) || attached.length > 0;
  const text = `${brief(c)}\n\nCurrent scene file:\n\`\`\`tsx\n${code}\n\`\`\`\n\n${moment}\nChange requested by the teacher: """${instruction}"""\nReturn the complete updated file. Change only what is needed.`;
  if (!hasImages) return ask(quick ? "quick" : "codegen", sceneCodeSchema, sceneSystem(), text, ctx);

  const content: UserContent = [{ type: "text", text: `${text}\n\n${EDIT_IMAGES_GUIDE}` }];
  if (images.frame) {
    content.push(
      { type: "text", text: `Current frame: rendered from the file above at t = ${images.frame.t.toFixed(1)} s into this scene (the moment the teacher paused), scaled to half size from 1920×1080, captions as the teacher sees them.` },
      { type: "image", image: images.frame.png, mediaType: "image/png" },
    );
  }
  attached.forEach((img, i) => {
    content.push(
      { type: "text", text: `Image ${i + 1} of ${attached.length}, attached by the teacher:` },
      { type: "image", image: img.data, mediaType: img.mediaType },
    );
  });
  return ask(quick ? "quick" : "codegen", sceneCodeSchema, sceneSystem(), content, ctx);
}

/** Repair a scene given a list of problems (compile/runtime errors, lint, visual review). */
export async function repairScene(c: SceneContext, code: string, problems: string, ctx: Ctx): Promise<SceneCode> {
  if (isMock(ctx)) return replay(await mock.fixScene(c.script, c.scene, problems), ctx, tr("mock.fixScene"));
  return ask(
    "codegen",
    sceneCodeSchema,
    sceneSystem(),
    `${brief(c)}\n\nCurrent scene file:\n\`\`\`tsx\n${code}\n\`\`\`\n\nProblems to fix:\n${problems}\n\nFix every problem. Keep the scene's intent and timing. Return the complete corrected file.`,
    ctx,
  );
}

export async function reviewScene(c: SceneContext, code: string, shots: { png: Buffer; t: number }[], ctx: Ctx): Promise<Review> {
  if (isMock(ctx)) return replay({ issues: [], summary: tr("mock.reviewSummary") }, ctx, tr("mock.review"));
  const content: UserContent = [
    { type: "text", text: `Narration with times:\n${brief(c).split('"""')[1] ?? c.scene.narration}\n\nVisual brief: ${c.scene.visual}\n\nScene code:\n\`\`\`tsx\n${code}\n\`\`\`\n\nWrite "summary" in ${requestLocale() === "vi" ? "Vietnamese" : "English"} (the teacher's interface language).\n\nScreenshots follow, in order:` },
    ...shots.flatMap((s, i) => [
      { type: "text" as const, text: `Screenshot ${i} at t = ${s.t.toFixed(1)} s` },
      { type: "image" as const, image: s.png, mediaType: "image/png" },
    ]),
  ];
  return ask("review", reviewSchema, REVIEW_SYSTEM, content, ctx);
}
