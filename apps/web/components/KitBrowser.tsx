"use client";
import { estimateTiming, SingleScene } from "@lecture/kit";
import { Player } from "@remotion/player";
import { useMemo, useState } from "react";
import type { MessageKey } from "@/lib/i18n";
import type { KitItem } from "@/lib/kitInfo";
import { useI18n } from "./I18n";
import { Icon } from "./Icon";

const GROUPS: [string, MessageKey][] = [
  ["layout", "kit.group.layout"],
  ["component", "kit.group.component"],
  ["plot", "kit.group.plot"],
  ["primitive", "kit.group.primitive"],
];

export default function KitBrowser({ items, docs }: { items: KitItem[]; docs: { bytes: number; updatedAt: string } | null }) {
  const { t } = useI18n();
  const [name, setName] = useState(items.find((i) => i.example)?.name ?? items[0]?.name);
  const item = items.find((i) => i.name === name) ?? items[0];

  const scene = useMemo(() => {
    if (!item?.example) return null;
    const timing = estimateTiming(item.example.narration);
    return { id: `example-${item.name}`, title: item.name, code: item.example.code, timing };
  }, [item]);

  return (
    <>
      <nav className="kitnav">
        {GROUPS.map(([cat, label]) => (
          <div key={cat}>
            <div className="g label">{t(label)}</div>
            {items
              .filter((i) => i.category === cat)
              .map((i) => (
                <button key={i.name} className={i.name === name ? "on" : ""} onClick={() => setName(i.name)}>
                  {i.name}
                  {i.example ? <Icon name="play" size={12} /> : null}
                </button>
              ))}
          </div>
        ))}
        <div className="t3" style={{ fontSize: 11.5, padding: "18px 8px 0" }}>
          {docs ? `kit-docs.md · ${(docs.bytes / 1024).toFixed(1)} KB` : t("kit.noDocs")}
          <br />
          {t("kit.run")} <span className="mono">npm run kit:docs</span> {t("kit.afterChange")}
        </div>
      </nav>
      {item ? (
        <main className="doc">
          <div className="doc-in">
            <div>
              <h1>
                {item.name} <code>@kit · {item.category}</code>
              </h1>
              <p className="lead">{item.summary}</p>
            </div>
            <div className="dodont">
              <div>
                <h4><Icon name="check" style={{ color: "var(--ok)" }} />{t("kit.useWhen")}</h4>
                <ul>{item.useWhen.map((u) => <li key={u}>{u}</li>)}</ul>
              </div>
              <div>
                <h4><Icon name="x" style={{ color: "var(--err)" }} />{t("kit.avoidWhen")}</h4>
                <ul>{item.avoidWhen.map((u) => <li key={u}>{u}</li>)}</ul>
              </div>
            </div>
            {scene && item.example ? (
              <div className="preview">
                <div className="bar2">
                  <span className="mono t2">examples/{item.example.file}</span>
                  <span className="sp" />
                  <span className="t3" style={{ fontSize: 12 }}>{t("kit.exampleNote")}</span>
                </div>
                <Player
                  component={SingleScene}
                  inputProps={{ scene, captions: true }}
                  durationInFrames={Math.ceil(scene.timing.duration * 30)}
                  fps={30}
                  compositionWidth={1920}
                  compositionHeight={1080}
                  style={{ width: "100%", aspectRatio: "16 / 9" }}
                  initialFrame={Math.floor(scene.timing.duration * 30 * 0.75)}
                  controls
                  loop
                  acknowledgeRemotionLicense
                />
              </div>
            ) : null}
            {item.children ? (
              <p className="t2">
                <b style={{ color: "var(--text)" }}>{t("kit.children")}</b> {item.children}
              </p>
            ) : null}
            <div>
              <div className="label" style={{ marginBottom: 8 }}>{t("kit.props")}</div>
              <table className="props">
                <thead>
                  <tr><th>{t("kit.col.name")}</th><th>{t("kit.col.type")}</th><th>{t("kit.col.default")}</th><th>{t("kit.col.desc")}</th></tr>
                </thead>
                <tbody>
                  {item.props.map((p) => (
                    <tr key={p.name}>
                      <td>{p.name}</td>
                      <td>{p.type}</td>
                      <td>{p.def}</td>
                      <td>{p.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {item.example ? (
              <div>
                <div className="label" style={{ marginBottom: 8 }}>{t("kit.exampleLabel")}</div>
                <pre className="codeblock">{item.example.code}</pre>
              </div>
            ) : null}
          </div>
        </main>
      ) : null}
    </>
  );
}
