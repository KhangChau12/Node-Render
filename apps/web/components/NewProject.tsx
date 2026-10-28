"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { postJson } from "@/lib/client";
import type { MessageKey } from "@/lib/i18n";
import type { AiProvider, Project } from "@/lib/types";
import { useI18n } from "./I18n";
import { Icon } from "./Icon";
import { Toast } from "./Toast";

// Example prompts span subjects, to show that the kit is not only for math.
const IDEAS = [1, 2, 3, 4].map((i) => [`new.idea${i}.label`, `new.idea${i}.text`] as [MessageKey, MessageKey]);

/** An AI the project can be written with, as offered on the home page. */
export type AiOption = { id: AiProvider; label: string; model: string; available: boolean };

const LAST_AI = "node-render:ai";

export function NewProject({ options }: { options: AiOption[] }) {
  const { t } = useI18n();
  const router = useRouter();
  const [text, setText] = useState("");
  const firstAvailable = options.find((o) => o.available)?.id ?? "openai";
  const [ai, setAi] = useState<AiProvider>(firstAvailable);
  // Remember the last choice on this browser.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LAST_AI) as AiProvider | null;
      if (saved && options.some((o) => o.id === saved && o.available)) setAi(saved);
    } catch {}
  }, [options]);
  const choose = (id: AiProvider) => {
    setAi(id);
    try {
      localStorage.setItem(LAST_AI, id);
    } catch {}
  };
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const p = await postJson<Project>("/api/projects", { prompt: text, ai });
      router.push(`/projects/${p.id}/lesson`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="new-h">
      <h1 id="new-h">{t("new.title")}</h1>
      <p className="lead">{t("new.lead")}</p>
      <div className="prompt">
        <label htmlFor="prompt" className="sr">{t("new.label")}</label>
        <textarea
          id="prompt"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("new.placeholder")}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submit();
          }}
          disabled={busy}
        />
        <div className="bar">
          <div className="segc" role="radiogroup" aria-label={t("new.aiGroup")}>
            {options.map((o) => (
              <button
                key={o.id}
                role="radio"
                aria-checked={ai === o.id}
                className={ai === o.id ? "on" : ""}
                onClick={() => choose(o.id)}
                disabled={busy || !o.available}
                title={o.available ? `${o.label} · ${o.model}` : t("new.noKey", { label: o.label })}
              >
                {o.label}
              </button>
            ))}
          </div>
          <span className="hint">{busy ? t("new.opening") : t("new.hint")}</span>
          <button className="btn pri lg" onClick={submit} disabled={!text.trim() || busy}>
            {busy ? <span className="spin" /> : null}
            {t("new.submit")} <span className="kbd">Ctrl ↵</span>
          </button>
        </div>
      </div>
      <div className="ideas">
        <span>{t("new.ideas")}</span>
        {IDEAS.map(([label, idea]) => (
          <button key={label} className="chip" onClick={() => setText(t(idea))} disabled={busy}>
            {t(label)}
          </button>
        ))}
      </div>
      <Toast message={error} onClose={() => setError(null)} />
    </section>
  );
}

export type ProjectCard = {
  id: string;
  title: string;
  /** 0 lesson · 1 script · 2 video · 3 export · 4 exported */
  stage: number;
  badge: string;
  posterTitle: string;
  posterSub: string;
  duration: string | null;
  meta: string;
  next: string;
  href: string;
  search: string;
};

type Filter = "all" | "wip" | "done";

/** Project cards with a filter, a search box and delete. */
export function ProjectGrid({ cards, storage }: { cards: ProjectCard[]; storage: string }) {
  const { t } = useI18n();
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const counts = { all: cards.length, wip: cards.filter((c) => c.stage < 4).length, done: cards.filter((c) => c.stage === 4).length };
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return cards.filter((c) => (filter === "all" || (filter === "done") === (c.stage === 4)) && (!needle || c.search.includes(needle)));
  }, [cards, filter, q]);

  return (
    <section aria-labelledby="proj-h">
      <div className="projhd">
        <h2 id="proj-h">{t("grid.title")}</h2>
        {cards.length ? (
          <div className="segc" role="group" aria-label={t("grid.filter")}>
            <button className={filter === "all" ? "on" : ""} onClick={() => setFilter("all")}>{t("grid.all", { n: counts.all })}</button>
            <button className={filter === "wip" ? "on" : ""} onClick={() => setFilter("wip")}>{t("grid.wip", { n: counts.wip })}</button>
            <button className={filter === "done" ? "on" : ""} onClick={() => setFilter("done")}>{t("grid.done", { n: counts.done })}</button>
          </div>
        ) : null}
        <span className="sp" />
        {cards.length ? (
          <label className="search">
            <Icon name="search" />
            <span className="sr">{t("grid.search")}</span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("grid.search")} />
          </label>
        ) : null}
        <span className="t3" style={{ fontSize: 12.5 }}>{storage}</span>
      </div>
      {cards.length === 0 ? (
        <div className="card empty" style={{ padding: "36px 20px" }}>{t("grid.empty")}</div>
      ) : shown.length === 0 ? (
        <div className="t3" style={{ padding: "18px 0" }}>{t("grid.noMatch")}</div>
      ) : (
        <div className="pgrid">
          {shown.map((c) => (
            <article key={c.id} className="pcard">
              <Link href={c.href} className="poster" aria-label={t("grid.open", { title: c.title })}>
                <b>{c.posterTitle}</b>
                <i />
                <small>{c.posterSub}</small>
                <span className={`badge ${c.stage === 4 ? "done" : ""}`}>{c.badge}</span>
                {c.duration ? <span className="dur">{c.duration}</span> : null}
              </Link>
              <div className="meta">
                <div>
                  <b title={c.title}>{c.title}</b>
                  <small>{c.meta}</small>
                </div>
                <div className="pipe" aria-label={c.stage === 4 ? t("grid.completed") : t("grid.step", { n: c.stage + 1 })}>
                  {[0, 1, 2, 3].map((i) => (
                    <i key={i} className={i < c.stage ? "d" : i === c.stage ? "c" : ""} />
                  ))}
                </div>
              </div>
              <div className="foot">
                <Link className="next" href={c.href}>
                  {c.next}
                  <Icon name="arrow" />
                </Link>
                <DeleteProjectButton id={c.id} title={c.title} />
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export function DeleteProjectButton({ id, title }: { id: string; title: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  if (!confirm)
    return (
      <button className="btn ghost icon sm danger" onClick={() => setConfirm(true)} aria-label={t("grid.deleteAria", { title })} title={t("grid.deleteTitle")}>
        <Icon name="trash" />
      </button>
    );
  return (
    <span style={{ display: "inline-flex", gap: 4 }}>
      <button
        className="btn sm"
        style={{ color: "var(--err)" }}
        onClick={async () => {
          await fetch(`/api/projects/${id}`, { method: "DELETE" });
          router.refresh();
        }}
      >
        {t("grid.deleteConfirm")}
      </button>
      <button className="btn sm ghost" onClick={() => setConfirm(false)}>
        {t("common.cancel")}
      </button>
    </span>
  );
}
