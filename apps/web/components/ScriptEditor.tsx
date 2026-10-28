"use client";
import { estimateTiming } from "@lecture/kit/timing";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import { useProject } from "@/lib/client";
import { useAi, useElapsed, type Live } from "@/lib/stream";
import type { Project, Scene, Settings } from "@/lib/types";
import { fmtShort, targetSeconds } from "@/lib/util";
import { cueRefs, kitComponents, lessonChangedFor } from "@/lib/video";
import { ChatPanel } from "./ChatPanel";
import { useI18n } from "./I18n";
import { HistoryMenu } from "./HistoryMenu";
import { Icon } from "./Icon";
import { ProjectChrome, Saved } from "./ProjectChrome";
import { Toast } from "./Toast";

type PartialScene = { title?: string; narration?: string; visual?: string; onScreenText?: string };

const QUICK = ["script.quick1", "script.quick2", "script.quick3", "script.quick4"] as const;
const num = (i: number) => String(i + 1).padStart(2, "0");
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Narration with the cue phrases used by the scene's code highlighted. */
function Narration({ text, cues }: { text: string; cues: string[] }) {
  if (!cues.length) return <>{text}</>;
  const re = new RegExp(`(${[...cues].sort((a, b) => b.length - a.length).map(escapeRe).join("|")})`, "gi");
  return (
    <>
      {text.split(re).map((part, i) => (i % 2 ? <mark key={i} className="cue">{part}</mark> : <React.Fragment key={i}>{part}</React.Fragment>))}
    </>
  );
}

function DraftingBar({ live, onStop }: { live: Live; onStop: () => void }) {
  const { t } = useI18n();
  const secs = useElapsed(live.startedAt);
  const n = (live.partial?.scenes ?? []).length;
  return (
    <div className="drafting">
      <span className="spin" />
      <b style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{n ? t("script.writingScene", { n }) : live.thinking ? t("script.thinkingSplit") : t("common.waitingModel")}</b>
      <span className="mono t3">{secs}s</span>
      <span className="tx">{n ? "" : live.thinking.replace(/\s+/g, " ").slice(-140)}</span>
      <button className="btn sm" onClick={onStop}>{t("common.stop")}</button>
    </div>
  );
}

export function ScriptEditor({ initial, model, settings }: { initial: Project; model: string; settings: Settings }) {
  const { t } = useI18n();
  const router = useRouter();
  const { project, setProject, busy, error, setError, run } = useProject(initial);
  const ai = useAi(project.id, setProject, setError);
  const job = ai.live.main ?? null;
  const working = Boolean(busy) || Boolean(job);
  const [failed, setFailed] = useState(false);

  const draft = async () => {
    setFailed(false);
    const p = await ai.start("main", { action: "draftScript" }, t("script.draftJob"));
    if (!p?.script) setFailed(true);
  };

  // First visit after approving the lesson: write the script here, streamed into the board.
  useEffect(() => {
    if (!initial.script && initial.lessonLocked) void draft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<Scene | null>(null);
  const scenes = project.script?.scenes ?? [];
  const locked = project.scriptLocked;

  const durations = useMemo(
    () => Object.fromEntries(scenes.map((s) => [s.id, project.builds[s.id]?.durationOverride ?? estimateTiming(s.narration, { syllablesPerSecond: settings.syllablesPerSecond }).duration])),
    [scenes, project.builds, settings.syllablesPerSecond],
  );
  const total = scenes.reduce((n, s) => n + durations[s.id], 0);
  const target = targetSeconds(project.lesson?.brief.duration);
  const sel = scenes.find((s) => s.id === selected);
  const anyCues = scenes.some((s) => project.builds[s.id] && cueRefs(project.builds[s.id].code).length);

  const lockScript = async () => {
    const p = await run("lockScript");
    if (p) router.push(`/projects/${p.id}/studio`);
  };

  const actions = (
    <>
      <HistoryMenu items={project.scriptHistory} current={project.scriptVersion} onRestore={(v) => run("restoreScript", { version: v })} disabled={locked || working} />
      {locked ? (
        <Link className="btn pri" href={`/projects/${project.id}/studio`}>
          {t("script.toVideo")}
          <Icon name="arrow" />
        </Link>
      ) : (
        <button className="btn pri" onClick={lockScript} disabled={working || !project.lessonLocked || scenes.length === 0} title={t("script.lockTitle")}>
          {t("script.lock")}
          <Icon name="arrow" />
        </button>
      )}
    </>
  );

  if (!project.script) {
    const rows = ((job?.partial?.scenes ?? []) as PartialScene[]).filter(Boolean);
    return (
      <ProjectChrome project={project} stage="script">
        <main className="sheet">
          <div className="sheethd"><div><h1>{t("script.title")}</h1><p>{t("script.intro")}</p></div></div>
          {job ? <DraftingBar live={job} onStop={() => ai.stop("main")} /> : null}
          {!job && (failed || !project.lessonLocked) ? (
            <div className={`banner ${project.lessonLocked ? "err" : "warn"}`}>
              <Icon name="alert" />
              <span>{project.lessonLocked ? t("script.failed") : t("script.approveLessonFirst")}</span>
              {project.lessonLocked ? <button className="btn sm pri" onClick={draft}>{t("script.rewrite")}</button> : <Link className="btn sm" href={`/projects/${project.id}/lesson`}>{t("script.backToLesson")}</Link>}
            </div>
          ) : null}
          <div className="board">
            {rows.map((s, i) => (
              <article key={i} className={`scard ${i === rows.length - 1 && job ? "writing" : ""}`}>
                <div className="num"><b>{num(i)}</b></div>
                <div className="col">
                  <h2>{s.title}</h2>
                  <span className="label">{t("common.visual")}</span>
                  <p className="vis">{s.visual}</p>
                </div>
                <div className="col">
                  <span className="label">{t("common.narration")}</span>
                  <p className="nar">{s.narration}</p>
                </div>
              </article>
            ))}
            {job ? (
              <article className="scard">
                <div className="num" />
                <div className="col"><div className="skel" style={{ width: "80%" }} /></div>
                <div className="col"><div className="skel" style={{ width: "90%" }} /><div className="skel" style={{ width: "60%" }} /></div>
              </article>
            ) : null}
          </div>
        </main>
        <ChatPanel
          messages={project.chats.script}
          model={model}
          live={job}
          onStop={() => ai.stop("main")}
          disabled={t("script.waitDraft")}
          placeholder=""
          scope={<span className="chip">{t("script.whole")}</span>}
          onSend={() => {}}
        />
        <Toast message={error} onClose={() => setError(null)} />
      </ProjectChrome>
    );
  }

  return (
    <ProjectChrome project={project} stage="script" actions={actions} status={<Saved text={t("common.savedVersion", { n: project.scriptVersion })} />}>
      <main className="sheet">
        {!project.lessonLocked ? (
          <div className="banner warn">
            <Icon name="alert" />
            <span>{t("script.lessonReopened")}</span>
            <Link className="btn sm" href={`/projects/${project.id}/lesson`}>{t("script.backToLesson")}</Link>
          </div>
        ) : null}
        {locked ? (
          <div className="banner ok">
            <Icon name="check" />
            <span>{t("script.approved", { n: project.scriptVersion })}</span>
            <button className="btn sm" onClick={() => run("unlockScript")} disabled={working}>
              <Icon name="edit" />
              {t("common.editAgain")}
            </button>
          </div>
        ) : null}

        <div className="sheethd">
          <div style={{ flex: 1, minWidth: 240 }}>
            <h1>{t("script.title")}</h1>
            <p>
              {t("script.count", { n: scenes.length })} · <b>{fmtShort(total)}</b> {t("script.estimated")}{target ? ` · ${t("script.target", { t: fmtShort(target) })}` : ""}
            </p>
          </div>
          {!locked ? (
            <button className="btn sm" onClick={() => run("addScene", { afterSceneId: selected })} disabled={working}>
              <Icon name="plus" />
              {t("script.addScene")}
            </button>
          ) : null}
        </div>

        <div className="reel" aria-label={t("script.reel")}>
          {scenes.map((s, i) => (
            <button
              key={s.id}
              className={selected === s.id ? "on" : lessonChangedFor(project, s) ? "warn" : ""}
              style={{ flex: `${durations[s.id]} 1 0` }}
              onClick={() => {
                setSelected(s.id);
                document.getElementById(`scene-${s.id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
              }}
              title={`${s.title} · ${fmtShort(durations[s.id])}`}
            >
              {num(i)}
              {durations[s.id] / Math.max(total, target ?? 0) > 0.07 ? <span>{fmtShort(durations[s.id])}</span> : null}
            </button>
          ))}
          {target && target > total + 1 ? <span className="rest" style={{ flex: `${target - total} 1 0` }}>{t("script.left", { t: fmtShort(target - total) })}</span> : null}
        </div>

        <div className="board">
          {scenes.map((s, i) => {
            const ed = editing?.id === s.id ? editing : null;
            const changed = lessonChangedFor(project, s);
            const code = project.builds[s.id]?.code;
            const cues = code ? cueRefs(code).map((c) => c.phrase) : [];
            const kit = code ? kitComponents(code) : [];
            const sources = s.sectionIds
              .map((id) => {
                const k = project.lesson?.sections.findIndex((x) => x.id === id) ?? -1;
                return k >= 0 ? `${k + 1}. ${project.lesson!.sections[k].title}` : null;
              })
              .filter(Boolean);
            return (
              <article key={s.id} id={`scene-${s.id}`} className={`scard ${selected === s.id ? "on" : ""}`} onClick={() => setSelected(s.id)}>
                <div className="num">
                  <b>{num(i)}</b>
                  <span>{fmtShort(durations[s.id])}</span>
                  {!locked && !ed ? (
                    <>
                      <button className="btn ghost icon sm" aria-label={t("script.moveUp", { n: i + 1 })} title={t("script.up")} onClick={(e) => { e.stopPropagation(); run("moveScene", { sceneId: s.id, dir: -1 }); }} disabled={i === 0}><Icon name="up" /></button>
                      <button className="btn ghost icon sm" aria-label={t("script.moveDown", { n: i + 1 })} title={t("script.down")} onClick={(e) => { e.stopPropagation(); run("moveScene", { sceneId: s.id, dir: 1 }); }} disabled={i === scenes.length - 1}><Icon name="down" /></button>
                    </>
                  ) : null}
                </div>
                {ed ? (
                  <>
                    <div className="col">
                      <input className="input" value={ed.title} onChange={(e) => setEditing({ ...ed, title: e.target.value })} aria-label={t("script.sceneTitle")} />
                      <textarea className="textarea" rows={5} value={ed.visual} onChange={(e) => setEditing({ ...ed, visual: e.target.value })} aria-label={t("script.visualAria")} />
                      <input className="input mono" value={ed.onScreenText} onChange={(e) => setEditing({ ...ed, onScreenText: e.target.value })} aria-label={t("script.onScreen")} placeholder={t("script.onScreen")} />
                    </div>
                    <div className="col">
                      <textarea className="textarea" rows={8} value={ed.narration} onChange={(e) => setEditing({ ...ed, narration: e.target.value })} aria-label={t("common.narration")} />
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        <button className="btn sm" onClick={(e) => { e.stopPropagation(); setEditing(null); }}>{t("common.cancel")}</button>
                        <button className="btn sm pri" onClick={async (e) => { e.stopPropagation(); if (await run("saveScene", { scene: ed })) setEditing(null); }}>{t("common.save")}</button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="col">
                      <div className="colhd"><h2>{s.title}</h2></div>
                      <span className="label">{t("common.visual")}</span>
                      <p className="vis">{s.visual}</p>
                      {s.onScreenText ? <span className="ost">{s.onScreenText}</span> : null}
                      {kit.length ? (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {kit.map((k) => <span key={k} className="kitc">{k}</span>)}
                        </div>
                      ) : null}
                      {sources.length ? <span className="src">{t("script.from", { list: sources.join(" · ") })}</span> : null}
                    </div>
                    <div className="col">
                      <div className="colhd">
                        <span className="label" style={{ flex: 1 }}>{t("common.narration")}</span>
                        {changed ? (
                          <span className="chip warn" title={t("script.lessonChangedTitle")}>
                            {t("script.lessonChanged")}
                            <button onClick={(e) => { e.stopPropagation(); run("acknowledgeScene", { sceneId: s.id }); }} title={t("script.markSeen")} aria-label={t("script.markSeen")}><Icon name="check" size={13} /></button>
                          </span>
                        ) : null}
                        {!locked ? (
                          <span className="tools">
                            <button className="btn ghost icon sm" aria-label={t("script.editAria", { n: i + 1 })} title={t("common.editByHand")} onClick={(e) => { e.stopPropagation(); setEditing(s); }}><Icon name="edit" /></button>
                            <button className="btn ghost icon sm danger" aria-label={t("script.deleteAria", { n: i + 1 })} title={t("script.deleteTitle")} onClick={(e) => { e.stopPropagation(); run("deleteScene", { sceneId: s.id }); }}><Icon name="trash" /></button>
                          </span>
                        ) : null}
                      </div>
                      <p className="nar">{s.narration ? <Narration text={s.narration} cues={cues} /> : <span className="t3">{t("script.noNarration")}</span>}</p>
                    </div>
                  </>
                )}
              </article>
            );
          })}
        </div>
        {anyCues ? (
          <p className="t3" style={{ fontSize: 12.5, display: "flex", alignItems: "center", gap: 8 }}>
            <mark className="cue">{t("script.cueMark")}</mark> {t("script.cueHint")}
          </p>
        ) : null}
      </main>

      <ChatPanel
        messages={project.chats.script}
        model={model}
        live={job}
        liveBody={
          (job?.partial?.ops ?? []).length ? (
            <div className="livepreview">
              {(job!.partial.ops as { op?: string; sceneId?: string | null; title?: string | null; narration?: string | null }[]).filter(Boolean).map((o, i) => (
                <div key={i} className="it">
                  <b>{t(o.op === "delete" ? "script.op.delete" : o.op === "insert" ? "script.op.insert" : "script.op.update")} {o.title ?? scenes.find((s) => s.id === o.sceneId)?.title ?? "…"}</b>
                  {o.narration ? <p>{o.narration.slice(-240)}</p> : null}
                </div>
              ))}
            </div>
          ) : null
        }
        onStop={() => ai.stop("main")}
        disabled={locked ? t("script.lockedChat") : null}
        quick={QUICK.map((k) => t(k))}
        placeholder={sel ? t("script.askScene", { n: scenes.indexOf(sel) + 1 }) : t("script.ask")}
        scope={
          sel ? (
            <span className="chip acc">
              Scene {num(scenes.indexOf(sel))} · {sel.title}
              <button onClick={() => setSelected(null)} aria-label={t("script.unselect")}><Icon name="x" size={12} /></button>
            </span>
          ) : (
            <span className="chip">{t("script.whole")}</span>
          )
        }
        onSend={(text) => ai.start("main", { action: "scriptChat", text, sceneId: selected }, t("script.editJob"))}
        renderChange={(m) => (
          <div className="change">
            <div className="hd">
              <Icon name="list" />
              <span style={{ flex: 1, minWidth: 0 }}>{m.change?.label}</span>
              {m.change?.undo?.kind === "script" ? (
                <button className="btn sm ghost" onClick={() => run("restoreScript", { version: (m.change!.undo as { version: number }).version })} disabled={locked}>
                  <Icon name="undo" />
                  {t("common.undo")}
                </button>
              ) : null}
            </div>
          </div>
        )}
      />
      <Toast message={error} onClose={() => setError(null)} />
    </ProjectChrome>
  );
}
