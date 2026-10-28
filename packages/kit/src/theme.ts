import { Easing } from "remotion";

/**
 * Single source of truth for the look of every video.
 * Components only read from here; scene code must use color names, never raw hex.
 */
export const colors = {
  bg: "#101215",
  surface: "#181a1e",
  raised: "#202328",
  grid: "#2a2d33",
  text: "#ece9e2",
  muted: "#a6a49e",
  faint: "#6f6e6a",
  accent: "#ff7a45",
  ok: "#5fc08a",
  warn: "#e3c04e",
  err: "#ef6158",
  info: "#73a7ff",
} as const;

export type ColorName = keyof typeof colors;
export const colorNames = Object.keys(colors) as [ColorName, ...ColorName[]];

export const fonts = {
  sans: '"Be Vietnam Pro", "IBM Plex Sans", "Segoe UI", sans-serif',
  serif: '"Source Serif 4", "Literata", Georgia, serif',
  /** Serif for Vietnamese prose (literature, quotes): every glyph is in the font. */
  prose: '"Literata", "Be Vietnam Pro", Georgia, serif',
  mono: '"IBM Plex Mono", Consolas, monospace',
} as const;

/** Type scale in px for a 1920×1080 canvas. */
export const sizes = {
  display: 96,
  title: 68,
  heading: 52,
  body: 40,
  small: 30,
  caption: 34,
  label: 24,
} as const;

export type SizeName = keyof typeof sizes;

export const space = {
  /** Title-safe margin (5% of width). */
  safeX: 96,
  safeY: 72,
  /** Bottom padding of layouts: keeps content clear of the captions. */
  captionSafe: 156,
  gap: 32,
} as const;

/** Default easing for every entrance animation. */
export const ease = Easing.bezier(0.2, 0.8, 0.2, 1);

export const theme = { colors, fonts, sizes, space, ease };

/** Dark outline around text drawn over lines and curves, so it stays readable where they cross. */
export const halo = `0 0 4px ${colors.bg}, 0 0 8px ${colors.bg}, 0 0 2px ${colors.bg}`;

/**
 * Axis names: a math variable ("x", "$t$") in serif italic like a textbook;
 * words ("số lần so sánh") in the sans font, which has every Vietnamese glyph.
 */
export function axisNameStyle(label: string): { fontFamily: string; fontStyle: "italic" | "normal" } {
  const math = label.includes("$") || label.trim().length <= 2;
  return { fontFamily: math ? fonts.serif : fonts.sans, fontStyle: math ? "italic" : "normal" };
}

/** Resolve a theme color name; unknown names fall back to `text`. */
export function color(name: ColorName | undefined, fallback: ColorName = "text"): string {
  return colors[name ?? fallback] ?? colors[fallback];
}
