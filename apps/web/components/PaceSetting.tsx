"use client";
import { countSyllables, estimateTiming } from "@lecture/kit/timing";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { postJson } from "@/lib/client";
import { dateLocale } from "@/lib/i18n";
import { useI18n } from "./I18n";

/** Narration pace used to estimate scene timing until real voiceover exists. */
export function PaceSetting({ value }: { value: number }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [v, setV] = useState(value);
  const [saved, setSaved] = useState(true);
  // The sample is in the interface language; syllables are counted the same way scenes are timed.
  const sample = t("pace.sample");
  const syllables = sample.split(/\s+/).reduce((n, w) => n + countSyllables(w), 0);
  const secs = estimateTiming(sample, { syllablesPerSecond: v }).duration;
  const [speaking, setSpeaking] = useState(false);

  const listen = () => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(sample);
    u.lang = dateLocale(locale);
    const voice = window.speechSynthesis.getVoices().find((x) => x.lang.toLowerCase().startsWith(locale));
    if (voice) u.voice = voice;
    const t0 = performance.now();
    setSpeaking(true);
    u.onend = () => {
      setSpeaking(false);
      // Calibrate: syllables spoken / seconds taken.
      const took = (performance.now() - t0) / 1000;
      if (took > 1) {
        setV(Math.round((syllables / took) * 10) / 10);
        setSaved(false);
      }
    };
    window.speechSynthesis.speak(u);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <input type="range" min={2.5} max={6} step={0.1} value={v} onChange={(e) => { setV(Number(e.target.value)); setSaved(false); }} aria-label={t("pace.aria")} />
        <span className="mono">{t("pace.value", { v: v.toFixed(1) })}</span>
        <button
          className="btn sm pri"
          disabled={saved}
          onClick={async () => {
            await postJson("/api/settings", { syllablesPerSecond: v });
            setSaved(true);
            router.refresh();
          }}
        >
          {t("common.save")}
        </button>
      </div>
      <span className="t3" style={{ fontSize: 12 }}>
        {t("pace.sampleInfo", { n: syllables, s: secs.toFixed(1) })}{" "}
        <button className="btn sm ghost" onClick={listen} disabled={speaking}>
          {speaking ? t("pace.reading") : t("pace.measure")}
        </button>
      </span>
    </div>
  );
}
