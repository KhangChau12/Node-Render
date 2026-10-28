"use client";
import dynamic from "next/dynamic";

export const KitLoader = dynamic(() => import("./KitBrowser"), {
  ssr: false,
  loading: () => (
    <div className="empty" style={{ flex: 1 }}>
      <span className="spin" />
    </div>
  ),
});
