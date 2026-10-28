"use client";
import Link from "next/link";
import React from "react";
import type { MessageKey } from "@/lib/i18n";
import type { Project, Stage } from "@/lib/types";
import { useI18n } from "./I18n";
import { Icon } from "./Icon";
import { Rail } from "./Rail";

const STAGES: { key: Stage; label: MessageKey; path: string }[] = [
  { key: "lesson", label: "stage.lesson", path: "lesson" },
  { key: "script", label: "stage.script", path: "script" },
  { key: "studio", label: "stage.studio", path: "studio" },
  { key: "export", label: "stage.export", path: "export" },
];

function reachable(p: Project, s: Stage): boolean {
  if (s === "lesson") return true;
  if (s === "script") return Boolean(p.script);
  return Boolean(p.script) && p.scriptLocked;
}

function done(p: Project, s: Stage): boolean {
  if (s === "lesson") return p.lessonLocked;
  if (s === "script") return p.scriptLocked;
  if (s === "studio") return p.renders.length > 0;
  return p.renders.some((r) => r.status === "done");
}

/** Rail + top bar shared by the four project stages: breadcrumb, stepper, next-step actions. */
export function ProjectChrome({ project, stage, actions, status, children }: { project: Project; stage: Stage; actions?: React.ReactNode; status?: React.ReactNode; children: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="app">
      <Rail />
      <div className="work">
        <header className="top">
          <div className="crumb">
            <Link href="/">{t("nav.projects")}</Link>
            <span aria-hidden="true">/</span>
            <b title={project.title}>{project.title}</b>
            {status}
          </div>
          <nav className="stages" aria-label={t("nav.steps")}>
            {STAGES.map((s, i) => {
              const ok = reachable(project, s.key);
              const isDone = done(project, s.key) && s.key !== stage;
              const cls = s.key === stage ? "cur" : isDone ? "done" : "";
              return (
                <React.Fragment key={s.key}>
                  {i > 0 ? <span className={`bar ${done(project, STAGES[i - 1].key) ? "done" : ""}`} /> : null}
                  <Link className={`stage ${cls} ${ok ? "" : "off"}`} href={`/projects/${project.id}/${s.path}`} aria-disabled={!ok} aria-current={s.key === stage ? "step" : undefined} tabIndex={ok ? undefined : -1}>
                    <span className="n">{isDone ? <Icon name="check" /> : i + 1}</span>
                    {t(s.label)}
                  </Link>
                </React.Fragment>
              );
            })}
          </nav>
          <div className="acts">{actions}</div>
        </header>
        <div className="body">{children}</div>
      </div>
    </div>
  );
}

/** "Saved" marker for the breadcrumb. */
export function Saved({ text }: { text?: string }) {
  const { t } = useI18n();
  return (
    <span className="saved">
      <Icon name="check" size={14} style={{ color: "var(--ok)" }} />
      {text ?? t("common.saved")}
    </span>
  );
}
