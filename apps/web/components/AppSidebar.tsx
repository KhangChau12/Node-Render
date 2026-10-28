import { aiConfig } from "@/lib/ai";
import { getI18n } from "@/lib/i18n/server";
import { Rail } from "./Rail";

/** Rail for app-level pages (home, kit, settings), with the AI provider status. Server component. */
export async function AppSidebar({ active }: { active: "home" | "kit" | "settings" }) {
  const { t } = await getI18n();
  const live = aiConfig().backends.filter((b) => b.available);
  return (
    <Rail
      active={active}
      ai={
        live.length
          ? { ok: true, label: live.map((b) => b.label).join(" · "), title: t("nav.aiReady", { list: live.map((b) => `${b.label} ${b.keyHint}`).join(", ") }) }
          : { ok: false, label: "Mock", title: t("nav.mockTitle") }
      }
    />
  );
}
