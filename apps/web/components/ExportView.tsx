"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { postJson } from "@/lib/client";
import type { Project, RenderJob, RenderSettings } from "@/lib/types";
import { dateLocale, type Locale, type MessageKey } from "@/lib/i18n";
import { fmtShort } from "@/lib/util";
import { useI18n } from "./I18n";
import { Icon } from "./Icon";
import { ProjectChrome } from "./ProjectChrome";
import { Toast } from "./Toast";

const ACTIVE = new Set(["queued", "bundling", "rendering"]);
const statusKey = (s: RenderJob["status"]) => `export.status.${s}` as MessageKey;

type Preset = { key: "draft" | "std" | "hq"; s: Pick<RenderSettings, "height" | "fps" | "crf"> };
const PRESETS: Preset[] = [
  { key: "draft", s: { height: 720, fps: 30, crf: 23 } },
  { key: "std", s: { height: 1080, fps: 30, crf: 18 } },
  { key: "hq", s: { height: 1080, fps: 60, crf: 18 } },
];

const when = (iso: string, locale: Locale) => new Date(iso).toLocaleString(dateLocale(locale), { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });

export function ExportView({ project, durationSec, blocking }: { project: Project; durationSec: number; blocking: number }) {
  const { t, locale } = useI18n();
  const [jobs, setJobs] = useState<RenderJob[]>(project.renders);
  const [settings, setSettings] = useState<RenderSettings>({ height: 1080, fps: 30, captions: project.captions, crf: 18 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const url = `/api/projects/${project.id}/render`;
  const sceneCount = project.script?.scenes.length ?? 0;
  const preset = PRESETS.find((p) => p.s.height === settings.height && p.s.fps === settings.fps && p.s.crf === settings.crf);

  const refresh = useCallback(async () => {
    const res = await fetch(url, { cache: "no-store" });
    if (res.ok) setJobs(await res.json());
  }, [url]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const active = jobs.some((j) => ACTIVE.has(j.status));
  useEffect(() => {
    if (!active) return;
    const t = setInterval(refresh, 1000);
    return () => clearInterval(t);
  }, [active, refresh]);

  const act = async (body: unknown) => {
    setBusy(true);
    setError(null);
    try {
      setJobs(await postJson<RenderJob[]>(url, body));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const seg = <K extends keyof RenderSettings>(key: K, options: [RenderSettings[K], string][]) => (
    <div className="segc">
      {options.map(([v, label]) => (
        <button key={String(v)} className={settings[key] === v ? "on" : ""} onClick={() => setSettings({ ...settings, [key]: v })}>
          {label}
        </button>
      ))}
    </div>
  );

  const ordered = [...jobs].reverse();

  return (
    <ProjectChrome
      project={project}
      stage="export"
      actions={
        <Link className="btn ghost sm" href={`/projects/${project.id}/studio`}>
          <Icon name="back" />
          {t("export.back")}
        </Link>
      }
    >
      <main className="exp">
        <div className="exp-in">
          <section className="left" aria-labelledby="exp-h">
            <div>
              <h1 id="exp-h">{t("export.title")}</h1>
              <p className="t2" style={{ marginTop: 4 }}>{t("export.lead")}</p>
            </div>

            <div className="card checklist">
              <div>
                <span className={`ic ${blocking ? "warn" : ""}`}><Icon name={blocking ? "alert" : "check"} /></span>
                <span style={{ flex: 1 }}>{blocking ? t("export.blocking", { n: blocking }) : t("export.allBuilt", { n: sceneCount })}</span>
                {blocking ? (
                  <Link className="btn sm" href={`/projects/${project.id}/studio`}>{t("export.back")}</Link>
                ) : (
                  <span className="mono t3" style={{ fontSize: 12.5 }}>{fmtShort(durationSec)} · {t("script.count", { n: sceneCount })}</span>
                )}
              </div>
              <div>
                <span className="ic info"><b style={{ fontSize: 13 }}>i</b></span>
                <span style={{ flex: 1 }}>{t("export.noVoice")}</span>
              </div>
            </div>

            <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
              <legend style={{ fontWeight: 600, marginBottom: 10, padding: 0 }}>{t("export.quality")}</legend>
              <div className="presets">
                {PRESETS.map((p) => (
                  <label key={p.key} className={`preset ${preset?.key === p.key ? "on" : ""}`}>
                    <input type="radio" name="preset" checked={preset?.key === p.key} onChange={() => setSettings({ ...settings, ...p.s })} />
                    <b>{t(`export.preset.${p.key}`)}{p.key === "std" ? <span className="tag acc" style={{ marginLeft: 6 }}>{t("export.recommended")}</span> : null}</b>
                    <span className="spec">{p.s.height}p · {p.s.fps} fps</span>
                    <small>{t(`export.preset.${p.key}Note`)}</small>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="card opts">
              <label className="optrow">
                <span style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                  <b style={{ fontWeight: 600 }}>{t("export.captions")}</b>
                  <span className="t3" style={{ fontSize: 12.5 }}>{t("export.captionsNote")}</span>
                </span>
                <span className="toggle"><input type="checkbox" role="switch" checked={settings.captions} onChange={(e) => setSettings({ ...settings, captions: e.target.checked })} /></span>
              </label>
              <details open={!preset}>
                <summary>
                  <Icon name="next" />
                  {t("export.advanced")}
                  <span className="t3" style={{ fontWeight: 400, fontSize: 12.5 }}>{preset ? t("export.advancedNote") : `${settings.height}p · ${settings.fps} fps · CRF ${settings.crf}`}</span>
                </summary>
                <div className="adv">
                  <div className="fld"><span className="lab">{t("export.resolution")}</span>{seg("height", [[720, "720p"], [1080, "1080p"], [1440, "1440p"], [2160, "4K"]])}</div>
                  <div className="fld"><span className="lab">{t("export.fps")}</span>{seg("fps", [[30, "30"], [60, "60"]])}</div>
                  <div className="fld">
                    <label htmlFor="crf">{t("export.crf")}</label>
                    <input id="crf" className="input mono" style={{ width: 120 }} type="number" min={10} max={35} value={settings.crf} onChange={(e) => setSettings({ ...settings, crf: Number(e.target.value) })} />
                  </div>
                </div>
              </details>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              <button className="btn pri lg" disabled={busy || blocking > 0} onClick={() => act({ settings })}>
                {busy ? <span className="spin" /> : <Icon name="film" />}
                {t("export.render", { q: settings.height === 2160 ? "4K" : `${settings.height}p` })}
              </button>
              <a className="btn lg" href={`/api/projects/${project.id}/srt`}>
                <Icon name="download" />
                {t("export.srt")}
              </a>
            </div>
            <p className="t3" style={{ fontSize: 12.5 }}>{t("export.firstRender")}</p>
          </section>

          <section className="right">
            {playing ? (
              <div className="player-box">
                <video src={`/api/projects/${project.id}/renders/${playing}`} controls autoPlay />
              </div>
            ) : null}
            <div className="card renders" aria-labelledby="out-h">
              <div className="hd">
                <h2 id="out-h">{t("export.outputs")}</h2>
                <button className="btn sm ghost" onClick={() => postJson("/api/open", { id: project.id }).catch((e) => setError((e as Error).message))}>
                  <Icon name="open" />
                  {t("export.openFolder")}
                </button>
              </div>
              {ordered.length === 0 ? (
                <div className="t3" style={{ padding: "22px 18px" }}>{t("export.none")}</div>
              ) : (
                ordered.map((j) =>
                  ACTIVE.has(j.status) ? (
                    <div key={j.id} className="rjob active">
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span className="spin" />
                        <span className="fname" style={{ flex: 1 }} title={j.file}>{j.file}</span>
                        <button className="btn sm ghost" onClick={() => act({ action: "cancel", jobId: j.id })}>{t("common.cancel")}</button>
                      </div>
                      <div className="pbar"><i style={{ width: `${Math.round(j.progress * 100)}%` }} /></div>
                      <div className="mono t3" style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                        <span>{t(statusKey(j.status))}{j.totalFrames ? t("export.frames", { a: j.renderedFrames.toLocaleString(dateLocale(locale)), b: j.totalFrames.toLocaleString(dateLocale(locale)) }) : ""}</span>
                        <span>{Math.round(j.progress * 100)}%</span>
                      </div>
                    </div>
                  ) : (
                    <div key={j.id} className="rjob">
                      {j.status === "done" ? (
                        <button className="thumbv" onClick={() => setPlaying(playing === j.id ? null : j.id)} aria-label={playing === j.id ? t("export.hide") : t("export.watch", { f: j.file })}>
                          <Icon name={playing === j.id ? "pause" : "play"} size={20} />
                        </button>
                      ) : null}
                      <div className="info">
                        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                          <span className="fname" title={j.file}>{j.file}</span>
                          <span className={`tag ${j.status === "done" ? "ok" : j.status === "error" ? "err" : ""}`}>{t(statusKey(j.status))}</span>
                        </div>
                        <span className="mono t3" style={{ fontSize: 12 }}>
                          {j.settings.height}p · {j.settings.fps} fps{j.settings.captions ? t("export.captionsTag") : ""}
                          {j.sizeBytes ? ` · ${(j.sizeBytes / 1024 / 1024).toFixed(1)} MB` : ""} · {when(j.createdAt, locale)}
                        </span>
                        {j.status === "error" && j.error ? <span className="mono" style={{ fontSize: 11.5, color: "var(--err)", whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{j.error.slice(0, 400)}</span> : null}
                        {j.status === "done" ? (
                          <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
                            <a className="btn sm" href={`/api/projects/${project.id}/renders/${j.id}?download`}><Icon name="download" />{t("export.download")}</a>
                          </div>
                        ) : null}
                      </div>
                      <button className="btn ghost icon sm danger" aria-label={t("grid.deleteAria", { title: j.file })} title={t("common.delete")} onClick={() => act({ action: "delete", jobId: j.id })}><Icon name="trash" /></button>
                    </div>
                  ),
                )
              )}
            </div>
          </section>
        </div>
      </main>
      <Toast message={error} onClose={() => setError(null)} />
    </ProjectChrome>
  );
}
