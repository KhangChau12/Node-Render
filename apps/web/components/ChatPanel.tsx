"use client";
import React, { useEffect, useRef, useState } from "react";
import { dateLocale, type Locale } from "@/lib/i18n";
import { imageFiles, imageToDataUrl } from "@/lib/images";
import { useElapsed, type Live } from "@/lib/stream";
import type { ChatMessage } from "@/lib/types";
import { useI18n } from "./I18n";
import { Icon } from "./Icon";
import { Inline } from "./Prose";

const time = (iso: string, locale: Locale) => new Date(iso).toLocaleTimeString(dateLocale(locale), { hour: "2-digit", minute: "2-digit" });

export type ChatPanelProps = {
  messages: ChatMessage[];
  model: string;
  scope: React.ReactNode;
  placeholder: string;
  /** A streamed AI job to show at the end of the log. */
  live?: Live | null;
  /** Extra preview rendered inside the live card (e.g. sections being rewritten). */
  liveBody?: React.ReactNode;
  onStop?: () => void;
  disabled?: string | null;
  /** `images` are JPEG data URLs, only when `attach` is set. */
  onSend: (text: string, images: string[]) => void;
  /** Allow pasting, dropping or picking up to this many images. */
  attach?: number;
  /** A preview shown before the attached images, e.g. the paused frame that will be sent. */
  extraThumb?: React.ReactNode;
  /** Extra controls in the composer's bottom row (left of Send). */
  composerTools?: React.ReactNode;
  renderChange?: (m: ChatMessage) => React.ReactNode;
  tabs?: React.ReactNode;
  /** Shown above the message log (e.g. the current scene's status). */
  header?: React.ReactNode;
  /** One-tap requests that fill the composer. */
  quick?: string[];
  children?: React.ReactNode;
};

/** The assistant's work in progress: elapsed time, stage, reasoning summary, the reply as it is typed. */
export function LiveCard({ live, children, onStop }: { live: Live; children?: React.ReactNode; onStop?: () => void }) {
  const { t } = useI18n();
  const secs = useElapsed(live.startedAt);
  const [open, setOpen] = useState(false);
  const reply = typeof live.partial?.reply === "string" ? live.partial.reply : "";
  const status = live.stage ?? (reply || live.partial ? t("common.writing") : live.thinking ? t("common.thinking") : t("common.waitingModel"));
  return (
    <div className="entry live">
      <div className="who">
        <b>{t("common.assistant")}</b>
        <span className="livestat">
          <span className="pulse" />
          {status}
        </span>
        <span className="mono">{secs}s</span>
        <span className="sp" />
        {onStop ? (
          <button className="btn sm ghost" onClick={onStop} title={t("chat.stopTitle")}>
            <Icon name="x" size={12} />
            {t("common.stop")}
          </button>
        ) : null}
      </div>
      {live.thinking ? (
        <div className={`thinking ${open ? "open" : ""}`}>
          <button onClick={() => setOpen(!open)} aria-expanded={open}>
            <Icon name={open ? "down" : "next"} size={12} />
            {t("chat.thoughts")}
          </button>
          <div className="tx">{open ? live.thinking : live.thinking.slice(-260)}</div>
        </div>
      ) : null}
      {reply ? (
        <div className="txt">
          {reply}
          <span className="caret" />
        </div>
      ) : null}
      {children}
    </div>
  );
}

/** Assistant panel: message log + scoped composer. `children` replaces the log (other tabs). */
export function ChatPanel(props: ChatPanelProps) {
  const { t: tr, locale } = useI18n();
  const [text, setText] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const stick = useRef(true);

  useEffect(() => {
    const el = logRef.current;
    if (el && stick.current) el.scrollTo({ top: el.scrollHeight });
  }, [props.messages.length, props.live]);

  const busy = Boolean(props.live);
  const addImages = async (files: File[]) => {
    if (!props.attach || !files.length) return;
    const room = props.attach - images.length;
    const urls = await Promise.all(files.slice(0, Math.max(0, room)).map(imageToDataUrl));
    setImages((xs) => [...xs, ...urls].slice(0, props.attach));
  };

  const send = () => {
    const t = text.trim() || (images.length ? tr("chat.imageFix") : "");
    if (!t || busy || props.disabled) return;
    stick.current = true;
    props.onSend(t, images);
    setText("");
    setImages([]);
  };

  return (
    <aside className="insp" aria-label={tr("common.assistant")}>
      {props.tabs ? (
        <div className="tabs" role="tablist">
          {props.tabs}
          <span className="model" title={props.model}>{props.model}</span>
        </div>
      ) : (
        <div className="insp-hd">
          <span className="badge"><Icon name="chat" /></span>
          <h2>{tr("common.assistant")}</h2>
          <span className="model" title={props.model}>{props.model}</span>
        </div>
      )}
      {props.children ?? (
        <>
          {props.header ? <div className="insp-top">{props.header}</div> : null}
          <div
            className="log"
            ref={logRef}
            onScroll={(e) => {
              const el = e.currentTarget;
              stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
            }}
          >
            {props.messages.length === 0 && !props.live ? <div className="t3" style={{ fontSize: 13 }}>{tr("chat.empty")}</div> : null}
            {props.messages.map((m) =>
              m.role === "event" ? (
                <div key={m.id} className="event">
                  <span className="line" />
                  <span><Inline text={m.text} /></span>
                  <span className="mono">{time(m.at, locale)}</span>
                  <span className="line" />
                </div>
              ) : (
                <div key={m.id} className={`entry ${m.role === "user" ? "me" : ""}`}>
                  <div className="who">
                    {m.role === "user" ? null : <b>{tr("common.assistant")}</b>}
                    {m.scope ? <span>{m.scope}</span> : null}
                    {m.attached ? <span className="att"><Icon name="image" size={13} />{m.attached}</span> : null}
                    <span className="mono">{time(m.at, locale)}</span>
                  </div>
                  <div className="txt"><Inline text={m.text} /></div>
                  {m.change && props.renderChange ? props.renderChange(m) : null}
                </div>
              ),
            )}
            {props.live ? (
              <LiveCard live={props.live} onStop={props.onStop}>
                {props.liveBody}
              </LiveCard>
            ) : null}
          </div>
          <div className="composer">
            {props.quick?.length && !props.disabled ? (
              <div className="quick">
                {props.quick.map((q) => (
                  <button key={q} className="chip" onClick={() => setText(q)} disabled={busy}>{q}</button>
                ))}
              </div>
            ) : null}
            <div
              className={`field-in ${drag ? "drag" : ""}`}
              onDragOver={(e) => {
                if (!props.attach || props.disabled) return;
                e.preventDefault();
                setDrag(true);
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                setDrag(false);
                const files = imageFiles(e.dataTransfer);
                if (!props.attach || props.disabled || !files.length) return;
                e.preventDefault();
                void addImages(files);
              }}
            >
              <div className="scope">{props.scope}</div>
              {images.length || props.extraThumb ? (
                <div className="thumbs">
                  {props.extraThumb}
                  {images.map((src, i) => (
                    <span key={i} className="thumbi">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt={tr("chat.imageAlt", { n: i + 1 })} />
                      <button onClick={() => setImages((xs) => xs.filter((_, k) => k !== i))} aria-label={tr("chat.removeImage", { n: i + 1 })}><Icon name="x" size={11} /></button>
                    </span>
                  ))}
                </div>
              ) : null}
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onPaste={(e) => {
                  const files = imageFiles(e.clipboardData);
                  if (!props.attach || !files.length) return;
                  e.preventDefault();
                  void addImages(files);
                }}
                placeholder={props.disabled ?? props.placeholder}
                disabled={Boolean(props.disabled)}
                rows={2}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                aria-label={tr("chat.messageAria")}
              />
              <div className="row">
                {props.attach ? (
                  <>
                    <button className="btn ghost icon sm" onClick={() => fileRef.current?.click()} disabled={Boolean(props.disabled) || images.length >= props.attach} aria-label={tr("chat.attach")} title={tr("chat.attachTitle", { n: props.attach })}>
                      <Icon name="clip" />
                    </button>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      multiple
                      hidden
                      onChange={(e) => {
                        void addImages([...(e.target.files ?? [])]);
                        e.target.value = "";
                      }}
                    />
                  </>
                ) : null}
                {props.composerTools}
                <span className="t3" style={{ fontSize: 12, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {busy ? tr("chat.replying") : props.attach ? tr("chat.hintImages") : tr("chat.hint")}
                </span>
                <span className="sp" />
                {busy && props.onStop ? (
                  <button className="btn icon sm" onClick={props.onStop} aria-label={tr("common.stop")} title={tr("common.stop")}>
                    <span className="stopsq" />
                  </button>
                ) : (
                  <button className="btn pri icon sm" onClick={send} disabled={(!text.trim() && !images.length) || busy || Boolean(props.disabled)} aria-label={tr("chat.send")}>
                    <Icon name="send" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </aside>
  );
}
