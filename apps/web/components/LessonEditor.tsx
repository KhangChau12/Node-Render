"use client";
import { estimateTiming } from "@lecture/kit/timing";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import { useProject } from "@/lib/client";
import { useAi, useElapsed, type Live } from "@/lib/stream";
import type { Brief, Project, Section, Settings, Suggestion } from "@/lib/types";
import { useI18n } from "./I18n";
import { fmtShort, targetSeconds } from "@/lib/util";
import { ChatPanel } from "./ChatPanel";
import { diffStats, WordDiff } from "./Diff";
import { HistoryMenu } from "./HistoryMenu";
import { Icon } from "./Icon";
import { ProjectChrome, Saved } from "./ProjectChrome";
import { Prose } from "./Prose";
import { Toast } from "./Toast";

type PartialLesson = { title?: string; brief?: Partial<Brief>; sections?: { title?: string; body?: string }[] };

const QUICK = ["lesson.quick1", "lesson.quick2", "lesson.quick3", "lesson.quick4"] as const;
const num = (i: number) => String(i + 1).padStart(2, "0");

/** Banner shown while the model writes into the document. */
function DraftingBar({ live, onStop }: { live: Live; onStop: () => void }) {
  const { t } = useI18n();
  const secs = useElapsed(live.startedAt);
  const tail = live.thinking.replace(/\s+/g, " ").slice(-140);
  return (
    <div className="drafting">
      <span className="spin" />
      <b style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{live.partial ? t("lesson.writingLesson") : live.thinking ? t("common.thinking") : t("common.waitingModel")}</b>
      <span className="mono t3">{secs}s</span>
      <span className="tx">{live.partial ? "" : tail}</span>
      <button className="btn sm" onClick={onStop}>{t("common.stop")}</button>
    </div>
  );
}

function BriefCard({ brief }: { brief: Partial<Brief> }) {
  const { t } = useI18n();
  return (
    <div className="briefcard">
      <h3>{t("lesson.brief")}</h3>
      <dl>
        <dt>{t("lesson.audience")}</dt><dd>{brief.audience ?? "…"}</dd>
        <dt>{t("lesson.duration")}</dt><dd>{brief.duration ?? "…"}</dd>
        <dt>{t("lesson.voice")}</dt><dd>{brief.voice ?? "…"}</dd>
        <dt>{t("lesson.style")}</dt><dd>{brief.style ?? "…"}</dd>
      </dl>
    </div>
  );
}

function Meter({ total, target }: { total: number; target: number | null }) {
  const { t } = useI18n();
  return (
    <div className="meter">
      <div className="row">
        <span>{t("lesson.estimated")} <b>{fmtShort(total)}</b></span>
        {target ? <span>{t("lesson.target", { t: fmtShort(target) })}</span> : null}
      </div>
      {target ? (
        <div className="trk"><i className={total > target * 1.15 ? "over" : ""} style={{ width: `${Math.min(100, (total / target) * 100)}%` }} /></div>
      ) : null}
    </div>
  );
}

export function LessonEditor({ initial, model, settings }: { initial: Project; model: string; settings: Settings }) {
  const { t } = useI18n();
  const router = useRouter();
  const { project, setProject, busy, error, setError, run } = useProject(initial);
  const ai = useAi(project.id, setProject, setError);
  const job = ai.live.main ?? null;
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<Section | null>(null);
  const [failed, setFailed] = useState(false);
  const lesson = project.lesson;
  const locked = project.lessonLocked;
  const working = Boolean(busy) || Boolean(job);
  const secs = (body: string) => estimateTiming(body.replace(/\$+/g, " "), { syllablesPerSecond: settings.syllablesPerSecond }).duration;
  const durations = useMemo(
    () => Object.fromEntries((lesson?.sections ?? []).map((s) => [s.id, secs(s.body)])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lesson, settings.syllablesPerSecond],
  );

  const draft = async () => {
    setFailed(false);
    const p = await ai.start("main", { action: "draftLesson" }, t("lesson.draftJob"));
    if (!p?.lesson) setFailed(true);
  };

  // A new project arrives without a lesson: draft it right here, streamed into the page.
  useEffect(() => {
    if (!initial.lesson) void draft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!lesson) {
    const pl = (job?.partial ?? {}) as PartialLesson;
    const sections = (pl.sections ?? []).filter((s) => s && (s.title || s.body));
    return (
      <ProjectChrome project={project} stage="lesson">
        <aside className="outline" aria-label={t("lesson.outline")}>
          <div className="hd"><h2>{sections.length ? t("lesson.outlineCount", { n: sections.length }) : t("lesson.outline")}</h2></div>
          <div className="list">
            {sections.map((s, i) => (
              <div key={i} className="oi">
                <span className="k">{num(i)}</span>
                <span className="t">{s.title}</span>
              </div>
            ))}
          </div>
          {pl.brief ? <BriefCard brief={pl.brief} /> : null}
        </aside>
        <main className="desk">
          {job ? <DraftingBar live={job} onStop={() => ai.stop("main")} /> : null}
          {!job && failed ? (
            <div className="banner err">
              <Icon name="alert" />
              <span>{t("lesson.draftFailed")}</span>
              <button className="btn sm pri" onClick={draft}>{t("lesson.redraft")}</button>
            </div>
          ) : null}
          <article className="paper">
            <p className="t3" style={{ fontSize: 13, marginBottom: 14 }}>“{project.prompt}”</p>
            {pl.title ? <h1>{pl.title}</h1> : <div className="skel" style={{ height: 30, width: "60%" }} />}
            <div className="secs">
              {sections.map((s, i) => (
                <section key={i} className={`sec ${i === sections.length - 1 && job ? "writing" : ""}`}>
                  <h2><span className="k">{num(i)}</span>{s.title}</h2>
                  {s.body ? <Prose body={s.body} /> : null}
                </section>
              ))}
            </div>
            {job ? (
              <>
                <div className="skel" style={{ width: "92%" }} />
                <div className="skel" style={{ width: "70%" }} />
              </>
            ) : null}
          </article>
        </main>
        <ChatPanel
          messages={project.chats.lesson}
          model={model}
          live={job}
          onStop={() => ai.stop("main")}
          disabled={t("lesson.waitDraft")}
          placeholder=""
          scope={<span className="chip">{t("lesson.whole")}</span>}
          onSend={() => {}}
        />
        <Toast message={error} onClose={() => setError(null)} />
      </ProjectChrome>
    );
  }

  const sugFor = (id: string) => project.suggestions.find((s) => s.sectionId === id);
  const inserts = (afterId: string | null) => project.suggestions.filter((s) => s.op === "insert" && s.afterSectionId === afterId);
  const total = lesson.sections.reduce((n, s) => n + (durations[s.id] ?? 0), 0);
  const target = targetSeconds(lesson.brief.duration);
  const selSection = lesson.sections.find((s) => s.id === selected);
  const pending = project.suggestions.length;

  const lock = async () => {
    const p = await run("lockLesson", {}, "lock");
    if (p) router.push(`/projects/${p.id}/script`);
  };

  const suggestionBar = (s: Suggestion) => (
    <div className="sugbar">
      <span className="who"><Icon name="chat" size={15} />{t("lesson.suggests")}</span>
      <span className="t2" title={s.instruction}>“{s.instruction}”</span>
      <button className="btn sm" onClick={() => run("rejectSuggestions", { ids: [s.id] })} disabled={working}>{t("common.reject")}</button>
      <button className="btn sm pri" onClick={() => run("acceptSuggestions", { ids: [s.id] })} disabled={working}>
        <Icon name="check" />
        {t("common.accept")}
      </button>
    </div>
  );

  const renderInsert = (s: Suggestion) => (
    <section key={s.id} className="sec sel">
      <h2><span className="k">{t("lesson.newTag")}</span><ins>{s.after?.title}</ins></h2>
      <div className="diffbody"><ins>{s.after?.body}</ins></div>
      {suggestionBar(s)}
    </section>
  );

  // Sections being rewritten right now, shown inside the live card.
  const ops = ((job?.partial?.ops ?? []) as { op?: string; sectionId?: string | null; title?: string | null; body?: string | null }[]).filter(Boolean);
  const liveBody = ops.length ? (
    <div className="livepreview">
      {ops.map((o, i) => {
        const sec = lesson.sections.find((s) => s.id === o.sectionId);
        const head = o.op === "delete" ? t("lesson.op.delete", { t: sec?.title ?? "" }) : o.op === "insert" ? t("lesson.op.insert", { t: o.title ?? "…" }) : t("lesson.op.update", { t: o.title ?? sec?.title ?? "…" });
        return (
          <div key={i} className="it">
            <b>{head}</b>
            {o.body ? <p>{o.body.slice(-280)}</p> : null}
          </div>
        );
      })}
    </div>
  ) : null;

  const actions = (
    <>
      <HistoryMenu items={project.lessonHistory} current={project.lessonVersion} onRestore={(v) => run("restoreLesson", { version: v })} disabled={locked || working} />
      {locked ? (
        <Link className="btn pri" href={`/projects/${project.id}/script`}>
          {t("lesson.toScript")}
          <Icon name="arrow" />
        </Link>
      ) : (
        <button className="btn pri" onClick={lock} disabled={working || pending > 0} title={pending ? t("lesson.lockPending") : t("lesson.lockTitle")}>
          {busy === "lock" ? <span className="spin" /> : null}
          {t("lesson.lock")}
          <Icon name="arrow" />
        </button>
      )}
    </>
  );

  return (
    <ProjectChrome project={project} stage="lesson" actions={actions} status={<Saved text={t("common.savedVersion", { n: project.lessonVersion })} />}>
      <aside className="outline" aria-label={t("lesson.outline")}>
        <div className="hd">
          <h2>{t("lesson.outlineCount", { n: lesson.sections.length })}</h2>
          {!locked ? (
            <button className="btn ghost icon sm" aria-label={t("lesson.addEnd")} title={t("lesson.addEnd")} onClick={() => run("addSection", { afterSectionId: null })} disabled={working}>
              <Icon name="plus" />
            </button>
          ) : null}
        </div>
        <div className="list">
          {lesson.sections.map((s, i) => (
            <button
              key={s.id}
              className={`oi ${selected === s.id ? "on" : ""}`}
              aria-pressed={selected === s.id}
              onClick={() => {
                setSelected(selected === s.id ? null : s.id);
                document.getElementById(`sec-${s.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              <span className="k">{num(i)}</span>
              <span className="t">
                <span style={{ fontWeight: selected === s.id ? 600 : 400 }}>{s.title}</span>
                {sugFor(s.id) ? <span className="sug">{t("lesson.pendingSug")}</span> : null}
              </span>
              <span className="w">{fmtShort(durations[s.id] ?? 0)}</span>
            </button>
          ))}
          <Meter total={total} target={target} />
        </div>
        <BriefCard brief={lesson.brief} />
      </aside>

      <main className="desk">
        {locked ? (
          <div className="banner ok">
            <Icon name="check" />
            <span>{t("lesson.approved", { n: project.lessonVersion })}</span>
            <button className="btn sm" onClick={() => run("unlockLesson")} disabled={working}>
              <Icon name="edit" />
              {t("common.editAgain")}
            </button>
          </div>
        ) : pending ? (
          <div className="banner warn" role="status">
            <i className="dot" />
            <span><b style={{ fontWeight: 600 }}>{t("lesson.pendingCount", { n: pending })}</b> {t("lesson.pendingTail")}</span>
            {pending > 1 ? (
              <>
                <button className="btn sm" onClick={() => run("rejectSuggestions", { ids: project.suggestions.map((s) => s.id) })} disabled={working}>{t("lesson.rejectAll")}</button>
                <button className="btn sm pri" onClick={() => run("acceptSuggestions", { ids: project.suggestions.map((s) => s.id) })} disabled={working}>{t("lesson.acceptAll")}</button>
              </>
            ) : null}
          </div>
        ) : project.lessonVersion <= 1 && !job && project.chats.lesson.filter((m) => m.role === "user").length <= 1 ? (
          <div className="banner acc">
            <Icon name="chat" style={{ color: "var(--accent)" }} />
            <span>{t("lesson.intro")}</span>
          </div>
        ) : null}
        <article className="paper">
          <h1>{lesson.title}</h1>
          <p className="sub">{t("lesson.sub", { n: lesson.sections.length, t: fmtShort(total) })}</p>
          <div className="secs">
            {inserts(null).map(renderInsert)}
            {lesson.sections.map((s, i) => {
              const sug = sugFor(s.id);
              const isEditing = editing?.id === s.id;
              return (
                <React.Fragment key={s.id}>
                  <section id={`sec-${s.id}`} className={`sec ${selected === s.id ? "sel" : ""}`} onClick={() => !isEditing && setSelected(s.id)}>
                    {isEditing && editing ? (
                      <div className="edit-box">
                        <input className="input" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} aria-label={t("lesson.sectionTitle")} />
                        <textarea className="textarea" value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })} aria-label={t("lesson.sectionBody")} rows={10} />
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                          <span className="t3" style={{ fontSize: 12.5 }}>{t("lesson.formatHint")}</span>
                          <span className="sp" />
                          <button className="btn sm" onClick={() => setEditing(null)}>{t("common.cancel")}</button>
                          <button
                            className="btn sm pri"
                            onClick={async () => {
                              if (await run("saveSection", { section: editing })) setEditing(null);
                            }}
                          >
                            {t("common.save")}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <h2>
                          <span className="k">{num(i)}</span>
                          {sug?.op === "update" && sug.after && sug.after.title !== s.title ? (
                            <span><del>{s.title}</del> <ins>{sug.after.title}</ins></span>
                          ) : sug?.op === "delete" ? (
                            <del>{s.title}</del>
                          ) : (
                            s.title
                          )}
                        </h2>
                        {!locked && !sug ? (
                          <div className="tools">
                            <button className="btn ghost icon sm" title={t("common.editByHand")} aria-label={t("lesson.editAria", { n: i + 1 })} onClick={(e) => { e.stopPropagation(); setEditing(s); }}>
                              <Icon name="edit" />
                            </button>
                            <button className="btn ghost icon sm" title={t("lesson.addAfter")} aria-label={t("lesson.addAfter")} onClick={(e) => { e.stopPropagation(); run("addSection", { afterSectionId: s.id }); }}>
                              <Icon name="plus" />
                            </button>
                            <button className="btn ghost icon sm danger" title={t("lesson.deleteSection")} aria-label={t("lesson.deleteAria", { n: i + 1 })} onClick={(e) => { e.stopPropagation(); run("deleteSection", { sectionId: s.id }); }}>
                              <Icon name="trash" />
                            </button>
                          </div>
                        ) : null}
                        {sug?.op === "update" && sug.after ? (
                          <WordDiff before={s.body} after={sug.after.body} />
                        ) : sug?.op === "delete" ? (
                          <div className="diffbody"><del>{s.body}</del></div>
                        ) : s.body.trim() ? (
                          <Prose body={s.body} />
                        ) : (
                          <p className="t3">{t("lesson.emptySection")}</p>
                        )}
                        {sug ? suggestionBar(sug) : null}
                      </>
                    )}
                  </section>
                  {inserts(s.id).map(renderInsert)}
                </React.Fragment>
              );
            })}
          </div>
        </article>
      </main>

      <ChatPanel
        messages={project.chats.lesson}
        model={model}
        live={job}
        liveBody={liveBody}
        onStop={() => ai.stop("main")}
        disabled={locked ? t("lesson.lockedChat") : null}
        quick={QUICK.map((k) => t(k))}
        placeholder={selSection ? t("lesson.askSection", { n: lesson.sections.indexOf(selSection) + 1 }) : t("lesson.ask")}
        scope={
          selSection ? (
            <span className="chip acc">
              {t("lesson.scopeSection", { n: lesson.sections.indexOf(selSection) + 1, title: selSection.title })}
              <button onClick={() => setSelected(null)} aria-label={t("lesson.unselect")}><Icon name="x" size={12} /></button>
            </span>
          ) : (
            <span className="chip">{t("lesson.whole")}</span>
          )
        }
        onSend={(text) => ai.start("main", { action: "lessonChat", text, sectionId: selected }, t("lesson.editJob"))}
        renderChange={(m) => {
          const ids = (m.change?.suggestionIds ?? []).filter((id) => project.suggestions.some((s) => s.id === id));
          const sugs = project.suggestions.filter((s) => ids.includes(s.id));
          const stats = sugs.reduce(
            (acc, s) => {
              const d = diffStats(s.before ? `${s.before.title} ${s.before.body}` : "", s.after ? `${s.after.title} ${s.after.body}` : "");
              return { plus: acc.plus + d.plus, minus: acc.minus + d.minus };
            },
            { plus: 0, minus: 0 },
          );
          return (
            <div className="change">
              <div className="hd">
                <span className={`tag ${ids.length ? "warn" : "ok"}`}>{ids.length ? t("lesson.awaiting") : t("lesson.handled")}</span>
                <span style={{ flex: 1, minWidth: 0 }}>{m.change?.label}</span>
                {ids.length ? (
                  <span className="mono" style={{ fontSize: 11.5 }}>
                    <span style={{ color: "var(--ok)" }}>+{stats.plus}</span> <span style={{ color: "var(--err)" }}>−{stats.minus}</span> {t("lesson.words")}
                  </span>
                ) : null}
              </div>
              {ids.length ? (
                <div className="ft">
                  <button className="btn sm" onClick={() => run("rejectSuggestions", { ids })} disabled={working}>{t("common.reject")}</button>
                  <button className="btn sm pri" onClick={() => run("acceptSuggestions", { ids })} disabled={working}>{t("common.accept")}</button>
                </div>
              ) : null}
            </div>
          );
        }}
      />
      <Toast message={error} onClose={() => setError(null)} />
    </ProjectChrome>
  );
}
