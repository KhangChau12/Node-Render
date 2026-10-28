import * as L from "lucide-react";
import React from "react";
import { z } from "zod";
import { parseProps, type KitEntry } from "../define";
import { colorSchema, effectSchema, enterStyle, linear } from "../primitives";
import { color, fonts, sizes, type ColorName } from "../theme";
import { atSchema, useAt, useSceneTime } from "../timing/context";
import { RichText } from "./richtext";

/*
 * A curated icon set (Lucide, ISC license) with short, guessable names, grouped
 * by subject so lectures outside math have pictures to work with.
 */

type IconComp = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

export const ICONS = {
  // people, school, society
  person: L.User, people: L.Users, baby: L.Baby, student: L.GraduationCap, book: L.BookOpen, pen: L.PenLine, idea: L.Lightbulb,
  question: L.CircleHelp, check: L.CircleCheck, cross: L.CircleX, warning: L.TriangleAlert, star: L.Star, heart: L.Heart,
  clock: L.Clock, calendar: L.Calendar, search: L.Search, target: L.Target, trophy: L.Trophy, flag: L.Flag, puzzle: L.Puzzle,
  home: L.House, school: L.School, building: L.Building2, factory: L.Factory, hospital: L.Hospital, money: L.Banknote, coins: L.Coins,
  cart: L.ShoppingCart, briefcase: L.Briefcase, scale: L.Scale, gavel: L.Gavel, handshake: L.Handshake, vote: L.Vote, newspaper: L.Newspaper,
  message: L.MessageCircle, mail: L.Mail, quote: L.Quote, languages: L.Languages, library: L.Library, theater: L.Drama, palette: L.Palette,
  brush: L.Brush, music: L.Music, mic: L.Mic, camera: L.Camera, film: L.Clapperboard, volume: L.Volume2,
  // technology
  phone: L.Smartphone, computer: L.Monitor, code: L.Code, database: L.Database, cpu: L.Cpu, wifi: L.Wifi, lock: L.Lock, key: L.Key,
  gear: L.Settings, cog: L.Cog, plug: L.Plug, rocket: L.Rocket, satellite: L.Satellite, calculator: L.Calculator,
  // transport, places, geography
  plane: L.Plane, ship: L.Ship, sailboat: L.Sailboat, anchor: L.Anchor, car: L.Car, train: L.TrainFront, bike: L.Bike, ambulance: L.Ambulance,
  map: L.Map, compass: L.Compass, pin: L.MapPin, route: L.Route, signpost: L.Signpost, globe: L.Globe, earth: L.Earth,
  mountain: L.Mountain, "snow-mountain": L.MountainSnow, tree: L.TreePine, forest: L.Trees, waves: L.Waves, wind: L.Wind, tornado: L.Tornado,
  sun: L.Sun, moon: L.Moon, cloud: L.Cloud, rain: L.CloudRain, storm: L.CloudLightning, "cloud-sun": L.CloudSun, rainbow: L.Rainbow,
  sunrise: L.Sunrise, sunset: L.Sunset, snowflake: L.Snowflake, thermometer: L.Thermometer, droplet: L.Droplet,
  wheat: L.Wheat, tractor: L.Tractor, pickaxe: L.Pickaxe, gem: L.Gem, fuel: L.Fuel, recycle: L.Recycle,
  // physics, chemistry
  atom: L.Atom, flask: L.FlaskConical, beaker: L.Beaker, "test-tube": L.TestTube, microscope: L.Microscope, telescope: L.Telescope, orbit: L.Orbit,
  magnet: L.Magnet, lightning: L.Zap, battery: L.Battery, flame: L.Flame, radiation: L.Radiation, biohazard: L.Biohazard, gauge: L.Gauge,
  ruler: L.Ruler, weight: L.Weight, hourglass: L.Hourglass, hexagon: L.Hexagon, hammer: L.Hammer, wrench: L.Wrench,
  // biology, health
  leaf: L.Leaf, sprout: L.Sprout, flower: L.Flower, apple: L.Apple, egg: L.Egg, milk: L.Milk, food: L.Utensils, fish: L.Fish, bird: L.Bird,
  bug: L.Bug, rabbit: L.Rabbit, cat: L.Cat, dog: L.Dog, paw: L.PawPrint, dna: L.Dna, brain: L.Brain, bone: L.Bone, pulse: L.HeartPulse,
  eye: L.Eye, ear: L.Ear, hand: L.Hand, footprints: L.Footprints, activity: L.Activity, syringe: L.Syringe, pill: L.Pill,
  stethoscope: L.Stethoscope, skull: L.Skull, siren: L.Siren, shirt: L.Shirt,
  // history
  crown: L.Crown, swords: L.Swords, sword: L.Sword, shield: L.Shield, castle: L.Castle, landmark: L.Landmark, scroll: L.Scroll,
  feather: L.Feather, tent: L.Tent, church: L.Church, bomb: L.Bomb,
  // math, data
  sigma: L.Sigma, infinity: L.Infinity, shapes: L.Shapes, "bar-chart": L.ChartBar, "line-chart": L.ChartLine, "pie-chart": L.ChartPie,
} as const satisfies Record<string, unknown>;

export type IconName = keyof typeof ICONS;
export const iconNames = Object.keys(ICONS) as [IconName, ...IconName[]];
export const iconSchema = z.enum(iconNames);

/** Draw an icon by name (used by Timeline, Cycle, Cards…). */
export function IconGlyph({ name, size, tone, strokeWidth = 1.8 }: { name: IconName; size: number; tone: ColorName; strokeWidth?: number }) {
  const C = ICONS[name] as unknown as IconComp;
  return <C size={size} color={color(tone)} strokeWidth={strokeWidth} />;
}

export const iconPropsSchema = z.object({
  name: iconSchema.describe("Icon name (see the list in the docs)"),
  size: z.number().min(32).max(360).default(120),
  color: colorSchema.default("text"),
  at: atSchema.default(0),
  effect: effectSchema.default("pop"),
  label: z.string().optional().describe("Text under the icon, supports $…$"),
  badge: z.boolean().default(false).describe("Put the icon in a filled circle"),
});

export function Icon(props: z.input<typeof iconPropsSchema>) {
  const p = parseProps("Icon", iconPropsSchema, props);
  const start = useAt(p.at);
  const t = useSceneTime();
  const fx = enterStyle(p.effect, linear(t, start, 0.6), 30);
  const tone = p.color as ColorName;
  const glyph = <IconGlyph name={p.name} size={p.badge ? p.size * 0.56 : p.size} tone={tone} />;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, ...fx }}>
      {p.badge ? (
        <div style={{ width: p.size, height: p.size, borderRadius: "50%", background: color("raised"), border: `3px solid ${color(tone)}`, display: "grid", placeItems: "center" }}>{glyph}</div>
      ) : (
        glyph
      )}
      {p.label ? (
        <div style={{ fontSize: sizes.small, color: color("text"), fontFamily: fonts.sans, textAlign: "center", maxWidth: Math.max(220, p.size * 1.8) }}>
          <RichText text={p.label} />
        </div>
      ) : null}
    </div>
  );
}

export const iconMeta: KitEntry = {
  name: "Icon",
  category: "primitive",
  summary: `A line icon by name, with a label and an entrance effect. Available names: ${iconNames.join(", ")}.`,
  useWhen: ["Illustrating concepts outside math: living things, weather, history, society", "A row of icons + arrows for a cause → effect chain (Row + Icon + Arrow)"],
  avoidWhen: ["Decoration without meaning", "More than ~6 icons at once"],
  example: "icons-chain.tsx",
  schema: iconPropsSchema,
};
