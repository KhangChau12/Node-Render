import { z } from "zod";

/*
 * Structured outputs requested from the model.
 * Every field is required (nullable when optional) so they work with strict JSON schema mode.
 */

export const lessonDraftSchema = z.object({
  reply: z.string().describe("Short message to the teacher about the draft, in their language"),
  title: z.string(),
  brief: z.object({
    audience: z.string().describe("Who the learners are, e.g. 'Lớp 11, mới học'"),
    duration: z.string().describe("Target video length, e.g. '≈ 5 phút'"),
    voice: z.string().describe("Narration voice/tone wished for, or 'Chưa nêu'"),
    style: z.string().describe("Visual style, e.g. 'Nhiều đồ thị'"),
  }),
  sections: z
    .array(z.object({ title: z.string(), body: z.string() }))
    .min(2)
    .max(10),
});
export type LessonDraft = z.infer<typeof lessonDraftSchema>;

export const lessonEditSchema = z.object({
  reply: z.string(),
  ops: z.array(
    z.object({
      op: z.enum(["update", "insert", "delete"]),
      sectionId: z.string().nullable().describe("Target section id for update/delete; null for insert"),
      afterSectionId: z.string().nullable().describe("For insert: id of the section it goes after; null = at the start"),
      title: z.string().nullable(),
      body: z.string().nullable(),
    }),
  ),
});
export type LessonEdit = z.infer<typeof lessonEditSchema>;

const sceneFields = {
  title: z.string(),
  sectionIds: z.array(z.string()).describe("Ids of the lesson sections this scene covers"),
  narration: z.string().describe("Exactly what the narrator says, written for speech"),
  visual: z.string().describe("What is on screen and when, concretely"),
  onScreenText: z.string().describe("The few words shown on screen, may be empty"),
};

export const scriptDraftSchema = z.object({
  reply: z.string(),
  scenes: z.array(z.object(sceneFields)).min(1).max(30),
});
export type ScriptDraft = z.infer<typeof scriptDraftSchema>;

export const scriptEditSchema = z.object({
  reply: z.string(),
  ops: z.array(
    z.object({
      op: z.enum(["update", "insert", "delete"]),
      sceneId: z.string().nullable(),
      afterSceneId: z.string().nullable(),
      title: z.string().nullable(),
      sectionIds: z.array(z.string()).nullable(),
      narration: z.string().nullable(),
      visual: z.string().nullable(),
      onScreenText: z.string().nullable(),
    }),
  ),
});
export type ScriptEdit = z.infer<typeof scriptEditSchema>;

export const sceneCodeSchema = z.object({
  reply: z.string().describe("One or two sentences to the teacher about what you did, in their language"),
  code: z.string().describe("The complete scene file (TSX)"),
});
export type SceneCode = z.infer<typeof sceneCodeSchema>;

export const reviewSchema = z.object({
  issues: z
    .array(
      z.object({
        severity: z.enum(["high", "medium", "low"]).describe("high: unreadable, overlapping, cut off, wrong content; medium: cramped, unbalanced, hard to follow; low: cosmetic"),
        frame: z.number().int().describe("Index of the screenshot (0-based) where it is visible"),
        problem: z.string().describe("What is wrong, concretely (which element, where)"),
        fix: z.string().describe("How to change the code to fix it"),
      }),
    )
    .describe("Empty when the scene looks good"),
  summary: z.string().describe("One short sentence in Vietnamese for the teacher"),
});
export type Review = z.infer<typeof reviewSchema>;
