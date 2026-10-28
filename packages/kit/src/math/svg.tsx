import React from "react";
import { z } from "zod";
import { RichText } from "../components/richtext";
import { color, fonts, halo, type ColorName } from "../theme";

/*
 * SVG drawing helpers shared by the coordinate systems (Axes, Axes3D) and the
 * kit components that draw in SVG. Internal: scene code never imports these.
 */

export const DIRS = {
  c: ["-50%", "-50%"],
  u: ["-50%", "calc(-100% - 12px)"],
  d: ["-50%", "12px"],
  l: ["calc(-100% - 14px)", "-50%"],
  r: ["14px", "-50%"],
  ur: ["10px", "calc(-100% - 8px)"],
  ul: ["calc(-100% - 10px)", "calc(-100% - 8px)"],
  dr: ["10px", "8px"],
  dl: ["calc(-100% - 10px)", "8px"],
} as const;
export type Dir = keyof typeof DIRS;
export const dirSchema = z.enum(Object.keys(DIRS) as [Dir, ...Dir[]]).describe("Label direction relative to the point: u d l r ur ul dr dl, c = centered");

/** HTML (KaTeX-capable) text anchored at an SVG point. */
export function Tag({ x, y, dir = "ur", size = 34, tone = "text", opacity = 1, children }: { x: number; y: number; dir?: Dir; size?: number; tone?: ColorName; opacity?: number; children: React.ReactNode }) {
  const [tx, ty] = DIRS[dir];
  if (opacity <= 0 || !Number.isFinite(x) || !Number.isFinite(y)) return null;
  return (
    <foreignObject x={x} y={y} width={1} height={1} style={{ overflow: "visible" }}>
      <div style={{ width: "max-content", transform: `translate(${tx}, ${ty})`, fontSize: size, color: color(tone), opacity, whiteSpace: "nowrap", lineHeight: 1.15, fontFamily: fonts.sans, textShadow: halo }}>
        {children}
      </div>
    </foreignObject>
  );
}

/** Label direction pointing away from a direction vector (screen coordinates, y down). */
export function dirAway(ux: number, uy: number): Dir {
  return Math.abs(ux) > Math.abs(uy) * 2 ? (ux > 0 ? "r" : "l") : uy < 0 ? (ux >= 0 ? "ur" : "ul") : ux >= 0 ? "dr" : "dl";
}

/** An arrow from `from` to `to` in px, grown to fraction k. */
export function ArrowShape({ from, to, tone, k, width = 6, label, labelDir, dashed }: { from: [number, number]; to: [number, number]; tone: ColorName; k: number; width?: number; label?: string; labelDir?: Dir; dashed?: boolean }) {
  if (k <= 0) return null;
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const len = Math.hypot(dx, dy);
  if (len < 1) return null;
  const ux = dx / len;
  const uy = dy / len;
  const L = len * k;
  const head = Math.min(26, L * 0.45, 8 + width * 3);
  const tip: [number, number] = [from[0] + ux * L, from[1] + uy * L];
  const base: [number, number] = [tip[0] - ux * head, tip[1] - uy * head];
  const nx = -uy * head * 0.5;
  const ny = ux * head * 0.5;
  const c = color(tone);
  return (
    <g>
      <line x1={from[0]} y1={from[1]} x2={base[0]} y2={base[1]} stroke={c} strokeWidth={width} strokeLinecap="round" strokeDasharray={dashed ? "12 9" : undefined} />
      <path d={`M${tip[0]} ${tip[1]} L${base[0] + nx} ${base[1] + ny} L${base[0] - nx} ${base[1] - ny} Z`} fill={c} />
      {label ? (
        <Tag x={tip[0]} y={tip[1]} dir={labelDir ?? dirAway(ux, uy)} tone={tone} size={36} opacity={Math.max(0, (k - 0.6) / 0.4)}>
          <RichText text={label} />
        </Tag>
      ) : null}
    </g>
  );
}

/** Curly brace from a to b (px), bulging to the left of the a→b direction by `depth`. Returns the path and the tip point. */
export function bracePath(a: [number, number], b: [number, number], depth = 26): { d: string; tip: [number, number]; normal: [number, number] } {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const L = Math.hypot(dx, dy) || 1;
  const ux = dx / L;
  const uy = dy / L;
  // Normal pointing to the left of a→b on screen.
  const nx = uy;
  const ny = -ux;
  const P = (s: number, h: number): string => `${(a[0] + ux * s + nx * h).toFixed(1)} ${(a[1] + uy * s + ny * h).toFixed(1)}`;
  const r = Math.min(depth * 0.8, L / 6);
  const m = L / 2;
  const h = depth / 2;
  const d = `M${P(0, 0)} Q${P(0, h)} ${P(r, h)} L${P(m - r, h)} Q${P(m, h)} ${P(m, depth)} Q${P(m, h)} ${P(m + r, h)} L${P(L - r, h)} Q${P(L, h)} ${P(L, 0)}`;
  return { d, tip: [a[0] + ux * m + nx * depth, a[1] + uy * m + ny * depth], normal: [nx, ny] };
}

/** Mix two hex colors (#rrggbb), k in 0..1. */
export function mixHex(a: string, b: string, k: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const q = Math.max(0, Math.min(1, k));
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * q)).join(",")})`;
}

/** Smooth path through points (Catmull-Rom → cubic Bézier). */
export function smoothPath(pts: [number, number][], closed = false, tension = 0.5): string {
  if (pts.length < 2) return "";
  if (pts.length === 2) return `M${pts[0][0]} ${pts[0][1]} L${pts[1][0]} ${pts[1][1]}`;
  const n = pts.length;
  const at = (i: number) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const c1 = [p1[0] + ((p2[0] - p0[0]) * tension) / 3, p1[1] + ((p2[1] - p0[1]) * tension) / 3];
    const c2 = [p2[0] - ((p3[0] - p1[0]) * tension) / 3, p2[1] - ((p3[1] - p1[1]) * tension) / 3];
    d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return closed ? `${d} Z` : d;
}
