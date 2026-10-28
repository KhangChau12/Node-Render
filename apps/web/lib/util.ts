import type { Lesson, Scene, Section } from "./types";

export function uid(prefix = ""): string {
  return prefix + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
}

export const now = () => new Date().toISOString();

/** Small stable string hash (FNV-1a), fine for change detection. */
export function hash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

export const sceneHash = (s: Scene) => hash(JSON.stringify([s.title, s.narration, s.visual, s.onScreenText]));

export function sectionsHash(lesson: Lesson | null, ids: string[]): string {
  if (!lesson) return "";
  const parts = ids.map((id) => lesson.sections.find((s) => s.id === id)).map((s) => (s ? `${s.title}\n${s.body}` : "∅"));
  return hash(parts.join("\n--\n"));
}

export function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

export function slugify(s: string): string {
  return (
    s
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .replace(/đ/gi, "d")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "bai-giang"
  );
}

export function fmtTime(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function sectionLabel(lesson: Lesson | null, id: string): string {
  const i = lesson?.sections.findIndex((s) => s.id === id) ?? -1;
  return i >= 0 ? `§${i + 1}` : "§?";
}

export function sectionById(lesson: Lesson | null, id: string | null): Section | undefined {
  return id ? lesson?.sections.find((s) => s.id === id) : undefined;
}

/** Target length in seconds from a free-text brief like "5 phút", "4–6 phút" or "5 minutes"; null when none is stated. */
export function targetSeconds(duration: string | undefined): number | null {
  const m = duration?.match(/(\d+(?:[.,]\d+)?)(?:\s*(?:-|–|đến|to)\s*(\d+(?:[.,]\d+)?))?\s*(phút|giây|min(?:ute)?s?|sec(?:ond)?s?)\b/i);
  if (!m) return null;
  const a = Number(m[1].replace(",", "."));
  const b = m[2] ? Number(m[2].replace(",", ".")) : a;
  const v = (a + b) / 2;
  return /^(giây|sec)/i.test(m[3]) ? v : v * 60;
}

/**
 * Language of a lecture, guessed from its text: Vietnamese when it carries
 * Vietnamese diacritics, English otherwise. Independent of the UI language.
 */
export function lectureLanguage(text: string): "vi" | "en" {
  const marks = (text.match(/[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệịỉĩọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/gi) ?? []).length;
  return marks >= Math.max(3, text.length / 200) ? "vi" : "en";
}

/** m:ss for short durations. */
export function fmtShort(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
