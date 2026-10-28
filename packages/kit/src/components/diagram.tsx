import React from "react";
import { interpolate } from "remotion";
import { z } from "zod";
import { parseProps, type KitEntry } from "../define";
import { colorSchema } from "../primitives";
import { color, ease, fonts, type ColorName } from "../theme";
import { atSchema, resolveAt, useSceneTime, useSceneTiming } from "../timing/context";
import { plainTex, RichText } from "./formula";

export const diagramSchema = z.object({
  nodes: z
    .array(
      z.object({
        id: z.string(),
        label: z.string().describe("Text in the box, supports $…$"),
        x: z.number().min(0).max(1).describe("Horizontal position 0–1 in the frame"),
        y: z.number().min(0).max(1).describe("Vertical position 0–1 in the frame"),
        at: atSchema.optional(),
        tone: colorSchema.optional().describe("Outline color; faint by default, accent to emphasise"),
        shape: z.enum(["box", "circle"]).default("box"),
      }),
    )
    .min(1),
  edges: z
    .array(
      z.object({
        from: z.string(),
        to: z.string(),
        label: z.string().optional(),
        at: atSchema.optional(),
        tone: colorSchema.optional(),
        directed: z.boolean().default(true),
      }),
    )
    .default([]),
  pulses: z
    .array(z.object({ from: z.string(), to: z.string(), at: atSchema, tone: colorSchema.default("accent"), duration: z.number().positive().default(0.9) }))
    .default([])
    .describe("A bright dot travelling along the edge from→to at time at: data/signal passing through, a BFS/DFS step"),
  highlights: z
    .array(z.object({ id: z.string(), at: atSchema, tone: colorSchema.default("accent") }))
    .default([])
    .describe("Recolor a node's outline at time at (with a small bounce). The node keeps the color until changed again"),
  at: atSchema.default(0).describe("Default time for nodes/edges without `at`"),
  gap: z.number().default(0.3).describe("Delay between nodes appearing one by one"),
  width: z.number().default(1500),
  height: z.number().default(720),
  nodeSize: z.number().default(34).describe("Font size in the nodes"),
});

export function Diagram(props: z.input<typeof diagramSchema>) {
  const p = parseProps("Diagram", diagramSchema, props);
  const timing = useSceneTiming();
  const t = useSceneTime();
  const base = resolveAt(p.at, timing);
  const prog = (start: number, d = 0.5) => interpolate(t, [start, start + d], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });

  const pos = new Map(p.nodes.map((n) => [n.id, { x: n.x * p.width, y: n.y * p.height }]));
  const nodeStart = new Map(p.nodes.map((n, i) => [n.id, n.at !== undefined ? resolveAt(n.at, timing) : base + i * p.gap]));
  const r = p.nodeSize * 1.9;

  for (const e of p.edges) {
    if (!pos.has(e.from) || !pos.has(e.to)) throw new Error(`<Diagram> edge ${e.from}→${e.to} points to a node that does not exist`);
  }
  for (const x of p.pulses) if (!pos.has(x.from) || !pos.has(x.to)) throw new Error(`<Diagram> pulse ${x.from}→${x.to} points to a node that does not exist`);
  for (const x of p.highlights) if (!pos.has(x.id)) throw new Error(`<Diagram> highlight: no node "${x.id}"`);
  const marks = p.highlights.map((h) => ({ ...h, t: resolveAt(h.at, timing) }));

  return (
    <div style={{ position: "relative", width: p.width, height: p.height }}>
      <svg width={p.width} height={p.height} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <defs>
          {(["grid", "muted", "accent", "text", "ok", "warn", "err", "info", "faint"] as ColorName[]).map((c) => (
            <marker key={c} id={`kit-arrow-${c}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0 0 L10 5 L0 10 z" fill={color(c)} />
            </marker>
          ))}
        </defs>
        {p.edges.map((e, i) => {
          const a = pos.get(e.from)!;
          const b = pos.get(e.to)!;
          const start = e.at !== undefined ? resolveAt(e.at, timing) : Math.max(nodeStart.get(e.from)!, nodeStart.get(e.to)!) + 0.3;
          const k = prog(start, 0.6);
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const len = Math.hypot(dx, dy) || 1;
          const ux = dx / len;
          const uy = dy / len;
          const sx = a.x + ux * r;
          const sy = a.y + uy * r * 0.6;
          const ex = b.x - ux * r;
          const ey = b.y - uy * r * 0.6;
          const tone = (e.tone ?? "muted") as ColorName;
          return (
            <g key={i} opacity={k > 0 ? 1 : 0}>
              <line
                x1={sx}
                y1={sy}
                x2={sx + (ex - sx) * k}
                y2={sy + (ey - sy) * k}
                stroke={color(tone)}
                strokeWidth={3.5}
                markerEnd={e.directed && k > 0.95 ? `url(#kit-arrow-${tone})` : undefined}
              />
              {e.label ? (
                <text x={(sx + ex) / 2} y={(sy + ey) / 2 - 14} fill={color("muted")} fontSize={p.nodeSize * 0.7} fontFamily={fonts.mono} textAnchor="middle" opacity={k}>
                  {plainTex(e.label)}
                </text>
              ) : null}
            </g>
          );
        })}
        {p.pulses.map((x, i) => {
          const s0 = resolveAt(x.at, timing);
          if (t < s0 || t > s0 + x.duration + 0.2) return null;
          const a = pos.get(x.from)!;
          const b = pos.get(x.to)!;
          const q = ease(Math.min(1, (t - s0) / x.duration));
          const c = color(x.tone as ColorName);
          const fade = t > s0 + x.duration ? 1 - (t - s0 - x.duration) / 0.2 : 1;
          return (
            <g key={`p${i}`} opacity={fade}>
              <circle cx={a.x + (b.x - a.x) * q} cy={a.y + (b.y - a.y) * q} r={p.nodeSize * 0.75} fill={c} opacity={0.25} />
              <circle cx={a.x + (b.x - a.x) * q} cy={a.y + (b.y - a.y) * q} r={p.nodeSize * 0.38} fill={c} />
            </g>
          );
        })}
      </svg>
      {p.nodes.map((n) => {
        const k = prog(nodeStart.get(n.id)!);
        const c = pos.get(n.id)!;
        const mark = marks.filter((m) => m.id === n.id && t >= m.t).pop();
        const tone = (mark?.tone ?? n.tone ?? "faint") as ColorName;
        const pop = mark ? Math.sin(Math.PI * Math.min(1, (t - mark.t) / 0.5)) * 0.15 : 0;
        const circle = n.shape === "circle";
        return (
          <div
            key={n.id}
            style={{
              position: "absolute",
              left: c.x,
              top: c.y,
              transform: `translate(-50%, -50%) scale(${(0.9 + 0.1 * k) * (1 + pop)})`,
              opacity: k,
              background: mark ? `${color(tone)}22` : color("surface"),
              border: `3px solid ${color(tone)}`,
              borderRadius: circle ? "50%" : 6,
              padding: circle ? 0 : `${p.nodeSize * 0.45}px ${p.nodeSize * 0.8}px`,
              width: circle ? r * 2 : undefined,
              height: circle ? r * 2 : undefined,
              display: "grid",
              placeItems: "center",
              fontSize: p.nodeSize,
              whiteSpace: "nowrap",
            }}
          >
            <RichText text={n.label} />
          </div>
        );
      })}
    </div>
  );
}

export const diagramMeta: KitEntry = {
  name: "Diagram",
  category: "component",
  summary: "Block diagram / discrete graph: nodes and arrows draw themselves in turn; `pulses` send a bright dot along edges, `highlights` recolor nodes with the narration (BFS, Dijkstra, data flow).",
  useWhen: ["Processes, cause → effect chains", "Graphs in algorithms (Dijkstra, BFS)", "Concept maps"],
  avoidWhen: ["Function graphs: use Graph", "More than 10 nodes: split the scene"],
  example: "diagram.tsx",
  schema: diagramSchema,
};
