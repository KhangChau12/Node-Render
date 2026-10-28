/**
 * Narration timing.
 *
 * Every scene has a SceneTiming: the narration split into words with start/end
 * seconds. Today it is estimated from text; later a TTS + forced-alignment step
 * can produce the same shape from real audio, and no scene code has to change.
 */

export type WordTiming = {
  /** Word as written, including punctuation. */
  text: string;
  /** Normalized form used for cue matching. */
  norm: string;
  start: number;
  end: number;
};

export type SceneTiming = {
  text: string;
  words: WordTiming[];
  /** Total scene length in seconds (lead-in + narration + tail). */
  duration: number;
  source: "estimate" | "audio";
};

export type EstimateOptions = {
  /** Spoken syllables per second. Vietnamese lecture pace is about 4. */
  syllablesPerSecond?: number;
  /** Silence before the first word. */
  lead?: number;
  /** Silence after the last word. */
  tail?: number;
  pauseComma?: number;
  pauseSentence?: number;
  /** Minimum scene length in seconds. */
  minDuration?: number;
};

export const DEFAULT_ESTIMATE: Required<EstimateOptions> = {
  syllablesPerSecond: 4,
  lead: 0.4,
  tail: 0.9,
  pauseComma: 0.25,
  pauseSentence: 0.5,
  minDuration: 3,
};

/** Lowercase, NFC, strip punctuation. Keeps Vietnamese diacritics. */
export function normalizeWord(word: string): string {
  return word
    .normalize("NFC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

/** Rough syllable count: vowel groups after removing diacritics. */
export function countSyllables(word: string): number {
  const base = word
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/đ/gi, "d")
    .toLowerCase();
  const digits = base.replace(/[^0-9]/g, "").length;
  const groups = base.match(/[aeiouy]+/g)?.length ?? 0;
  return Math.max(1, groups + Math.ceil(digits * 1.5));
}

export function estimateTiming(text: string, options: EstimateOptions = {}): SceneTiming {
  const o = { ...DEFAULT_ESTIMATE, ...options };
  const tokens = text.split(/\s+/).filter(Boolean);
  const words: WordTiming[] = [];
  let t = o.lead;
  for (const token of tokens) {
    const norm = normalizeWord(token);
    const len = norm ? countSyllables(token) / o.syllablesPerSecond : 0;
    if (norm) {
      words.push({ text: token, norm, start: t, end: t + len });
      t += len;
    }
    if (/[.!?…]["”')]*$/.test(token)) t += o.pauseSentence;
    else if (/[,;:—–]["”')]*$/.test(token)) t += o.pauseComma;
  }
  const duration = Math.max(o.minDuration, t + o.tail);
  return { text, words, duration, source: "estimate" };
}

/**
 * Force a scene to a given length. Longer: extra time goes to the tail.
 * Shorter: word times are compressed proportionally.
 */
export function fitTiming(timing: SceneTiming, duration: number | undefined | null): SceneTiming {
  if (!duration || duration <= 0 || Math.abs(duration - timing.duration) < 1e-3) return timing;
  if (duration > timing.duration) return { ...timing, duration };
  const k = duration / timing.duration;
  return {
    ...timing,
    duration,
    words: timing.words.map((w) => ({ ...w, start: w.start * k, end: w.end * k })),
  };
}

/** Group words into caption lines, breaking at punctuation or every `maxWords`. */
export function captionChunks(timing: SceneTiming, maxWords = 9) {
  const chunks: { text: string; start: number; end: number }[] = [];
  let cur: WordTiming[] = [];
  const flush = () => {
    if (!cur.length) return;
    chunks.push({
      text: cur.map((w) => w.text).join(" "),
      start: cur[0].start,
      end: cur[cur.length - 1].end,
    });
    cur = [];
  };
  for (const w of timing.words) {
    cur.push(w);
    if (cur.length >= maxWords || /[.!?…,;:]["”')]*$/.test(w.text)) flush();
  }
  flush();
  // Keep each line on screen until the next one starts.
  for (let i = 0; i < chunks.length - 1; i++) chunks[i].end = Math.max(chunks[i].end, chunks[i + 1].start);
  if (chunks.length) chunks[chunks.length - 1].end = timing.duration;
  return chunks;
}
