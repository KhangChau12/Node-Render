import { AppSidebar } from "@/components/AppSidebar";
import { dateLocale, type Locale, type MessageKey, type T } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";
import { aiConfig, modelLabel } from "@/lib/ai";
import { NewProject, ProjectGrid, type ProjectCard } from "@/components/NewProject";
import { dataDir } from "@/lib/paths";
import { dirSize, getSettings, listProjects } from "@/lib/storage";
import type { Project, Settings } from "@/lib/types";
import { fmtTime } from "@/lib/util";
import { buildVideoInput, sceneStatus } from "@/lib/video";

export const dynamic = "force-dynamic";

const STEPS: [MessageKey, MessageKey][] = [
  ["stage.lesson", "home.step.lesson"],
  ["stage.script", "home.step.script"],
  ["stage.studio", "home.step.studio"],
  ["stage.export", "home.step.export"],
];
const PATHS = ["lesson", "script", "studio", "export", "export"];

function stageIndex(p: Project): number {
  if (p.renders.some((r) => r.status === "done")) return 4;
  if (p.renders.length) return 3;
  if (p.scriptLocked) return 2;
  if (p.script) return 1;
  return 0;
}

function relTime(iso: string, t: T, locale: Locale): string {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 3600) return t("home.rel.minutes", { n: Math.max(1, Math.round(diff / 60)) });
  if (diff < 86400) return t("home.rel.at", { time: d.toLocaleTimeString(dateLocale(locale), { hour: "2-digit", minute: "2-digit" }) });
  return t("home.rel.on", { date: d.toLocaleDateString(dateLocale(locale), { day: "2-digit", month: "2-digit" }) });
}

function badge(p: Project, stage: number, t: T): string {
  const scenes = p.script?.scenes ?? [];
  switch (stage) {
    case 0:
      if (!p.lesson) return t("home.badge.noLesson");
      return p.suggestions.length ? t("home.badge.suggestions", { n: p.suggestions.length }) : t("home.badge.draft");
    case 1:
      return t("home.badge.scriptPending");
    case 2: {
      const ready = scenes.filter((s) => sceneStatus(p, s) === "ok").length;
      return t("home.badge.video", { ready, total: scenes.length });
    }
    case 3:
      return t("home.badge.rendering");
    default: {
      const last = [...p.renders].reverse().find((r) => r.status === "done");
      return `${t("home.badge.exported")}${last ? ` · ${last.settings.height}p` : ""}`;
    }
  }
}

function toCard(p: Project, settings: Settings, t: T, locale: Locale): ProjectCard {
  const stage = stageIndex(p);
  const n = p.script?.scenes.length ?? 0;
  const dur = n ? buildVideoInput(p, settings).scenes.reduce((a, s) => a + s.timing.duration, 0) : 0;
  const posterTitle = p.lesson?.title ?? p.title;
  return {
    id: p.id,
    title: p.title,
    stage,
    badge: badge(p, stage, t),
    posterTitle,
    posterSub: n ? t("home.scenes", { n }) : p.lesson ? t("home.sections", { n: p.lesson.sections.length }) : t("home.noDraft"),
    duration: dur ? fmtTime(dur) : null,
    meta: `${n ? `${t("home.scenes", { n })} · ` : ""}${t("home.edited", { when: relTime(p.updatedAt, t, locale) })}`,
    next: t(`home.next.${stage}` as MessageKey),
    href: `/projects/${p.id}/${PATHS[stage]}`,
    search: `${p.title} ${posterTitle} ${p.prompt}`.toLowerCase(),
  };
}

export default async function Home() {
  const [projects, settings, size, { t, locale }] = await Promise.all([listProjects(), getSettings(), dirSize(dataDir()), getI18n()]);
  return (
    <div className="app">
      <AppSidebar active="home" />
      <main className="home">
        <div className="home-in">
          <NewProject options={aiConfig().backends.map((b) => ({ id: b.id, label: b.label, model: modelLabel("codegen", b.id), available: b.available }))} />
          <section className="steps" aria-label={t("home.howItWorks")}>
            {STEPS.map(([title, d], i) => (
              <div key={title}>
                <span className="n">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <b style={{ fontWeight: 600 }}>{t(title)}</b>
                  <p>{t(d)}</p>
                </div>
              </div>
            ))}
          </section>
          <ProjectGrid cards={projects.map((p) => toCard(p, settings, t, locale))} storage={t("home.storage", { size: (size / 1024 / 1024).toFixed(1) })} />
        </div>
      </main>
    </div>
  );
}
