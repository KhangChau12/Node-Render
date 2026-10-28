"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { postJson } from "@/lib/client";
import { LOCALES, type Locale } from "@/lib/i18n";
import { useI18n } from "./I18n";

/** Switch the interface language; the whole app re-renders in it. */
export function LanguageSetting() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [saving, setSaving] = useState<Locale | null>(null);
  const choose = async (id: Locale) => {
    if (id === locale || saving) return;
    setSaving(id);
    try {
      await postJson("/api/settings", { locale: id });
      router.refresh();
    } finally {
      setSaving(null);
    }
  };
  return (
    <div className="segc" role="radiogroup" aria-label={t("settings.language")}>
      {LOCALES.map((l) => (
        <button key={l.id} role="radio" aria-checked={locale === l.id} className={locale === l.id ? "on" : ""} onClick={() => choose(l.id)} disabled={Boolean(saving)} lang={l.id}>
          {saving === l.id ? <span className="spin" /> : null}
          {l.label}
        </button>
      ))}
    </div>
  );
}
