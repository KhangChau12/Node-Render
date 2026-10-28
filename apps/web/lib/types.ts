import { z } from "zod";
import type { Locale } from "./i18n";

/* Lesson ----------------------------------------------------------------- */

export const sectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  /** Paragraphs separated by blank lines; "- " bullets; $…$ / $$…$$ math. */
  body: z.string(),
});
export type Section = z.infer<typeof sectionSchema>;

export const briefSchema = z.object({
  audience: z.string(),
  duration: z.string(),
  voice: z.string(),
  style: z.string(),
});
export type Brief = z.infer<typeof briefSchema>;

export type Lesson = { title: string; brief: Brief; sections: Section[] };

/* Script ----------------------------------------------------------------- */

export type Scene = {
  id: string;
  title: string;
  sectionIds: string[];
  /** What the narrator says. Drives timing and captions. */
  narration: string;
  /** What appears on screen, in words (the brief for code generation). */
  visual: string;
  onScreenText: string;
};

export type Script = { scenes: Scene[] };

/* Scene code ------------------------------------------------------------- */

export type CodeVersion = { version: number; code: string; note: string; at: string };

export type SceneBuild = {
  sceneId: string;
  version: number;
  code: string;
  /** Hash of the scene content the code was generated from (for staleness). */
  sourceHash: string;
  error: string | null;
  updatedAt: string;
  history: CodeVersion[];
  durationOverride: number | null;
};

/* Chat ------------------------------------------------------------------- */

export type ChatChange = {
  kind: "lesson" | "script" | "code";
  label: string;
  delta?: string;
  /** For script/code changes: version to restore when undoing. */
  undo?: { kind: "script"; version: number } | { kind: "code"; sceneId: string; version: number };
  suggestionIds?: string[];
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "event";
  text: string;
  at: string;
  scope?: string;
  /** What was sent along with a Studio request, e.g. "Khung hình 12.4s · 2 ảnh". Images are not stored. */
  attached?: string;
  change?: ChatChange;
};

export type Suggestion = {
  id: string;
  op: "update" | "insert" | "delete";
  sectionId: string | null;
  afterSectionId: string | null;
  before: Section | null;
  after: Section | null;
  instruction: string;
  createdAt: string;
};

/* Render ----------------------------------------------------------------- */

export type RenderSettings = { height: 720 | 1080 | 1440 | 2160; fps: 30 | 60; captions: boolean; crf: number };

export type RenderJob = {
  id: string;
  createdAt: string;
  status: "queued" | "bundling" | "rendering" | "done" | "error" | "cancelled";
  progress: number;
  renderedFrames: number;
  totalFrames: number;
  file: string;
  settings: RenderSettings;
  error: string | null;
  sizeBytes: number | null;
  pid?: number;
};

/* Project ---------------------------------------------------------------- */

export type Stage = "lesson" | "script" | "studio" | "export";

/** Which AI writes this project: OpenAI, or DeepSeek served by the NUS SoCLaaS gateway. */
export type AiProvider = "openai" | "deepseek";
export const AI_PROVIDERS: AiProvider[] = ["openai", "deepseek"];

export type Project = {
  id: string;
  title: string;
  prompt: string;
  createdAt: string;
  updatedAt: string;
  lesson: Lesson | null;
  lessonVersion: number;
  lessonLocked: boolean;
  lessonHistory: { version: number; lesson: Lesson; at: string }[];
  script: Script | null;
  scriptVersion: number;
  scriptLocked: boolean;
  scriptHistory: { version: number; script: Script; at: string }[];
  /** Per scene: hash of its linked lesson sections when the scene was written. */
  sceneSectionHashes: Record<string, string>;
  builds: Record<string, SceneBuild>;
  chats: { lesson: ChatMessage[]; script: ChatMessage[]; studio: ChatMessage[] };
  suggestions: Suggestion[];
  renders: RenderJob[];
  captions: boolean;
  /** Chosen when the project is created; projects from before the choice existed use OpenAI. */
  ai?: AiProvider;
};

export type Settings = {
  syllablesPerSecond: number;
  /** After writing a scene, screenshot it and let a vision model check the layout. */
  visualReview: boolean;
  /** Language of the app's interface (not of the lectures). */
  locale: Locale;
};

export const DEFAULT_SETTINGS: Settings = { syllablesPerSecond: 4, visualReview: true, locale: "en" };
