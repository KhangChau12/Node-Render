"use client";
import React, { createContext, useContext, useMemo } from "react";
import { DEFAULT_LOCALE, makeT, type Locale, type T } from "@/lib/i18n";

const Ctx = createContext<Locale>(DEFAULT_LOCALE);

/** Provides the UI language (from settings, read by the root layout) to client components. */
export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <Ctx.Provider value={locale}>{children}</Ctx.Provider>;
}

export function useI18n(): { locale: Locale; t: T } {
  const locale = useContext(Ctx);
  return useMemo(() => ({ locale, t: makeT(locale) }), [locale]);
}
