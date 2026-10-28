"use client";
import { LectureVideo, missingCues, onSceneError, resolveAt, sceneFrames, SingleScene } from "@lecture/kit";
import { Player, Thumbnail, type PlayerRef } from "@remotion/player";
import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useProject } from "@/lib/client";
import { useAi } from "@/lib/stream";
import type { ChatMessage, Project, Settings } from "@/lib/types";
import { fmtShort, lectureLanguage } from "@/lib/util";
import { buildVideoInput, cueRefs, sceneStatus, type VideoSceneInput } from "@/lib/video";
import { ChatPanel } from "./ChatPanel";
import { useI18n } from "./I18n";
import { Icon } from "./Icon";
import { ProjectChrome } from "./ProjectChrome";
import { Toast } from "./Toast";
import { useVoicePreview } from "./useVoicePreview";

const AUTO_FIX_ATTEMPTS = 2;
const NL = String.fromCharCode(10);
const GEN_CONCURRENCY = 2;

const pad = (n: number) => String(n).padStart(2, "0");

/** mm:ss.s, or m:ss.s when short. */
function clock(sec: number, long = true): string {
  const m = Math.floor(sec / 60);
  const s = (sec % 60).toFixed(1).padStart(4, "0");
  return `${long ? pad(m) : m}:${s}`;
}

/** Cue strings used in a scene's code, resolved against its narration. */
function cuesOf(scene: VideoSceneInput) {
  return cueRefs(scene.code).map(({ raw, phrase }) => {
    missingCues.delete(phrase);
    const t = resolveAt(`cue:${raw}`, scene.timing);
    return { phrase, t, missing: missingCues.has(phrase) };
  });
}

export default function Studio({ initial, model, settings }: { initial: Project; model: string; settings: Settings }) {
  const { t } = useI18n();
  const { project, setProject, busy, error, setError, run } = useProject(initial);
  const ai = useAi(initial.id, setProject, setError);
  const projectRef = useRef(project);
  projectRef.current = project;
  const scenes = useMemo(() => project.script?.scenes ?? [], [project.script]);

  const input = useMemo(() => buildVideoInput(project, settings), [project, settings]);
  const fps = input.fps;
  const frames = input.scenes.map((s) => sceneFrames(s, fps));
  const starts = frames.reduce<number[]>((acc, f, i) => [...acc, i === 0 ? 0 : acc[i - 1] + frames[i - 1]], []);
  const total = Math.max(1, frames.reduce((a, b) => a + b, 0));

  const playerRef = useRef<PlayerRef>(null);
  // Open slightly after 0 so the first scene has faded in.
  const [startFrame] = useState(() => Math.min(total - 1, Math.round(fps * 1.2)));
  const [frame, setFrame] = useState(startFrame);
  const [playing, setPlaying] = useState(false);
  const [tab, setTab] = useState<"chat" | "code" | "props">("chat");
  const [safe, setSafe] = useState(false);
  const [quick, setQuick] = useState(false);
  const [menu, setMenu] = useState(false);
  // Send the paused frame (rendered on the server) along with Studio requests. Off by default.
  const [withFrame, setWithFrame] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  const handled = useRef(new Set<string>());
  const attempts = useRef(new Map<string, number>());
  const voice = useVoicePreview(useMemo(() => lectureLanguage(scenes.map((s) => s.narration).join(" ")), [scenes]));

  const sceneIndexAt = useCallback((f: number) => {
    let idx = 0;
    starts.forEach((s, i) => {
      if (f >= s) idx = i;
    });
    return idx;
  }, [starts]);

  const curIdx = sceneIndexAt(frame);
  const cur = scenes[curIdx];
  const curInput = input.scenes[curIdx];
  const localSec = cur ? (frame - starts[curIdx]) / fps : 0;
  const build = cur ? project.builds[cur.id] : undefined;

  /* Player events ------------------------------------------------------- */
  const lastSpoken = useRef(-1);
  const inputRef = useRef(input);
  inputRef.current = input;
  const startsRef = useRef(starts);
  startsRef.current = starts;

  useEffect(() => {
    const p = playerRef.current;
    if (!p) return;
    const speakAt = (f: number) => {
      const i = sceneIndexAt(f);
      lastSpoken.current = i;
      const sc = inputRef.current.scenes[i];
      if (sc) voice.speakFrom(sc.timing, (f - startsRef.current[i]) / fps);
    };
    const onFrame = (e: { detail: { frame: number } }) => {
      setFrame(e.detail.frame);
      if (p.isPlaying() && sceneIndexAt(e.detail.frame) !== lastSpoken.current) speakAt(e.detail.frame);
    };
    const onPlay = () => {
      setPlaying(true);
      speakAt(p.getCurrentFrame());
    };
    const onPause = () => {
      setPlaying(false);
      voice.stop();
    };
    const onSeeked = (e: { detail: { frame: number } }) => {
      setFrame(e.detail.frame);
      if (p.isPlaying()) speakAt(e.detail.frame);
    };
    p.addEventListener("frameupdate", onFrame);
    p.addEventListener("play", onPlay);
    p.addEventListener("pause", onPause);
    p.addEventListener("seeked", onSeeked);
    return () => {
      p.removeEventListener("frameupdate", onFrame);
      p.removeEventListener("play", onPlay);
      p.removeEventListener("pause", onPause);
      p.removeEventListener("seeked", onSeeked);
    };
  }, [sceneIndexAt, fps, voice]);

  const seek = (f: number) => {
    const clamped = Math.max(0, Math.min(total - 1, Math.round(f)));
    playerRef.current?.seekTo(clamped);
    setFrame(clamped);
  };

  /* Generation ---------------------------------------------------------- */
  // Scenes waiting for a generation slot.
  const [queued, setQueued] = useState<Set<string>>(new Set());
  const generate = useCallback(
    async (ids: string[]) => {
      const queue = [...ids];
      setQueued((q) => new Set([...q, ...ids]));
      const worker = async () => {
        while (queue.length) {
          const id = queue.shift()!;
          setQueued((q) => {
            const n = new Set(q);
            n.delete(id);
            return n;
          });
          await ai.start(id, { action: "generateScene", sceneId: id }, t("studio.genJob"));
        }
      };
      await Promise.all(Array.from({ length: Math.min(GEN_CONCURRENCY, ids.length) }, worker));
    },
    [ai.start, t],
  );

  const autoStarted = useRef(false);
  useEffect(() => {
    if (autoStarted.current) return;
    autoStarted.current = true;
    const missing = scenes.filter((s) => !project.builds[s.id]).map((s) => s.id);
    if (missing.length) generate(missing);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Error → auto-fix ---------------------------------------------------- */
  useEffect(
    () =>
      onSceneError(async (e) => {
        const b = projectRef.current.builds[e.sceneId];
        if (!b) return;
        const key = `${e.sceneId}:${b.version}`;
        if (handled.current.has(key)) return;
        handled.current.add(key);
        const n = attempts.current.get(e.sceneId) ?? 0;
        if (n < AUTO_FIX_ATTEMPTS) {
          attempts.current.set(e.sceneId, n + 1);
          await ai.start(e.sceneId, { action: "fixScene", sceneId: e.sceneId, error: e.message }, t("studio.fixJob"));
        } else {
          await run("reportError", { sceneId: e.sceneId, error: e.message }, "report");
        }
      }),
    [ai.start, run, t],
  );

  /* Derived ------------------------------------------------------------- */
  const statuses = scenes.map((s) => (ai.live[s.id] ? "gen" : queued.has(s.id) ? "queued" : sceneStatus(project, s)));
  const anyJob = Object.keys(ai.live).length > 0 || queued.size > 0;
  const curJob = cur ? (ai.live[cur.id] ?? null) : null;
  const outdated = scenes.filter((s, i) => statuses[i] === "outdated" || statuses[i] === "missing").map((s) => s.id);
  const blocking = statuses.filter((s) => s !== "ok" && s !== "outdated").length;
  const allCues = useMemo(() => input.scenes.map(cuesOf), [input]);
  const tickStep = total / fps > 240 ? 60 : total / fps > 90 ? 30 : 10;

  const [codeDraft, setCodeDraft] = useState("");
  useEffect(() => setCodeDraft(build?.code ?? ""), [build?.code, cur?.id]);
  const [durDraft, setDurDraft] = useState("");
  useEffect(() => setDurDraft(build?.durationOverride ? String(build.durationOverride) : ""), [build?.durationOverride, cur?.id]);

  const statusText = (st: string, i: number) => {
    const b = project.builds[scenes[i].id];
    const live = ai.live[scenes[i].id];
    switch (st) {
      case "gen": return live?.stage ?? (live?.partial ? t("studio.writingCode") : live?.label ?? t("studio.working"));
      case "queued": return t("studio.queued");
      case "missing": return t("studio.noCode");
      case "error": return t("studio.error");
      case "outdated": return t("studio.outdated");
      default: return t("studio.version", { n: b?.version ?? 0 });
    }
  };

  // Click a lane to scrub; keyboard activation on a clip jumps to its start.
  const scrub = (e: React.MouseEvent<HTMLElement>, lane: HTMLElement | null, fallback?: number) => {
    if (e.detail === 0 && fallback !== undefined) return seek(fallback);
    if (!lane) return;
    const r = lane.getBoundingClientRect();
    seek(((e.clientX - r.left) / r.width) * total);
  };

  const readyCount = statuses.filter((s) => s === "ok").length;
  const curCues = allCues[curIdx] ?? [];
  const missingCount = curCues.filter((c) => c.missing).length;
  const curStatus = statuses[curIdx];

  const actions = (
    <>
      <span className="status" style={{ gap: 8 }}>
        {anyJob ? <span className="spin" /> : null}
        {t("studio.ready", { ready: readyCount, total: scenes.length })}
      </span>
      {outdated.length ? (
        <button className="btn" onClick={() => generate(outdated)} disabled={anyJob}>
          <Icon name="refresh" />
          {t("studio.buildN", { n: outdated.length })}
        </button>
      ) : null}
      {blocking ? (
        <button className="btn pri" disabled title={t("studio.notReady")}>{t("studio.export")}<Icon name="arrow" /></button>
      ) : (
        <Link className="btn pri" href={`/projects/${project.id}/export`}>{t("studio.export")}<Icon name="arrow" /></Link>
      )}
    </>
  );

  const chatTabs = (
    <>
      <button role="tab" aria-selected={tab === "chat"} className={`tab ${tab === "chat" ? "on" : ""}`} onClick={() => setTab("chat")}>{t("common.assistant")}</button>
      <button role="tab" aria-selected={tab === "props"} className={`tab ${tab === "props" ? "on" : ""}`} onClick={() => setTab("props")}>{t("studio.tab.props")}</button>
      <button role="tab" aria-selected={tab === "code"} className={`tab ${tab === "code" ? "on" : ""}`} onClick={() => setTab("code")}>{t("studio.tab.code")}</button>
    </>
  );

  if (!scenes.length) {
    return (
      <ProjectChrome project={project} stage="studio">
        <div className="empty" style={{ flex: 1 }}>{t("studio.noScenes")}</div>
      </ProjectChrome>
    );
  }

  const sceneCard = cur ? (
    <section className="scenecard" aria-label={t("studio.current")}>
      <div className="row">
        <b>Scene {pad(curIdx + 1)} · {fmtShort(frames[curIdx] / fps)}</b>
        {build ? <span className={`tag ${curStatus === "error" ? "err" : curStatus === "outdated" ? "warn" : "ok"}`}>{t("studio.version", { n: build.version })}</span> : null}
      </div>
      <div className="checks">
        {curJob ? (
          <span className="check"><span className="spin" />{statusText("gen", curIdx)}</span>
        ) : !build ? (
          <span className="check warn"><Icon name="alert" />{queued.has(cur.id) ? t("studio.queued") : t("studio.noCode")}</span>
        ) : build.error ? (
          <span className="check err"><Icon name="alert" />{t("studio.runError")}</span>
        ) : (
          <span className="check"><Icon name="check" />{t("studio.codeRuns")}</span>
        )}
        {curStatus === "outdated" ? <span className="check warn"><Icon name="alert" />{t("studio.outdated")}</span> : build ? <span className="check"><Icon name="check" />{t("studio.matches")}</span> : null}
        {curCues.length ? (
          missingCount ? <span className="check warn"><Icon name="alert" />{t("studio.cuesMissing", { n: missingCount })}</span> : <span className="check"><Icon name="check" />{t("studio.cuesOk", { n: curCues.length })}</span>
        ) : null}
        {build?.durationOverride ? <span className="check"><Icon name="check" />{t("studio.manualDuration")}</span> : null}
      </div>
      {build?.error && !curJob ? (
        <div className="banner err" style={{ padding: "8px 10px", fontSize: 12.5 }}>
          <span className="mono" title={build.error} style={{ fontSize: 11.5, overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{build.error}</span>
          <button className="btn sm pri" onClick={() => ai.start(cur.id, { action: "fixScene", sceneId: cur.id, error: build.error! }, t("studio.fixJob"))}>{t("studio.autoFix")}</button>
        </div>
      ) : curStatus === "outdated" && !curJob ? (
        <div className="banner warn" style={{ padding: "8px 10px", fontSize: 12.5 }}>
          <span>{t("studio.outdatedBanner")}</span>
          <button className="btn sm pri" onClick={() => generate([cur.id])}>{t("studio.rebuild")}</button>
        </div>
      ) : null}
    </section>
  ) : null;

  const frac = frame / total;

  return (
    <ProjectChrome project={project} stage="studio" actions={actions}>
      <div className="studio">
        <section className="mon" aria-label={t("studio.previewAria")}>
          <div className="stagebar">
            {cur ? (
              <>
                <span className="k">{pad(curIdx + 1)}</span>
                <b title={cur.title}>{cur.title}</b>
                <span className={`ver ${curStatus === "error" ? "err" : curStatus === "outdated" || curStatus === "missing" ? "warn" : ""}`}>{statusText(curStatus, curIdx)}</span>
              </>
            ) : null}
            <span className="sp" />
            {cur && build ? (
              <button className="dbtn" onClick={() => ai.start(cur.id, { action: "reviewScene", sceneId: cur.id }, t("studio.reviewJob"))} disabled={Boolean(curJob)} title={t("studio.reviewTitle")}>
                <Icon name="search" />
                {t("studio.reviewJob")}
              </button>
            ) : null}
            <div ref={menuRef} style={{ position: "relative" }}>
              <button className={`dbtn ${menu ? "on" : ""}`} onClick={() => setMenu(!menu)} aria-expanded={menu} aria-haspopup="menu">
                <Icon name="safe" />
                {t("studio.overlays")}
                <Icon name="chev" size={14} />
              </button>
              {menu ? (
                <div className="menu" role="menu" style={{ right: 0, top: 38, width: 300 }}>
                  <label className="mi toggle">
                    <input type="checkbox" checked={safe} onChange={() => setSafe(!safe)} />
                    <span style={{ flex: 1 }}>{t("studio.safe")}</span>
                  </label>
                  <label className="mi toggle">
                    <input type="checkbox" checked={project.captions} onChange={() => run("setCaptions", { captions: !project.captions })} />
                    <span style={{ flex: 1 }}>{t("studio.captions")}<small className="t3" style={{ display: "block", fontSize: 12 }}>{t("studio.captionsNote")}</small></span>
                  </label>
                  {voice.supported ? (
                    <>
                      <div className="sep" />
                      <div style={{ padding: "6px 10px", display: "flex", flexDirection: "column", gap: 8 }}>
                        <span className="label">{t("studio.voice")}</span>
                        <select className="input" style={{ height: 32, padding: "0 8px", fontSize: 13 }} value={voice.voiceURI} onChange={(e) => voice.setVoiceURI(e.target.value)} aria-label={t("studio.voice")}>
                          {voice.voices.map((v) => (
                            <option key={v.voiceURI} value={v.voiceURI}>{v.name}</option>
                          ))}
                        </select>
                        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                          {t("studio.rate")}
                          <input type="range" min={0.7} max={1.6} step={0.05} value={voice.rate} onChange={(e) => voice.setRate(Number(e.target.value))} style={{ flex: 1 }} />
                          <span className="mono">{voice.rate.toFixed(2)}×</span>
                        </label>
                        <span className="t3" style={{ fontSize: 12 }}>{t("studio.voiceNote")}</span>
                      </div>
                    </>
                  ) : null}
                </div>
              ) : null}
            </div>
            <span className="res">1920×1080 · {fps} fps</span>
          </div>

          <div className="screen">
            <div className="frame-wrap">
              <div className="frame">
                <Player
                  ref={playerRef}
                  component={LectureVideo}
                  inputProps={input}
                  durationInFrames={total}
                  fps={fps}
                  compositionWidth={1920}
                  compositionHeight={1080}
                  initialFrame={startFrame}
                  style={{ width: "100%", height: "100%" }}
                  clickToPlay
                  spaceKeyToPlayOrPause
                  acknowledgeRemotionLicense
                />
                {safe ? (<><div className="safe" /><div className="safe t" /></>) : null}
              </div>
            </div>
          </div>

          <div className="transport">
            <span className="tc">{clock(frame / fps)} <small>/ {clock(total / fps)}</small></span>
            <div className="mid">
              <button className="dbtn icon" aria-label={t("studio.sceneStart")} title={t("studio.sceneStartTitle")} onClick={() => seek(starts[Math.max(0, curIdx - (localSec < 0.5 ? 1 : 0))])}><Icon name="prev" /></button>
              <button className="playb" aria-label={playing ? t("studio.pause") : t("studio.play")} onClick={() => playerRef.current?.toggle()}><Icon name={playing ? "pause" : "play"} /></button>
              <button className="dbtn icon" aria-label={t("studio.nextScene")} title={t("studio.nextScene")} onClick={() => seek(starts[Math.min(scenes.length - 1, curIdx + 1)])}><Icon name="next" /></button>
            </div>
            <div className="end">
              {voice.supported ? (
                <button className={`dbtn ${voice.enabled ? "on" : ""}`} onClick={() => voice.setEnabled(!voice.enabled)} aria-pressed={voice.enabled} title={t("studio.readAloudTitle")}>
                  <Icon name="speaker" />
                  {t("studio.readAloud")}
                </button>
              ) : null}
              <button className="dbtn icon" aria-label={t("studio.fullscreen")} title={t("studio.fullscreen")} onClick={() => playerRef.current?.requestFullscreen()}><Icon name="expand" /></button>
            </div>
          </div>

          <section className="tl" aria-label="Timeline">
            <span />
            <div className="lane ruler" onClick={(e) => scrub(e, e.currentTarget)}>
              {cur ? <span className="band" style={{ left: `${(starts[curIdx] / total) * 100}%`, width: `${(frames[curIdx] / total) * 100}%` }} /> : null}
              {Array.from({ length: Math.floor(total / fps / tickStep) + 1 }, (_, k) => k * tickStep).map((t) => (
                <span key={t} style={{ left: `${((t * fps) / total) * 100}%` }}>{fmtShort(t)}</span>
              ))}
            </div>

            <span className="lab">Scene</span>
            <div className="lane clips" onClick={(e) => scrub(e, e.currentTarget)}>
              {input.scenes.map((s, i) => (
                <button
                  key={s.id}
                  className={`clipb ${statuses[i]} ${i === curIdx ? "on" : ""}`}
                  style={{ left: `calc(${(starts[i] / total) * 100}% + 1.5px)`, width: `calc(${(frames[i] / total) * 100}% - 3px)` }}
                  onClick={(e) => {
                    e.stopPropagation();
                    scrub(e, e.currentTarget.parentElement, starts[i]);
                  }}
                  title={`${s.title} · ${statusText(statuses[i], i)} · ${fmtShort(frames[i] / fps)}`}
                  aria-label={`Scene ${i + 1}: ${s.title}, ${statusText(statuses[i], i)}`}
                >
                  <span className="nm"><span>{pad(i + 1)}</span><span>{s.title}</span></span>
                  <span className="st">{statusText(statuses[i], i)}</span>
                </button>
              ))}
            </div>

            <span className="lab">Cue</span>
            <div className="lane cues" onClick={(e) => scrub(e, e.currentTarget)}>
              {(() => {
                // Labels for the current scene (and missing cues) on two rows; a label is dropped
                // when both rows are still taken at its position. Width is a rough per-character guess.
                const rowEnd = [-1, -1];
                const laneW = 900;
                return allCues.flatMap((cues, i) => [...cues].sort((a, b) => a.t - b.t).map((c, k) => {
                  const pos = (starts[i] + c.t * fps) / total;
                  const r = i === curIdx || c.missing ? rowEnd.findIndex((end) => pos >= end) : -1;
                  if (r >= 0) rowEnd[r] = pos + (c.phrase.length * 6.2 + 22) / laneW;
                  const label = r >= 0;
                  const top = label ? (r ? 22 : 5) : 15;
                  return (
                    <span
                      key={`${i}-${k}`}
                      className={`cuem ${i === curIdx ? "cur" : ""} ${c.missing ? "miss" : ""}`}
                      style={{ left: `${pos * 100}%`, top }}
                      title={c.missing ? t("studio.cueMissingTitle", { p: c.phrase }) : `cue “${c.phrase}” · ${c.t.toFixed(1)}s`}
                    >
                      {label ? c.phrase : null}
                    </span>
                  );
                }));
              })()}
            </div>
            <span className="playhead" style={{ left: `calc(90px + (100% - 106px) * ${frac})` }}>
              <span>{clock(frame / fps, false)}</span>
            </span>
          </section>
        </section>

        <ChatPanel
          tabs={chatTabs}
          header={sceneCard}
          messages={project.chats.studio}
          model={`${quick ? t("studio.modeQuickShort") : t("studio.modeDeepShort")} · ${model}`}
          live={curJob}
          onStop={() => cur && ai.stop(cur.id)}
          disabled={!cur ? t("studio.selectScene") : queued.has(cur.id) ? t("studio.waitingCreate") : null}
          quick={[t("studio.quick1"), t("studio.quick2"), t("studio.quick3"), t("studio.quick4")]}
          placeholder={playing ? t("studio.askPlaying") : t("studio.askPaused")}
          scope={
            cur ? (
              <>
                <span className="chip acc">Scene {pad(curIdx + 1)}{!playing ? t("studio.atTime", { t: localSec.toFixed(1) }) : ""}</span>
                <span className="sp" />
                <div className="segc sm" role="group" aria-label={t("studio.modeGroup")}>
                  <button className={!quick ? "on" : ""} onClick={() => setQuick(false)} title={t("studio.deepTitle")}>{t("studio.deep")}</button>
                  <button className={quick ? "on" : ""} onClick={() => setQuick(true)} title={t("studio.fastTitle")}>{t("studio.fast")}</button>
                </div>
              </>
            ) : null
          }
          attach={4}
          extraThumb={
            withFrame && cur && build && curInput && !playing ? (
              <span className="thumbi frame" title={t("studio.frameSent", { t: localSec.toFixed(1) })}>
                <Thumbnail
                  component={SingleScene}
                  inputProps={{ scene: curInput, captions: project.captions }}
                  compositionWidth={1920}
                  compositionHeight={1080}
                  durationInFrames={frames[curIdx]}
                  fps={fps}
                  frameToDisplay={Math.max(0, Math.min(frames[curIdx] - 1, Math.round(localSec * fps)))}
                  style={{ width: "100%", height: "100%" }}
                />
                <span className="lbl">{localSec.toFixed(1)}s</span>
                <button onClick={() => setWithFrame(false)} aria-label={t("studio.noFrame")}><Icon name="x" size={11} /></button>
              </span>
            ) : null
          }
          composerTools={
            cur && build && !playing ? (
              <button
                className={`ftoggle ${withFrame ? "on" : ""}`}
                onClick={() => setWithFrame(!withFrame)}
                aria-pressed={withFrame}
                title={t("studio.withFrameTitle")}
              >
                <Icon name="image" size={14} />
                {t("studio.withFrame")}
              </button>
            ) : null
          }
          onSend={(text, images) =>
            cur &&
            ai.start(
              cur.id,
              { action: "studioChat", sceneId: cur.id, text, atSeconds: playing ? null : localSec, quick, withFrame: withFrame && !playing && Boolean(build), images },
              t("studio.editJob"),
            )
          }
          renderChange={(m: ChatMessage) => (
            <div className="change">
              <div className="hd">
                <Icon name="code" />
                <span style={{ flex: 1, minWidth: 0 }}>{m.change?.label}</span>
                {m.change?.undo?.kind === "code" ? (
                  <button className="btn sm ghost" onClick={() => run("restoreCode", { sceneId: (m.change!.undo as { sceneId: string }).sceneId, version: (m.change!.undo as { version: number }).version })}>
                    <Icon name="undo" />
                    {t("common.undo")}
                  </button>
                ) : null}
              </div>
            </div>
          )}
        >
          {tab === "code" ? (
            <div className="code-area">
              {typeof curJob?.partial?.code === "string" ? (
                <>
                  <pre className="codelive" ref={(el) => el?.scrollTo({ top: el.scrollHeight })}>{curJob.partial.code}</pre>
                  <div className="bar">
                    <span className="spin" />
                    <span className="t3" style={{ fontSize: 12.5 }}>{t("studio.writingLines", { n: curJob.partial.code.split(NL).length })}</span>
                  </div>
                </>
              ) : build ? (
                <>
                  <textarea value={codeDraft} onChange={(e) => setCodeDraft(e.target.value)} spellCheck={false} aria-label={t("studio.codeAria")} />
                  <div className="bar">
                    <span className="t3 mono" style={{ fontSize: 11.5 }}>{t("studio.fileVersion", { n: pad(curIdx + 1), v: build.version })}</span>
                    <span className="sp" />
                    <button className="btn sm ghost" onClick={() => setCodeDraft(build.code)} disabled={codeDraft === build.code}>{t("studio.discard")}</button>
                    <button className="btn sm pri" onClick={() => run("saveCode", { sceneId: cur!.id, code: codeDraft })} disabled={codeDraft === build.code || !!busy}>{t("studio.saveNew")}</button>
                  </div>
                </>
              ) : (
                <div className="empty">{t("studio.noCodeYet")}</div>
              )}
            </div>
          ) : tab === "props" && cur ? (
            <div className="props-pane">
              <div>
                <div className="label" style={{ marginBottom: 8 }}>{t("studio.duration")}</div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input className="input mono" style={{ width: 90 }} value={durDraft} placeholder={curInput ? curInput.timing.duration.toFixed(1) : ""} onChange={(e) => setDurDraft(e.target.value)} aria-label={t("studio.durationAria")} disabled={!build} />
                  <span className="t3">{t("common.seconds")}</span>
                  <button className="btn sm" disabled={!build} onClick={() => run("setDuration", { sceneId: cur.id, seconds: durDraft ? Number(durDraft) : null })}>{t("studio.apply")}</button>
                </div>
                <p className="t3" style={{ fontSize: 12.5, marginTop: 6 }}>{t("studio.durationHint", { n: settings.syllablesPerSecond })}</p>
              </div>
              <div>
                <div className="label" style={{ marginBottom: 8 }}>{t("studio.cues")}</div>
                {curCues.length ? (
                  curCues.map((c) => (
                    <div key={c.phrase} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0" }}>
                      <span style={{ color: c.missing ? "var(--err)" : undefined }}>“{c.phrase}”{c.missing ? t("studio.cueNotFound") : ""}</span>
                      <button className="mono t2" onClick={() => seek(starts[curIdx] + c.t * fps)}>{c.t.toFixed(1)}s</button>
                    </div>
                  ))
                ) : (
                  <span className="t3" style={{ fontSize: 12.5 }}>{t("studio.noCues")}</span>
                )}
              </div>
              <div>
                <div className="label" style={{ marginBottom: 8 }}>{t("common.narration")}</div>
                <p style={{ fontSize: 13, color: "var(--text-2)" }}>{cur.narration}</p>
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
                  <span className="label">{t("studio.versions")}</span>
                  <span className="sp" />
                  <button className="btn sm" onClick={() => generate([cur.id])} disabled={Boolean(curJob)}>
                    <Icon name="wand" />
                    {t("studio.regen")}
                  </button>
                </div>
                <div className="vlist">
                  {[...(build?.history ?? [])].reverse().map((h) => (
                    <div key={h.version} className="row">
                      <span className="mono">b{h.version}</span>
                      <span className="note" title={h.note}>{h.note}</span>
                      {h.version === build?.version ? <span className="tag ok">{t("studio.currentTag")}</span> : <button className="btn sm ghost" onClick={() => run("restoreCode", { sceneId: cur.id, version: h.version })}>{t("studio.reuse")}</button>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : undefined}
        </ChatPanel>
      </div>
      <Toast message={error} onClose={() => setError(null)} />
    </ProjectChrome>
  );
}
