import type { Lesson, Scene, Script } from "../types";
import { lectureLanguage } from "../util";
import type { LessonDraft, LessonEdit, SceneCode, ScriptDraft, ScriptEdit } from "./schemas";

/*
 * Deterministic stand-in for the LLM (LLM_PROVIDER=mock, or no API key).
 * Lets contributors run and test the whole flow offline. Like the real model,
 * it writes in the language of the teacher's request.
 */

const delay = (ms = 500) => new Promise((r) => setTimeout(r, ms));

type Lang = "vi" | "en";

const TEXT = {
  vi: {
    newTopic: "chủ đề mới",
    draftReply: (topic: string) => `(Chế độ mock) Mình soạn sẵn 4 phần về ${topic}. Đặt OPENAI_API_KEY trong .env.local để AI soạn thật.`,
    brief: (minutes: string) => ({ audience: "Người mới học", duration: `≈ ${minutes} phút`, voice: "Chưa nêu", style: "Trực quan, nhiều hình" }),
    sections: (topic: string) => [
      { title: "Mở đầu", body: `Bài học hôm nay nói về ${topic}. Ta bắt đầu bằng một câu hỏi gần gũi.\n\nVì sao chủ đề này quan trọng?` },
      { title: "Khái niệm chính", body: `Ý chính của ${topic} gồm ba điểm:\n- Điểm thứ nhất\n- Điểm thứ hai\n- Điểm thứ ba` },
      { title: "Ví dụ minh hoạ", body: "Xét hàm số $f(x) = x^2$. Tại $x = 1$ độ dốc của tiếp tuyến bằng 2.\n\n$$f'(x) = 2x$$" },
      { title: "Tóm tắt", body: "Ta đã đi từ trực giác đến định nghĩa, rồi tới một ví dụ cụ thể." },
    ],
    editReply: (t: string) => `(Mock) Đã đề xuất sửa phần "${t}".`,
    addition: (i: string) => `Đoạn bổ sung theo yêu cầu: ${i}`,
    mathWords: "hàm số này",
    scriptReply: (n: number) => `(Mock) Tạo ${n} scene, mỗi phần một scene.`,
    titleVisual: "Tiêu đề lớn của bài, nhãn nhỏ phía trên.",
    sceneVisual: "Tiêu đề scene và các ý chính hiện lần lượt theo lời đọc.",
    sceneEditReply: (t: string) => `(Mock) Đã sửa scene "${t}".`,
    kicker: "Bài giảng",
    part: (n: number) => `Phần ${n}`,
    writeReply: "(Mock) Scene dựng từ mẫu có sẵn.",
    editCodeReply: "(Mock) Đã ghi chú yêu cầu vào đầu file; cần API key để sửa thật.",
    fixReply: "(Mock) Thay bằng scene mẫu chạy được.",
  },
  en: {
    newTopic: "a new topic",
    draftReply: (topic: string) => `(Mock mode) Here are 4 ready-made sections about ${topic}. Set OPENAI_API_KEY in .env.local for real AI drafts.`,
    brief: (minutes: string) => ({ audience: "Beginners", duration: `≈ ${minutes} min`, voice: "Not stated", style: "Visual, many pictures" }),
    sections: (topic: string) => [
      { title: "Introduction", body: `Today's lesson is about ${topic}. We start with a familiar question.\n\nWhy does this topic matter?` },
      { title: "The main idea", body: `The main idea of ${topic} has three points:\n- The first point\n- The second point\n- The third point` },
      { title: "A worked example", body: "Take the function $f(x) = x^2$. At $x = 1$ the slope of the tangent line is 2.\n\n$$f'(x) = 2x$$" },
      { title: "Summary", body: "We went from intuition to a definition, then to a concrete example." },
    ],
    editReply: (t: string) => `(Mock) Suggested an edit to "${t}".`,
    addition: (i: string) => `Added on request: ${i}`,
    mathWords: "this function",
    scriptReply: (n: number) => `(Mock) Created ${n} scenes, one per section.`,
    titleVisual: "The lesson title in large type, a small label above it.",
    sceneVisual: "The scene title and its key points appear one by one with the narration.",
    sceneEditReply: (t: string) => `(Mock) Edited scene "${t}".`,
    kicker: "Lecture",
    part: (n: number) => `Part ${n}`,
    writeReply: "(Mock) Scene built from a template.",
    editCodeReply: "(Mock) Noted the request at the top of the file; an API key is needed for a real edit.",
    fixReply: "(Mock) Replaced with a template scene that runs.",
  },
};

const lessonLang = (lesson: Lesson): Lang => lectureLanguage(lesson.sections.map((s) => `${s.title} ${s.body}`).join(" "));
const scriptLang = (script: Script): Lang => lectureLanguage(script.scenes.map((s) => s.narration).join(" "));

function topicOf(request: string, lang: Lang): string {
  const m = /(?:về|about)\s+(.+?)(?:\s+(?:cho|for)\s|,|\.|$)/i.exec(request);
  const t = (m?.[1] ?? request).trim();
  return t.length > 60 ? `${t.slice(0, 57)}…` : t || TEXT[lang].newTopic;
}

export async function draftLesson(request: string): Promise<LessonDraft> {
  await delay();
  const lang = lectureLanguage(request);
  const L = TEXT[lang];
  const topic = topicOf(request, lang);
  const minutes = /(\d+)\s*(?:phút|min)/i.exec(request)?.[1] ?? "5";
  return {
    reply: L.draftReply(topic),
    title: topic.charAt(0).toUpperCase() + topic.slice(1),
    brief: L.brief(minutes),
    sections: L.sections(topic),
  };
}

export async function editLesson(lesson: Lesson, instruction: string, sectionId: string | null): Promise<LessonEdit> {
  await delay();
  const L = TEXT[lessonLang(lesson)];
  const target = lesson.sections.find((s) => s.id === sectionId) ?? lesson.sections[0];
  return {
    reply: L.editReply(target.title),
    ops: [{ op: "update", sectionId: target.id, afterSectionId: null, title: target.title, body: `${target.body}\n\n${L.addition(instruction)}` }],
  };
}

function spoken(body: string, lang: Lang): string {
  const text = body
    .replace(/\$\$[^$]+\$\$/g, "")
    .replace(/\$[^$]+\$/g, TEXT[lang].mathWords)
    .replace(/^- /gm, "")
    .replace(/\s+/g, " ")
    .trim();
  const sentences = text.match(/[^.!?]+[.!?]?/g) ?? [text];
  return sentences.slice(0, 3).join(" ").trim();
}

export async function draftScript(lesson: Lesson): Promise<ScriptDraft> {
  await delay();
  const lang = lessonLang(lesson);
  const L = TEXT[lang];
  return {
    reply: L.scriptReply(lesson.sections.length),
    scenes: lesson.sections.map((s, i) => ({
      title: i === 0 ? lesson.title : s.title,
      sectionIds: [s.id],
      narration: spoken(s.body, lang) || s.title,
      visual: i === 0 ? L.titleVisual : L.sceneVisual,
      onScreenText: s.title,
    })),
  };
}

export async function editScript(script: Script, instruction: string, sceneId: string | null): Promise<ScriptEdit> {
  await delay();
  const s = script.scenes.find((x) => x.id === sceneId) ?? script.scenes[0];
  return {
    reply: TEXT[scriptLang(script)].sceneEditReply(s.title),
    ops: [
      {
        op: "update",
        sceneId: s.id,
        afterSceneId: null,
        title: s.title,
        sectionIds: s.sectionIds,
        narration: `${s.narration} ${instruction}`.trim(),
        visual: s.visual,
        onScreenText: s.onScreenText,
      },
    ],
  };
}

const q = (s: string) => JSON.stringify(s);

function firstWords(text: string, n: number): string {
  return text.replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean).slice(0, n).join(" ");
}

function templateCode(script: Script, scene: Scene): string {
  const L = TEXT[scriptLang(script)];
  const i = script.scenes.findIndex((s) => s.id === scene.id);
  if (i === 0) {
    return `import { FullVisual, TitleCard } from "@kit";

export default function Scene() {
  return (
    <FullVisual align="left">
      <TitleCard kicker=${q(L.kicker)} title={${q(scene.title)}} subtitle={${q(scene.onScreenText)}} at={0.3} />
    </FullVisual>
  );
}
`;
  }
  const sentences = scene.narration.match(/[^.!?]+[.!?]?/g)?.map((s) => s.trim()).filter(Boolean) ?? [scene.narration];
  const items = sentences.slice(0, 4).map((s) => `{ text: ${q(s.length > 60 ? `${s.slice(0, 57)}…` : s)}, at: ${q(`cue:${firstWords(s, 2)}`)} }`);
  return `import { BulletReveal, TitleWithVisual } from "@kit";

export default function Scene() {
  return (
    <TitleWithVisual title={${q(scene.title)}} kicker={${q(L.part(i + 1))}} align="left">
      <BulletReveal size="small" items={[${items.join(", ")}]} />
    </TitleWithVisual>
  );
}
`;
}

export async function writeScene(script: Script, scene: Scene): Promise<SceneCode> {
  await delay(700);
  return { reply: TEXT[scriptLang(script)].writeReply, code: templateCode(script, scene) };
}

export async function editScene(code: string, instruction: string): Promise<SceneCode> {
  await delay();
  const lang = lectureLanguage(code);
  // The note line is recognised in both languages so repeated edits replace it.
  const tag = lang === "vi" ? "Yêu cầu" : "Request";
  return { reply: TEXT[lang].editCodeReply, code: `// ${tag}: ${instruction.replace(/\n/g, " ")}\n${code.replace(/^\/\/ (Yêu cầu|Request):.*\n/, "")}` };
}

export async function fixScene(script: Script, scene: Scene, _error: string): Promise<SceneCode> {
  await delay();
  return { reply: TEXT[scriptLang(script)].fixReply, code: templateCode(script, scene) };
}
