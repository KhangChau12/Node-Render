"use client";
import { useI18n } from "./I18n";
import { Icon } from "./Icon";

export function Toast({ message, onClose }: { message: string | null; onClose: () => void }) {
  const { t } = useI18n();
  if (!message) return null;
  return (
    <div className="toast" role="alert">
      <Icon name="alert" style={{ color: "var(--err)", marginTop: 2 }} />
      <span style={{ flex: 1, whiteSpace: "pre-wrap" }}>{message}</span>
      <button className="btn ghost icon sm" onClick={onClose} aria-label={t("common.close")}>
        <Icon name="x" />
      </button>
    </div>
  );
}
