import React, { useId, useLayoutEffect, useRef, useState } from "react";
import { AbsoluteFill, getRemotionEnvironment } from "remotion";
import { z } from "zod";
import { parseProps, type KitEntry } from "../define";
import { RichText } from "../components/formula";
import { color, fonts, sizes, space } from "../theme";
import { atSchema, useProgress } from "../timing/context";

function Heading({ title, kicker, at }: { title: string; kicker?: string; at: number | string }) {
  const k = useProgress(at, 0.6);
  return (
    // flex: none, or a crowded visual squeezes the heading and the kicker slides under the title.
    <div style={{ flex: "none", opacity: k, transform: `translateY(${(1 - k) * 22}px)`, filter: k < 1 ? `blur(${(1 - k) * 6}px)` : undefined }}>
      {kicker ? (
        <div style={{ fontFamily: fonts.mono, fontSize: sizes.label, letterSpacing: 2, textTransform: "uppercase", color: color("accent"), marginBottom: 14 }}>{kicker}</div>
      ) : null}
      <div style={{ fontSize: sizes.title, fontWeight: 600, lineHeight: 1.12, letterSpacing: -0.8 }}>
        <RichText text={title} />
      </div>
    </div>
  );
}

/** Padding of every layout: title-safe sides, room for captions at the bottom. */
const PAD = `${space.safeY}px ${space.safeX}px ${space.captionSafe}px`;

/**
 * Content area that scales its children down when they would overflow, so a
 * too-large visual shrinks instead of spilling into captions or off screen.
 */
export function FitArea({ children, align = "center" }: { children?: React.ReactNode; align?: "center" | "left" }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const id = useId();
  useLayoutEffect(() => {
    const o = outer.current;
    const i = inner.current;
    if (!o || !i) return;
    const s = Math.min(1, o.clientWidth / Math.max(1, i.scrollWidth), o.clientHeight / Math.max(1, i.scrollHeight));
    if (Math.abs(s - scale) > 0.01) setScale(s);
    // Read by the screenshot worker (last value per area wins): heavy shrinking means unreadably small text.
    if (o.clientWidth > 0 && i.scrollWidth > 0 && getRemotionEnvironment().isRendering) console.log(`[kit-fit] ${id} ${s.toFixed(2)}`);
  });
  return (
    <div ref={outer} style={{ position: "relative", flex: 1, minHeight: 0, minWidth: 0, alignSelf: "stretch" }}>
      <div
        ref={inner}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: "50%",
          transform: `translateY(-50%) scale(${scale})`,
          transformOrigin: align === "center" ? "center center" : "left center",
          display: "flex",
          justifyContent: align === "center" ? "center" : "flex-start",
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* --------------------------------------------------------- TitleWithVisual */

export const titleWithVisualSchema = z.object({
  title: z.string().describe("Scene title, at most ~8 words"),
  kicker: z.string().optional().describe("Small label above the title"),
  at: atSchema.default(0),
  align: z.enum(["center", "left"]).default("center").describe("Alignment of the illustration"),
});

export function TitleWithVisual(props: z.input<typeof titleWithVisualSchema> & { children?: React.ReactNode }) {
  const p = parseProps("TitleWithVisual", titleWithVisualSchema, props);
  return (
    <AbsoluteFill style={{ padding: PAD, display: "flex", flexDirection: "column", gap: 40 }}>
      <Heading title={p.title} kicker={p.kicker} at={p.at} />
      <FitArea align={p.align}>{p.children}</FitArea>
    </AbsoluteFill>
  );
}

export const titleWithVisualMeta: KitEntry = {
  name: "TitleWithVisual",
  category: "layout",
  summary: "Title on top, a large illustration area below. The default layout for most scenes.",
  useWhen: ["One main illustration: a plot, a formula, a diagram, a list"],
  avoidWhen: ["Comparing two things side by side: use TwoColumn"],
  example: "graph-secant.tsx",
  children: "One illustration (or one <div> holding several elements)",
  schema: titleWithVisualSchema,
};

/* --------------------------------------------------------------- TwoColumn */

export const twoColumnSchema = z.object({
  title: z.string().optional(),
  kicker: z.string().optional(),
  at: atSchema.default(0),
  ratio: z.number().min(0.25).max(0.75).default(0.5).describe("Width ratio of the left column"),
  divider: z.boolean().default(true),
});

export function TwoColumn(props: z.input<typeof twoColumnSchema> & { children?: React.ReactNode }) {
  const p = parseProps("TwoColumn", twoColumnSchema, props);
  const kids = React.Children.toArray(p.children);
  if (kids.length !== 2) throw new Error(`<TwoColumn> needs exactly 2 children (left, right), it has ${kids.length}. Wrap several elements in <Stack>.`);
  return (
    <AbsoluteFill style={{ padding: PAD, display: "flex", flexDirection: "column", gap: 48 }}>
      {p.title ? <Heading title={p.title} kicker={p.kicker} at={p.at} /> : null}
      <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 64, alignItems: "stretch" }}>
        <div style={{ flex: p.ratio, minWidth: 0, display: "flex" }}><FitArea>{kids[0]}</FitArea></div>
        {p.divider ? <div style={{ width: 2, alignSelf: "stretch", background: color("grid") }} /> : null}
        <div style={{ flex: 1 - p.ratio, minWidth: 0, display: "flex" }}><FitArea>{kids[1]}</FitArea></div>
      </div>
    </AbsoluteFill>
  );
}

export const twoColumnMeta: KitEntry = {
  name: "TwoColumn",
  category: "layout",
  summary: "Two columns side by side, with an optional title. Exactly two children: left, right.",
  useWhen: ["Before/after, right/wrong, two ways of solving", "Formula on the left, graph on the right"],
  avoidWhen: ["Only one illustration: use TitleWithVisual"],
  example: "two-column.tsx",
  children: "Exactly two elements: left column, right column",
  schema: twoColumnSchema,
};

/* -------------------------------------------------------------- FullVisual */

export const fullVisualSchema = z.object({
  align: z.enum(["center", "left"]).default("center"),
});

export function FullVisual(props: z.input<typeof fullVisualSchema> & { children?: React.ReactNode }) {
  const p = parseProps("FullVisual", fullVisualSchema, props);
  return (
    <AbsoluteFill style={{ padding: PAD, display: "flex", flexDirection: "column" }}>
      <FitArea align={p.align}>{p.children}</FitArea>
    </AbsoluteFill>
  );
}

export const fullVisualMeta: KitEntry = {
  name: "FullVisual",
  category: "layout",
  summary: "The whole frame for one element, centered in the safe area.",
  useWhen: ["An opening TitleCard", "One formula or a big question on its own"],
  avoidWhen: ["A scene title is needed: use TitleWithVisual"],
  example: "title-card.tsx",
  children: "One element",
  schema: fullVisualSchema,
};
