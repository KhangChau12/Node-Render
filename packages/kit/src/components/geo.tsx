import React, { useId } from "react";
import { feature } from "topojson-client";
import countries110 from "world-atlas/countries-110m.json";
import { z } from "zod";
import { parseProps, type KitEntry } from "../define";
import { contentLanguage, type ContentLanguage } from "../locale";
import { colorSchema, linear } from "../primitives";
import { color, ease, type ColorName } from "../theme";
import { atSchema, resolveAt, useSceneTime, useSceneTiming } from "../timing/context";
import { smoothPath, Tag } from "../math/svg";
import { RichText } from "./richtext";

/*
 * WorldMap: Natural Earth 1:110m country outlines (public domain, via the
 * world-atlas package) in a simple equirectangular projection. Countries are
 * highlighted by name, markers and routes are placed by longitude/latitude, and
 * the view can fly from one region to another.
 */

type Ring = [number, number][];
type Country = { name: string; rings: Ring[] };

let cache: Country[] | null = null;
function world(): Country[] {
  if (cache) return cache;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const topo = countries110 as any;
  const fc = feature(topo, topo.objects.countries) as unknown as { features: { properties: { name: string }; geometry: { type: string; coordinates: unknown } | null }[] };
  cache = fc.features.map((f) => {
    const g = f.geometry;
    const polys = !g ? [] : g.type === "Polygon" ? [g.coordinates as Ring[]] : (g.coordinates as Ring[][]);
    return { name: f.properties.name, rings: polys.flat() };
  });
  return cache;
}

/** Vietnamese names → Natural Earth names, so scene code can use either. */
const ALIASES: Record<string, string> = {
  "việt nam": "Vietnam", "trung quốc": "China", "lào": "Laos", "campuchia": "Cambodia", "thái lan": "Thailand", "myanmar": "Myanmar",
  "malaysia": "Malaysia", "indonesia": "Indonesia", "philippines": "Philippines", "brunei": "Brunei", "đông timor": "Timor-Leste",
  "nhật bản": "Japan", "hàn quốc": "South Korea", "triều tiên": "North Korea", "mông cổ": "Mongolia", "đài loan": "Taiwan", "ấn độ": "India",
  "mỹ": "United States of America", "hoa kỳ": "United States of America", "canada": "Canada", "mexico": "Mexico", "cuba": "Cuba", "brazil": "Brazil",
  "argentina": "Argentina", "chile": "Chile", "pháp": "France", "anh": "United Kingdom", "đức": "Germany", "nga": "Russia", "liên xô": "Russia",
  "ý": "Italy", "tây ban nha": "Spain", "bồ đào nha": "Portugal", "hà lan": "Netherlands", "bỉ": "Belgium", "thụy sĩ": "Switzerland",
  "áo": "Austria", "ba lan": "Poland", "ukraine": "Ukraine", "thụy điển": "Sweden", "na uy": "Norway", "phần lan": "Finland", "hy lạp": "Greece",
  "thổ nhĩ kỳ": "Turkey", "ai cập": "Egypt", "nam phi": "South Africa", "úc": "Australia", "new zealand": "New Zealand", "iran": "Iran",
  "iraq": "Iraq", "ả rập xê út": "Saudi Arabia", "israel": "Israel", "pakistan": "Pakistan", "bangladesh": "Bangladesh", "nepal": "Nepal",
  "sri lanka": "Sri Lanka", "kazakhstan": "Kazakhstan", "nigeria": "Nigeria", "ethiopia": "Ethiopia", "kenya": "Kenya", "algeria": "Algeria",
  "maroc": "Morocco", "hungary": "Hungary", "séc": "Czechia", "romania": "Romania", "bulgaria": "Bulgaria", "serbia": "Serbia", "ireland": "Ireland",
  "đan mạch": "Denmark", "iceland": "Iceland", "greenland": "Greenland", "peru": "Peru", "colombia": "Colombia", "venezuela": "Venezuela",
};

function findCountry(name: string): Country {
  const all = world();
  const target = ALIASES[name.trim().toLowerCase()] ?? name.trim();
  const hit = all.find((c) => c.name.toLowerCase() === target.toLowerCase());
  if (!hit) {
    const near = all.filter((c) => c.name.toLowerCase().includes(target.toLowerCase().slice(0, 4))).map((c) => c.name);
    throw new Error(`<WorldMap> has no country "${name}". Use the Natural Earth English name${near.length ? ` (close: ${near.slice(0, 4).join(", ")})` : ""} or a common Vietnamese name.`);
  }
  return hit;
}

type Box = [number, number, number, number]; // lon0, lon1, lat0, lat1

export const REGIONS: Record<string, Box> = {
  world: [-170, 190, -56, 80],
  asia: [25, 150, -12, 60],
  "east-asia": [95, 148, 15, 52],
  "southeast-asia": [90, 142, -12, 28],
  vietnam: [100, 120, 7, 24.5],
  europe: [-25, 45, 34, 71],
  africa: [-20, 55, -36, 38],
  "middle-east": [25, 65, 12, 42],
  "north-america": [-170, -50, 7, 75],
  "south-america": [-85, -32, -56, 14],
  americas: [-170, -30, -56, 75],
  oceania: [105, 180, -48, 5],
};

const regionSchema = z
  .union([z.enum(Object.keys(REGIONS) as [string, ...string[]]), z.tuple([z.number(), z.number(), z.number(), z.number()])])
  .describe(`View: ${Object.keys(REGIONS).join(", ")}; or [min longitude, max longitude, min latitude, max latitude]`);

const lonLat = z.tuple([z.number(), z.number()]).describe("[longitude, latitude], e.g. Hanoi [105.8, 21.0]");

export const worldMapSchema = z.object({
  region: regionSchema.default("world"),
  view: z.array(z.object({ at: atSchema, region: regionSchema })).default([]).describe("Fly to another region at `at` (world → Southeast Asia → Viet Nam)"),
  width: z.number().min(600).max(1728).default(1500),
  height: z.number().min(400).max(880).default(800),
  at: atSchema.default(0),
  highlights: z
    .array(z.object({ countries: z.array(z.string()).min(1), at: atSchema, color: colorSchema.default("accent"), label: z.string().optional().describe("Label placed on the first country"), outAt: atSchema.optional() }))
    .default([])
    .describe("Color countries with the narration (Natural Earth English names or common Vietnamese names)"),
  markers: z
    .array(z.object({ at: lonLat, label: z.string().optional(), when: atSchema, color: colorSchema.default("warn"), dir: z.enum(["u", "d", "l", "r", "ur", "ul", "dr", "dl"]).default("r") }))
    .default([])
    .describe("Markers (cities, battles); `when` is when they appear"),
  routes: z
    .array(z.object({ points: z.array(lonLat).min(2), when: atSchema, color: colorSchema.default("err"), label: z.string().optional(), duration: z.number().positive().default(1.8), dashed: z.boolean().default(false) }))
    .default([])
    .describe("Routes with an arrow (campaigns, migrations, trade, voyages), drawn progressively"),
  islands: z.boolean().default(true).describe("Draw the Paracel and Spratly archipelagos (Viet Nam) when they are in view"),
  transition: z.number().positive().default(1.8),
});

/** Paracel and Spratly archipelagos: a few dots each, enough to read at map scale. */
const ISLANDS: { name: Record<ContentLanguage, string>; pts: [number, number][]; label: [number, number] }[] = [
  { name: { vi: "QĐ. Hoàng Sa", en: "Paracel Is. (Viet Nam)" }, pts: [[111.6, 16.5], [112.3, 16.8], [112.0, 16.2], [111.2, 15.8], [112.7, 16.1], [111.8, 17.0]], label: [112.0, 16.5] },
  { name: { vi: "QĐ. Trường Sa", en: "Spratly Is. (Viet Nam)" }, pts: [[114.3, 10.4], [113.6, 9.6], [115.2, 9.9], [114.9, 10.9], [114.0, 8.8], [112.9, 8.6], [115.8, 10.4], [114.6, 11.4]], label: [114.4, 9.9] },
];

export function WorldMap(props: z.input<typeof worldMapSchema>) {
  const p = parseProps("WorldMap", worldMapSchema, props);
  const timing = useSceneTiming();
  const t = useSceneTime();
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const W = p.width;
  const H = p.height;
  const toBox = (r: z.output<typeof regionSchema>): Box => (typeof r === "string" ? REGIONS[r] : (r as Box));
  let v = toBox(p.region);
  for (const k of p.view) {
    const e = ease(linear(t, resolveAt(k.at, timing), p.transition));
    const b = toBox(k.region);
    v = v.map((x, i) => x + (b[i] - x) * e) as Box;
  }
  // Equirectangular projection, x compressed by cos(latitude) at the view centre; fit the box into W×H.
  const midLat = (v[2] + v[3]) / 2;
  const kx = Math.cos((midLat * Math.PI) / 180);
  const spanX = (v[1] - v[0]) * kx;
  const spanY = v[3] - v[2];
  const s = Math.min(W / spanX, H / spanY);
  const cx = (v[0] + v[1]) / 2;
  const proj = (lon: number, lat: number): [number, number] => [W / 2 + (lon - cx) * kx * s, H / 2 - (lat - midLat) * s];
  const start = resolveAt(p.at, timing);
  const k0 = ease(linear(t, start, 0.9));

  // Current fill of each highlighted country (later layers win).
  const fills = new Map<string, { tone: ColorName; k: number }>();
  for (const h of p.highlights) {
    const hk = ease(linear(t, resolveAt(h.at, timing), 0.6)) * (h.outAt === undefined ? 1 : 1 - ease(linear(t, resolveAt(h.outAt, timing), 0.5)));
    if (hk <= 0) continue;
    for (const n of h.countries) fills.set(findCountry(n).name, { tone: h.color as ColorName, k: hk });
  }
  const margin = 20;
  const inView = (r: Ring) => r.some(([lon, lat]) => lon >= v[0] - margin && lon <= v[1] + margin && lat >= v[2] - margin && lat <= v[3] + margin);
  const ringPath = (r: Ring) => {
    let d = "";
    let prev: number | null = null;
    for (const [lon, lat] of r) {
      const [x, y] = proj(lon, lat);
      // Break at the antimeridian instead of drawing a line across the map.
      d += `${prev === null || Math.abs(lon - prev) > 180 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
      prev = lon;
    }
    return `${d}Z`;
  };
  const shapes = world().map((c) => {
    const rings = c.rings.filter(inView);
    if (!rings.length) return null;
    const f = fills.get(c.name);
    const fill = f ? `color-mix(in srgb, ${color(f.tone)} ${Math.round(20 + 50 * f.k)}%, ${color("raised")})` : color("raised");
    return <path key={c.name} d={rings.map(ringPath).join("")} fill={fill} stroke={f ? color(f.tone) : color("grid")} strokeWidth={f ? 2 : 1.2} strokeLinejoin="round" fillRule="evenodd" />;
  });
  const vietnamFill = fills.get("Vietnam");
  const islands = p.islands
    ? ISLANDS.map((is) => {
        const [lx, ly] = proj(...is.label);
        if (lx < -50 || lx > W + 50 || ly < -50 || ly > H + 50) return null;
        const r = Math.max(2.5, Math.min(6, s * 0.05));
        return (
          <g key={is.name.en}>
            {is.pts.map((q, i) => {
              const [x, y] = proj(...q);
              return <circle key={i} cx={x} cy={y} r={r} fill={vietnamFill ? color(vietnamFill.tone) : color("muted")} />;
            })}
            {s > 25 ? (
              <Tag x={lx} y={ly} dir="r" size={24} tone="muted">
                {is.name[contentLanguage()]}
              </Tag>
            ) : null}
          </g>
        );
      })
    : null;

  const labels = p.highlights.map((h, i) => {
    if (!h.label) return null;
    const hk = ease(linear(t, resolveAt(h.at, timing) + 0.3, 0.5)) * (h.outAt === undefined ? 1 : 1 - ease(linear(t, resolveAt(h.outAt, timing), 0.5)));
    if (hk <= 0) return null;
    // Anchor: centre of the largest ring of the first country.
    const c = findCountry(h.countries[0]);
    const ring = [...c.rings].sort((a, b) => b.length - a.length)[0];
    const lon = ring.reduce((s2, q) => s2 + q[0], 0) / ring.length;
    const lat = ring.reduce((s2, q) => s2 + q[1], 0) / ring.length;
    const [x, y] = proj(lon, lat);
    return (
      <Tag key={`hl${i}`} x={x} y={y} dir="c" size={32} tone="text" opacity={hk}>
        <RichText text={h.label} />
      </Tag>
    );
  });

  const markers = p.markers.map((m, i) => {
    const ms = resolveAt(m.when, timing);
    const mk = ease(linear(t, ms, 0.5));
    if (mk <= 0) return null;
    const [x, y] = proj(...m.at);
    const ping = ((t - ms) % 1.6) / 1.6;
    const tone = m.color as ColorName;
    return (
      <g key={`m${i}`} opacity={mk}>
        <circle cx={x} cy={y} r={10 + 26 * ping} fill="none" stroke={color(tone)} strokeWidth={3} opacity={1 - ping} />
        <circle cx={x} cy={y} r={10 * (0.5 + 0.5 * mk)} fill={color(tone)} stroke={color("bg")} strokeWidth={3} />
        {m.label ? (
          <Tag x={x} y={y} dir={m.dir} size={30} tone="text">
            <RichText text={m.label} />
          </Tag>
        ) : null}
      </g>
    );
  });

  const routes = p.routes.map((r, i) => {
    const rk = linear(t, resolveAt(r.when, timing), r.duration);
    if (rk <= 0) return null;
    const pts = r.points.map((q) => proj(...q));
    const d = smoothPath(pts);
    const e = ease(rk);
    const a = pts[pts.length - 2];
    const b = pts[pts.length - 1];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const ux = (b[0] - a[0]) / L;
    const uy = (b[1] - a[1]) / L;
    const tone = r.color as ColorName;
    const lab = pts[Math.floor(pts.length / 2)];
    return (
      <g key={`r${i}`}>
        <path d={d} fill="none" stroke={color(tone)} strokeWidth={5} strokeLinecap="round" pathLength={rk < 1 ? 1 : undefined} strokeDasharray={rk < 1 ? `${e} 1` : r.dashed ? "14 10" : undefined} />
        {rk >= 0.97 ? <path d={`M${b[0]} ${b[1]} L${b[0] - ux * 24 - uy * 12} ${b[1] - uy * 24 + ux * 12} L${b[0] - ux * 24 + uy * 12} ${b[1] - uy * 24 - ux * 12} Z`} fill={color(tone)} /> : null}
        {r.label ? (
          <Tag x={lab[0]} y={lab[1]} dir="u" size={28} tone={tone} opacity={Math.max(0, (rk - 0.5) / 0.5)}>
            <RichText text={r.label} />
          </Tag>
        ) : null}
      </g>
    );
  });

  return (
    <div style={{ width: W, height: H, flex: "none", opacity: k0, borderRadius: 18, overflow: "hidden", background: `color-mix(in srgb, ${color("info")} 7%, ${color("bg")})` }}>
      <svg width={W} height={H} style={{ display: "block" }}>
        <defs>
          <clipPath id={`map${id}`}>
            <rect width={W} height={H} />
          </clipPath>
        </defs>
        <g clipPath={`url(#map${id})`}>
          {shapes}
          {islands}
          {routes}
          {markers}
          {labels}
        </g>
      </svg>
    </div>
  );
}

export const worldMapMeta: KitEntry = {
  name: "WorldMap",
  category: "component",
  summary:
    "World map (country borders at 1:110m): countries light up with the narration, markers by longitude/latitude (pulsing), routes with arrows drawn progressively, `view` flies from one region to another. Draws the Paracel and Spratly archipelagos.",
  useWhen: [
    "History: the extent of an empire, the countries at war, the direction of an advance, the Silk Road",
    "Geography: where a country is, economic regions, migration flows, sea routes",
    "Any lesson that needs to say \"where\"",
  ],
  avoidWhen: ["Detailed maps of provinces / cities (the data only has country borders)", "A simplified hand-drawn sketch: use Stage + Path"],
  example: "map-history.tsx",
  schema: worldMapSchema,
};
