"use client";
import { useEffect, useRef, useState } from "react";
import { dateLocale } from "@/lib/i18n";
import { useI18n } from "./I18n";
import { Icon } from "./Icon";

/** "History" button with a dropdown of earlier versions to restore. */
export function HistoryMenu({ items, current, onRestore, disabled }: { items: { version: number; at: string }[]; current: number; onRestore: (v: number) => void; disabled?: boolean }) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button className="btn ghost sm" onClick={() => setOpen(!open)} disabled={disabled || items.length === 0} aria-expanded={open}>
        <Icon name="history" />
        {t("history.button")}
      </button>
      {open ? (
        <div className="menu" style={{ right: 0, top: 40, width: 270, maxHeight: 340, overflow: "auto" }}>
          <div className="label" style={{ padding: "4px 8px 6px" }}>{t("history.current", { n: current })}</div>
          {[...items].reverse().map((h) => (
            <button
              key={h.version}
              className="mi"
              style={{ justifyContent: "space-between" }}
              onClick={() => {
                onRestore(h.version);
                setOpen(false);
              }}
            >
              <span>{t("history.restore", { n: h.version })}</span>
              <span className="mono t3" style={{ fontSize: 11 }}>
                {new Date(h.at).toLocaleString(dateLocale(locale), { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
