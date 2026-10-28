import { AppSidebar } from "@/components/AppSidebar";
import { Icon } from "@/components/Icon";
import { LanguageSetting } from "@/components/LanguageSetting";
import { PaceSetting } from "@/components/PaceSetting";
import { ReviewSetting } from "@/components/ReviewSetting";
import { aiConfig } from "@/lib/ai";
import type { MessageKey } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";
import { dataDir } from "@/lib/paths";
import { dirSize, getSettings, listProjects } from "@/lib/storage";

export const dynamic = "force-dynamic";

const TASK_ENV: Record<string, string> = {
  lesson: "MODEL_LESSON",
  script: "MODEL_SCRIPT",
  codegen: "MODEL_CODEGEN",
  quick: "MODEL_QUICK_EDIT",
  review: "MODEL_REVIEW",
};
const EFFORTS = ["minimal", "low", "medium", "high", "xhigh", "max"];

export default async function SettingsPage() {
  const ai = aiConfig();
  const ds = ai.backends.find((b) => b.id === "deepseek");
  const [settings, size, projects, { t }] = await Promise.all([getSettings(), dirSize(dataDir()), listProjects(), getI18n()]);
  const task = (id: string) => t(`settings.task.${id}` as MessageKey);
  const effort = (e: string) => (EFFORTS.includes(e) ? t(`settings.effort.${e}` as MessageKey) : e);
  return (
    <div className="app">
      <AppSidebar active="settings" />
      <main className="setmain">
        <div className="set-in">
          <h1>{t("settings.title")}</h1>
          <section>
            <h2>{t("settings.language")}</h2>
            <p className="desc">{t("settings.languageDesc")}</p>
            <LanguageSetting />
          </section>
          <section>
            <h2>{t("settings.ai")}</h2>
            <p className="desc">
              {t("settings.aiDesc1")} <span className="mono">.env.local</span> {t("settings.aiDesc2")}
            </p>
            <div className="rowf">
              <div className="l">OpenAI<small>LLM_PROVIDER</small></div>
              <div>{ai.provider === "openai" ? <span className="status ok">OpenAI</span> : <span className="status warn">{t("settings.mockStatus")}</span>}</div>
            </div>
            <div className="rowf">
              <div className="l">OPENAI_API_KEY<small>.env.local</small></div>
              <div>{ai.hasKey ? <span className="mono t2">sk-…{ai.keyHint?.slice(1)}</span> : <span className="t3">{t("settings.noKey")}</span>}</div>
            </div>
            <div className="notice">
              <Icon name="alert" />
              <span>{t("settings.keyNotice")}</span>
            </div>
            <table className="tbl">
              <thead>
                <tr><th>{t("settings.col.task")}</th><th>{t("settings.col.model")}</th><th>{t("settings.col.effort")}</th><th>{t("settings.col.env")}</th></tr>
              </thead>
              <tbody>
                {ai.tasks.map((x) => (
                  <tr key={x.task}>
                    <td>{task(x.task)}</td>
                    <td className="mono">{x.model}</td>
                    <td>{effort(x.effort)}</td>
                    <td className="mono t3">{TASK_ENV[x.task]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {ds ? (
              <>
                <h3 style={{ marginTop: 28 }}>{t("settings.ds.title")}</h3>
                <p className="desc">{t("settings.ds.desc", { relay: "(SOCLAAS_RELAY=auto)" })}</p>
                <div className="rowf">
                  <div className="l">{t("settings.ds.key")}<small>{t("settings.ds.keyEnv")}</small></div>
                  <div>{ds.keyHint ? <span className="mono t2">clsk…{ds.keyHint.slice(1)}</span> : <span className="t3">{t("settings.ds.noKey")}</span>}</div>
                </div>
                <div className="rowf">
                  <div className="l">{t("settings.ds.server")}<small>SOCLAAS_BASE_URL</small></div>
                  <div>
                    <span className="mono t2">{ds.endpoint}</span>
                    {ds.route ? <span className="chip" style={{ marginLeft: 10 }}>{ds.route === "relay" ? t("settings.ds.relay") : t("settings.ds.direct")}</span> : null}
                  </div>
                </div>
                <table className="tbl">
                  <thead>
                    <tr><th>{t("settings.col.task")}</th><th>{t("settings.col.model")}</th><th>{t("settings.col.effort")}</th></tr>
                  </thead>
                  <tbody>
                    {ds.tasks.map((x) => (
                      <tr key={x.task}>
                        <td>{task(x.task)}</td>
                        <td className="mono">{x.model}</td>
                        <td>{effort(x.effort)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            ) : null}
            <ReviewSetting value={settings.visualReview} />
          </section>
          <section>
            <h2>{t("settings.pace")}</h2>
            <p className="desc">{t("settings.paceDesc")}</p>
            <PaceSetting value={settings.syllablesPerSecond} />
          </section>
          <section>
            <h2>{t("settings.storage")}</h2>
            <div className="rowf">
              <div className="l">{t("settings.dataDir")}<small>DATA_DIR</small></div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="mono" style={{ overflowWrap: "anywhere" }}>{dataDir()}</span>
                <span className="chip">{t("settings.gitignored")}</span>
              </div>
            </div>
            <div className="rowf">
              <div className="l">{t("settings.size")}</div>
              <div className="t2">{t("settings.sizeValue", { mb: (size / 1024 / 1024).toFixed(1), n: projects.length })}</div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
