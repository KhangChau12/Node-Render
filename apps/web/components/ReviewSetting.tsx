"use client";
import { useState } from "react";
import { postJson } from "@/lib/client";
import { useI18n } from "./I18n";

/** Toggle for the automatic visual review after a scene is written. */
export function ReviewSetting({ value }: { value: boolean }) {
  const { t } = useI18n();
  const [on, setOn] = useState(value);
  const [saving, setSaving] = useState(false);
  return (
    <div className="rowf">
      <div className="l">
        {t("review.title")}
        <small>{t("review.sub")}</small>
      </div>
      <label className="toggle">
        <input
          type="checkbox"
          checked={on}
          disabled={saving}
          onChange={async (e) => {
            const next = e.target.checked;
            setOn(next);
            setSaving(true);
            try {
              await postJson("/api/settings", { visualReview: next });
            } catch {
              setOn(!next);
            } finally {
              setSaving(false);
            }
          }}
        />
        <span className="t2">{t("review.desc")}</span>
      </label>
    </div>
  );
}
