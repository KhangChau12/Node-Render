import { AsyncLocalStorage } from "node:async_hooks";
import { getSettings } from "../storage";
import { DEFAULT_LOCALE, makeT, type Locale, type MessageKey, type T, type Vars } from "./index";

/*
 * Server side: the UI language comes from the settings file. API handlers run
 * inside `withLocale`, so messages thrown or streamed deep in the actions
 * (`tr`) come out in the teacher's language without passing it around.
 */

const store = new AsyncLocalStorage<Locale>();

export async function currentLocale(): Promise<Locale> {
  return (await getSettings()).locale ?? DEFAULT_LOCALE;
}

/** For server components: the locale and a translator. */
export async function getI18n(): Promise<{ locale: Locale; t: T }> {
  const locale = await currentLocale();
  return { locale, t: makeT(locale) };
}

/** Run an API handler with the UI language of this request. */
export async function withLocale<R>(fn: () => Promise<R>): Promise<R> {
  const locale = await currentLocale().catch(() => DEFAULT_LOCALE);
  return store.run(locale, fn);
}

/** Locale of the running request (English outside a handler). */
export const requestLocale = (): Locale => store.getStore() ?? DEFAULT_LOCALE;

/** Translate in the running request's language. */
export const tr = (key: MessageKey, vars?: Vars): string => makeT(requestLocale())(key, vars);
