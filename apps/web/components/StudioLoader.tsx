"use client";
import dynamic from "next/dynamic";
import { useI18n } from "./I18n";

function Opening() {
  const { t } = useI18n();
  return (
    <div className="empty" style={{ height: "100%" }}>
      <span className="spin" />
      {t("studio.opening")}
    </div>
  );
}

// Remotion Player and the scene compiler run only in the browser.
export const StudioLoader = dynamic(() => import("./Studio"), {
  ssr: false,
  loading: () => <Opening />,
});
