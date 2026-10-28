"use client";
import type { SceneTiming } from "@lecture/kit/timing";
import { useCallback, useEffect, useRef, useState } from "react";

/*
 * Pacing check with the browser's built-in voice (Web Speech API).
 * It is only for hearing whether animations line up with speech; it is never rendered.
 */

export type VoicePreview = {
  supported: boolean;
  enabled: boolean;
  setEnabled: (v: boolean) => void;
  voices: SpeechSynthesisVoice[];
  voiceURI: string;
  setVoiceURI: (v: string) => void;
  rate: number;
  setRate: (v: number) => void;
  speakFrom: (timing: SceneTiming, localSeconds: number) => void;
  stop: () => void;
};

/** `lang`: language of the lecture ("vi", "en"); voices in that language are offered first. */
export function useVoicePreview(lang = "vi"): VoicePreview {
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  const [enabled, setEnabledState] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceURI, setVoiceURI] = useState("");
  const [rate, setRate] = useState(1.1);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  useEffect(() => {
    if (!supported) return;
    const load = () => {
      const all = window.speechSynthesis.getVoices();
      const own = all.filter((v) => v.lang.toLowerCase().startsWith(lang));
      const list = own.length ? own : all;
      setVoices(list);
      setVoiceURI((cur) => (list.some((v) => v.voiceURI === cur) ? cur : list[0]?.voiceURI || ""));
    };
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", load);
  }, [supported, lang]);

  const stop = useCallback(() => {
    if (supported) window.speechSynthesis.cancel();
  }, [supported]);

  const speakFrom = useCallback(
    (timing: SceneTiming, localSeconds: number) => {
      if (!supported || !enabledRef.current) return;
      window.speechSynthesis.cancel();
      const rest = timing.words.filter((w) => w.end > localSeconds + 0.05);
      if (!rest.length) return;
      const u = new SpeechSynthesisUtterance(rest.map((w) => w.text).join(" "));
      const v = window.speechSynthesis.getVoices().find((x) => x.voiceURI === voiceURI);
      if (v) u.voice = v;
      u.lang = v?.lang ?? (lang === "vi" ? "vi-VN" : "en-US");
      u.rate = rate;
      const delay = Math.max(0, rest[0].start - localSeconds);
      if (delay > 0.05) setTimeout(() => enabledRef.current && window.speechSynthesis.speak(u), delay * 1000);
      else window.speechSynthesis.speak(u);
    },
    [supported, voiceURI, rate, lang],
  );

  const setEnabled = useCallback(
    (v: boolean) => {
      setEnabledState(v);
      if (!v) stop();
    },
    [stop],
  );

  useEffect(() => stop, [stop]);

  return { supported, enabled, setEnabled, voices, voiceURI, setVoiceURI, rate, setRate, speakFrom, stop };
}
