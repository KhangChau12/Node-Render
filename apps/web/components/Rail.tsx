"use client";
import Link from "next/link";
import { useI18n } from "./I18n";
import { Icon } from "./Icon";

export type RailAi = { ok: boolean; label: string; title: string };

/** Left navigation rail, shared by app pages and project stages. */
export function Rail({ active, ai }: { active?: "home" | "kit" | "settings"; ai?: RailAi }) {
  const { t } = useI18n();
  return (
    <nav className="rail" aria-label={t("nav.main")}>
      <Link className="mark" href="/" aria-label={t("nav.homeAria")}>N</Link>
      <Link className={`navi ${active === "home" ? "on" : ""}`} href="/"><Icon name="folder" />{t("nav.projects")}</Link>
      <Link className={`navi ${active === "kit" ? "on" : ""}`} href="/kit"><Icon name="blocks" />{t("nav.kit")}</Link>
      <Link className={`navi ${active === "settings" ? "on" : ""}`} href="/settings"><Icon name="gear" />{t("nav.settings")}</Link>
      <span className="sp" />
      {ai ? (
        <Link className={`ai ${ai.ok ? "" : "warn"}`} href="/settings" title={ai.title}>
          <i />
          {ai.label}
        </Link>
      ) : null}
    </nav>
  );
}
