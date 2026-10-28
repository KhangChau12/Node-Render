import { en, type MessageKey } from "./en";
import { vi } from "./vi";

/*
 * UI language. Dictionaries are flat ("area.thing" → text) with {name}
 * placeholders; a value "one|many" picks the first form when vars.n === 1
 * (English plurals; Vietnamese has one form). Lecture content is not
 * translated: it is written in the language of the teacher's request.
 */

export type Locale = "en" | "vi";
export const LOCALES: { id: Locale; label: string }[] = [
  { id: "en", label: "English" },
  { id: "vi", label: "Tiếng Việt" },
];
export const DEFAULT_LOCALE: Locale = "en";

export const isLocale = (v: unknown): v is Locale => v === "en" || v === "vi";

const DICTS = { en, vi } as const;

export type Vars = Record<string, string | number>;
export type T = (key: MessageKey, vars?: Vars) => string;
export type { MessageKey };

export function translate(locale: Locale, key: MessageKey, vars?: Vars): string {
  let s: string = DICTS[locale][key] ?? en[key] ?? key;
  if (s.includes("|") && vars && typeof vars.n === "number") {
    const [one, many] = s.split("|");
    s = vars.n === 1 ? one : many;
  }
  return vars ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : s;
}

export const makeT = (locale: Locale): T => (key, vars) => translate(locale, key, vars);

/** BCP 47 tag for dates and numbers. */
export const dateLocale = (locale: Locale) => (locale === "vi" ? "vi-VN" : "en-US");
