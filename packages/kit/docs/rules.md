# Lecture Kit: rules for writing scenes

You write ONE scene of a lecture video as a React component for Remotion, using the Lecture Kit.
The lecture can be about any subject: math, physics, chemistry, biology, history, geography, literature, computer science.
The viewer is a learner watching on a laptop. Every frame must be readable, uncluttered, and correct.

## File contract

```tsx
import { TitleWithVisual, ArrayViz } from "@kit";   // only "@kit", "remotion", "react" may be imported

export default function Scene() {
  return ( /* exactly one layout at the root */ );
}
```

- The root element is a layout: `TitleWithVisual` (default), `TwoColumn` (exactly two children), or `FullVisual`.
- Layouts handle margins, the title, the caption area at the bottom, and shrink content that would overflow. Never add outer padding.
- No `fetch`, timers, randomness, `Date`, `useState`/`useEffect`, or browser APIs. Rendering must be deterministic: the same frame always looks the same.
- No external images or fonts.
- The code is checked before it is saved. These are errors: `position: "absolute"`/`"fixed"`, `fontSize` below 24, widths above 1728 px, hex colors, cues that are not in the narration, imports from anywhere else.

## Layout: never place things by coordinates

Overlapping text is the most common failure of generated scenes. Avoid it structurally:

- Pick the kit component that already draws your idea; it computes its own positions (see the table below).
- To put several elements in one area, wrap them in `<Stack>` (vertical) or `<Row>` (horizontal). These are the only layout tools you need.
- Do not use `position: "absolute"`, negative margins, or `transform: translate` to move things around. Inline `<svg>` drawings are fine for small custom shapes.
- A faded-out element still takes its space. To show different things in the same place over time, use `<Switch at={[…]}>`, never several `FadeIn … outAt` stacked in a column. To move the highlight in code, use one `CodeBlock` with `steps`.
- In `TwoColumn`, each column is about 750 px wide: keep each side to one compact element (a `CodeBlock` of ≤ 10 short lines, `Cards`, a `Callout`, a small `ArrayViz`).
- One main visual per scene, plus at most one supporting element (a formula, a callout, a short note). If you need more, the scene is doing too much. Exception: a problem that truly needs several views at once (figure + working + graph) goes in `Panels` (2–4 compact frames), never in a hand-built grid.

Pick the component by what the narration is about. **Math and computer science:**

| What the narration is about | Use |
|---|---|
| Algorithm on an array: sorting, searching, pointers, partitions, divide and conquer | `ArrayViz` with `steps` (swap, compare, split) |
| Recursion, divide and conquer, binary trees, heaps | `Tree` |
| Graphs, processes, cause → effect | `Diagram` (with `pulses`, `highlights`) ; a short A → B chain: `Row` + `Arrow` |
| Functions, derivatives, integrals, limits | `Axes` with `Plot`, `Tangent`, `Point`, `AreaUnder`, `Riemann`; zoom with `view` (`Graph` is the older single-function shortcut) |
| Definition of the derivative (Δx → 0), average rate of change | `Axes` + `Secant` whose `x2` slides to `x1` |
| A parameter changing a curve ("as a grows…") | `Plot params` + `Slider` (same keyframes) + `LiveTex` for the live formula |
| Limits ε–δ, solution sets on the plane, confidence bands | `Region` (bands whose ends shrink) |
| Vectors, matrices, linear transformations, determinants | `Axes grid="plane" basis` with `Vector`, `Polygon`, and `matrix` |
| Complex functions, nonlinear maps of the plane | `Axes grid="plane"` + `warp` (`z²`: `fx: "x^2 - y^2", fy: "2*x*y"`) |
| Plane geometry: triangles, circles, angles, proofs by picture | `Axes axes={false} grid="none" equal` (or `Stage`) with `Polygon`, `Segment`, `Circle`, `Angle`, `Point`, `BraceBetween`; move or rotate a shape with `Group` |
| Solid geometry: pyramids, prisms, cubes, cross-sections | `Axes3D equal axes={false} floor={false}` + `Solid` (hidden edges become dashed by themselves); turn the camera with `azimuth` keyframes |
| Functions of two variables, surfaces, 3D curves and vectors | `Axes3D` + `Surface`, `Curve3D`, `Point3D`, `Vector3D`; `spin` for depth |
| Trigonometry, rotation, periodic motion | `Axes equal` + `Circle` + `Point x="cos(time)" y="sin(time)" trail` |
| Fourier series, sums of rotations | `Epicycles` with `show` adding circles |
| Differential equations, fields, flows | `Axes` + `VectorField` (with `particles`) |
| Integers, intervals, inequalities, sequences | `NumberLine` |
| Probability, base rates, "k out of n" | `DotGrid`; events and sets: `Venn` |
| Sets: union, intersection, complement | `Venn` with `steps` shading `A&B`, `A|B`, `A-B`, `!A` |
| Statistics, measured data, trends | `Axes` + `Scatter` (`connect` for a line chart, `fit` for regression); shares of a whole: `PieChart` |
| Solving an equation, algebraic rewriting | `MathMorph` (pieces slide to their new place); unrelated steps: `FormulaSteps`; one key formula: `Formula` |
| A worked solution with several steps and reasons | `Derivation` (lines aligned on `&=`, a reason per line, final answer framed) |
| Naming a part of a formula or a group of items | `Brace` around it; inside a figure: `BraceBetween` |
| Comparing 2–4 options | `Cards`; comparing on several criteria: `Table` |
| Quantities, growth, complexity at a glance; sorting shown as bar heights | `BarChart` (with `steps` for swaps) ; one big number: `Counter` |
| Dynamic programming tables, matrices entry by entry, grids, Punnett squares | `GridViz` (`set`, `focus`, `from` arrows, `rows`/`cols`; `matrix` for brackets) |
| Code | `CodeBlock` with `steps` |

**Natural sciences, social sciences, humanities:**

| What the narration is about | Use |
|---|---|
| Physics set-ups: blocks, springs, pendulums, inclined planes, forces, light rays, orbits | `Stage` with `Region` (bodies, ground, walls), `Spring`, `Vector` (forces), `Segment`, `Circle`, `Path` (rays, trajectories), `Label`; motion with `Group x="…time…"` or `rotate` |
| Physics or chemistry calculations | `Derivation`; units in TeX: `\text{m/s}`; chemistry: `\ce{…}` |
| Chemical equations | `Formula tex="\ce{2H2 + O2 -> 2H2O}"` (`\ce` works in every TeX prop) |
| Atoms, electron shells, ions | `Atom` (`highlight` the outer shell, `lose` / `gain` electrons) |
| Molecules, bonds, reactions happening | `Molecule` with `steps` (`break`, `move`, `form`) |
| Biological structures (cell, leaf, organ, food web drawn freely) | `Stage` + closed `Path` with `fill`, `Circle`, `Label` |
| Cycles: cell cycle, water cycle, life cycle, nitrogen cycle | `Cycle` (stages with icons, `active` follows the narration) |
| Hierarchies: classification, family trees, organisation | `Tree` |
| Processes and cause → effect chains | `Diagram`; a short chain with pictures: `Row` + `Icon` + `Arrow` |
| Dates, eras, sequences of events, biographies | `Timeline` (`proportional` for real gaps, `focus` on the event discussed) |
| Where something happened: countries, battles, voyages, migrations, trade | `WorldMap` (`highlights` countries, `markers` by longitude/latitude, `routes` drawn as arrows, `view` flies between regions) |
| Climate, population, economy data | `Axes` + `Scatter connect` (one series per color), `BarChart`, `PieChart` |
| Analysing a poem, a quote, a primary source | `Passage` (phrases marked one by one, numbered notes on the right) |
| A topic with several facets: causes / course / results / meaning; themes of a work | `MindMap` (2–6 branches, `focus`) |
| Comparing two concepts: shared and distinct traits | `Venn` (labels as text in each zone) or `Cards` / `Table` |

**Any subject:**

| What the narration is about | Use |
|---|---|
| A problem that needs several views at once | `Panels` (2–4 framed views with small titles, `focus` on the one discussed) |
| Marking the answer, crossing out a wrong option, circling a term | `Surround` (`box`, `circle`, `underline`, `strike`, `cross`) |
| A concept with a picture (weather, objects, people, places) | `Icon` (curated names, see the Icon entry) with `label`; never emoji |
| 2–5 short points, recap | `BulletReveal` |
| Definition, warning, key takeaway | `Callout` |
| Opening of the video or of a part | `TitleCard` inside `FullVisual` |

## Timing: sync with the narration

Every scene has narration. Kit components take an `at` prop saying WHEN they appear or change:

| `at` value | meaning |
|---|---|
| `2.5` | 2.5 s after the scene starts |
| `"cue:tiếp tuyến"` | when the narrator starts saying "tiếp tuyến" |
| `"cue:tiếp tuyến@end"` | when the narrator finishes "tiếp tuyến" |
| `"cue:tiếp tuyến+0.4"` | 0.4 s after the narrator starts saying it |
| `"end-1.5"` | 1.5 s before the scene ends |

- Prefer cues. Copy 1–3 consecutive words **exactly from the narration** (case and punctuation ignored). Pick distinctive words: if a phrase occurs twice, the first occurrence is used.
- Things appear when the narrator talks about them, not all at once at the start. Nothing important should appear in the last second.
- `ArrayViz` steps, `Tree` nodes, `Table` rows, `Cards` focus each take their own `at`: one narration sentence ↔ one step.
- Hooks for small custom elements: `useSceneTime()` (seconds), `useAt(at)`, `useProgress(at, duration)` (0→1 eased), `useIsAfter(at)`.

## Motion: make the scene alive

A lecture video is not a slide deck. Plan the scene as a sequence of **beats**: each narration sentence triggers at least one visible change, and the screen is never frozen for more than ~4 seconds while the narrator talks.

Use motion that carries meaning; pick from this vocabulary:

| The narration… | Motion |
|---|---|
| introduces a new element | `FadeIn` / `Stagger` / `BulletReveal` with an `effect` that fits: `pop` for objects and numbers, `left`/`right` for things arriving in sequence, `blur` for ideas and conclusions, `wipe` for a line of text or a formula, `flip` for a replaced value |
| performs an operation (swap, move, compare, split) | the data component's `steps`: `ArrayViz` swaps arc over each other, compared cells lift, `split` opens gaps for divide-and-conquer; `BarChart` steps swap and resize bars |
| follows a path or a flow | `Diagram` `pulses` (a dot travels along edges) and `highlights`; `Tree` `visit`; `Arrow` with `flow` |
| focuses on a detail | `Camera` zooms in, then back out when the narration returns to the big picture |
| stresses something ("chú ý", "quan trọng", a result) | `Pulse` (`scale`, `ring`, `glow`; `shake` for a mistake; `bounce` for a success) |
| gives a number or a growth | `Counter` counting up, with `steps` to jump again |
| replaces one thing by another (before → after, step 1 → step 2) | `Switch` with `effect` (`up`, `left`, `flip`, `zoom`) |
| makes room for what comes next | `Animate` keyframes: shrink or slide the old element aside |

Rules of good motion:
- One change at a time draws the eye; stagger related elements by 0.15–0.4 s instead of revealing everything together.
- Vary the entrances within a scene; do not use the default `up` for every element.
- Movements last 0.4–0.9 s. Nothing loops forever except an `Arrow` `flow`.
- Motion must follow the narration: an element moves when the narrator talks about it, never randomly.
- The background already drifts slowly and scenes cross-fade; you do not need to animate the background.

## Building any picture: Stage

When no ready-made component draws the idea (a physics set-up, a cell, a simplified map, a machine), draw it on a `Stage`: a free canvas in coordinate units (default 16 × 9 units, origin in the centre, y up, one unit the same length on both axes). Place shapes by coordinates, never by pixels:

- Bodies, ground, walls, water: `Region x={[a, b]} y={[c, d]}`. Polygons and triangles: `Polygon`. Round things: `Circle`. Free outlines (leaf, coast, river, organ, light ray, trajectory): `Path` with `points` (`smooth`, `closed` + `fill`, `arrow` at the end, `flow` for a moving dot). Springs: `Spring`. Forces and velocities: `Vector`. Names: `Label` or the `label` prop of the shape.
- Make things move with **expressions of `time`** (seconds since the Stage/Axes appeared; one clock for the whole figure, so parts stay in phase): `<Group x="2*sin(2.4*time)">` slides a body; `<Group rotate="25*sin(3*time)" about={[0, 3]}>` swings a pendulum around its pivot; `<Point x="3*cos(time)" y="3*sin(time)" trail={4}>` orbits and leaves a trace. Things that move together go in one `Group`.
- Make things change at a moment with keyframes (`[{ at: 0, value: 0 }, { at: "cue:…", value: 3 }]`) on `Group x`/`y`/`rotate`/`scale`, `Region` ends, `Point` coordinates.
- Plan the coordinates first: sketch the scene in units, keep 1 unit of margin at the edges, and keep labels clear of other shapes.

## Math visuals: show the idea moving

A good math animation does not show a finished picture; it builds it and then changes it, so the viewer *sees* why the result is true.

- **One coordinate system, many objects.** Put one `Axes` on screen and add objects to it one by one as the narration mentions them (each child has its own `at`). Inside `Axes` place only coordinate objects (`Plot`, `Point`, `Vector`, `Segment`, `Polygon`, `Circle`, `Angle`, `AreaUnder`, `Riemann`, `Tangent`, `VectorField`, `Label`); put formulas next to it in a `Stack`/`Row`.
- **Animate the quantity, not the slide.** When the narration varies something ("as x moves right", "as n grows", "as a increases"), give it keyframes instead of drawing several static pictures:
  - a point sliding along a curve: `Point x={[…]} on="x^2"`; a sliding tangent: `Tangent x={[…]} slope`;
  - a parameter bending a curve: `Plot fn="a*sin(x)" params={{ a: [...] }}`; one curve turning into another: `Plot morph`;
  - finer and finer approximations: `Riemann n={[{ at: 0, value: 4 }, { at: "cue:…", value: 16 }, …]}`;
  - zooming into a detail ("look closer"): `Axes view={[{ at, x: [..], y: [..] }]}`;
  - a linear map: `Axes grid="plane" basis matrix={[{ at, m: [[a, b], [c, d]] }]}`: the grid, vectors and shapes all follow.
- **Tracks** are the general tool: a number with keyframes `[{ at: 0, value: 1 }, { at: "cue:…", value: 3, duration?, ease? }]`. The first key is the start value; later keys animate to theirs. Props typed `Track` take one directly. For anything else, read it in the scene with `const a = useTrack(A)` and compute: `Math.cos(a)`, a label text `` `$a = ${a.toFixed(1)}$` ``. Define the keyframes once (`const A = [...]`) when both a prop and `useTrack` need them.
- **Equations move too.** Solve and rewrite with `MathMorph`: split each step into the same pieces (`["2x", "+3", "=", "7"]`), so a term moving across `=` visibly travels. Use `key` when a piece changes its text (`{ tex: "-3", key: "+3" }`). Keep 3–7 pieces per step; each piece is valid TeX on its own.
- **Color is meaning.** Give each quantity one color and keep it everywhere: the curve, its point, its label and the symbol in the formula. In TeX use the theme macros `\accent{…}`, `\info{…}`, `\ok{…}`, `\warn{…}`, `\err{…}`, `\muted{…}` (example: `tex="\info{f(x)} = x^2"` next to `<Plot color="info">`). Never write hex colors.
- **Write, don't pop, the key formula**: `Formula reveal="write"` for the formula the scene is building toward.
- **Let the viewer see the limit happen**: a `Secant` whose `x2` slides into `x1` becomes the tangent; a `Riemann` sum refines; an ε `Region` shrinks; `Epicycles` gain circles. Show the parameter on a `Slider` and the computed value in a `LiveTex` (`tex="m = {m}"`, `values={{ m: M }}`).
- **Space is 3D when the subject is**: in solid geometry use `Axes3D equal` + `Solid` with named points (`S`, `A`, `B`…, plus helper points `O`, `H`, `M`) and list the segments the narration talks about; hidden ones are dashed automatically. Turn the camera (`azimuth` keyframes) when the narration asks to "look from another side"; tint a face or a cross-section with `faces`.
- Expressions (`fn`, `x`, `y`, `fx`, `fy`) are strings over the variable (`x`, `t`, or `x, y`) plus named `params`: `"x^2 - 3x"`, `"a*cos(t)"`, `"sqrt(x)"`, `"exp(-x^2)"`. Write multiplication between letters explicitly (`a*x`, not `ax`). A JS function `(x) => …` also works.
- Keep the picture readable: at most 3 curves, ~8 labelled points, one moving thing at a time. Pick `x`/`y` ranges that frame the interesting part with a little margin.

## Subjects beyond math

- **Physics**: build the situation on a `Stage` (see above) and move it with `time`; put the computation next to it with `Derivation` (in a `Row`, or `Panels` when there is also a graph). Show forces as `Vector`s that move with the body (inside the same `Group`).
- **Chemistry**: equations with `\ce{…}` in any TeX prop (`"$\ce{H2O}$"` in a label, `tex="\ce{CaCO3 ->[t^\circ] CaO + CO2}"`); structure with `Atom` and `Molecule`; a reaction as `Molecule steps` (old bonds `break`, atoms `move`, new bonds `form`) with the equation written below.
- **Biology**: draw structures on a `Stage` with closed, filled `Path`s; processes with `Cycle` or `Diagram`; classification with `Tree`; genetics crosses with `GridViz`.
- **History**: `Timeline` for when, `WorldMap` for where (highlight countries, mark battles, draw campaign routes), `MindMap` for causes / results / meaning, `Passage` for a primary source.
- **Geography**: `WorldMap` (`view` from the world down to a region), climate and population data with `Scatter connect` or `BarChart`, shares with `PieChart`, natural cycles with `Cycle`.
- **Literature and languages**: `Passage` to read and annotate a text (mark the phrase when the narrator analyses it, one short note per mark), `MindMap` for themes and characters, `Cards` / `Table` to compare works or characters, `Venn` for shared and distinct traits.
- `Icon` gives a picture to any concept; prefer it to long text. Never use emoji.

## Complex problems: more than one picture

A hard problem is usually several simple pictures connected by one line of reasoning. Spread it over consecutive scenes (each continuing the previous state), and inside one scene:

- `Panels` for 2–4 simultaneous views (figure, working, graph, table), each kept compact (Axes ≤ 760 × 460); `focus` follows the narration from one panel to the next.
- `Derivation` for the chain of steps, each with its reason; `Surround` to frame the answer or cross out a wrong path.
- The same quantity keeps one color in every panel: the figure, the formula and the graph.

## Continuity between scenes

Scenes are cut together. When a scene continues the previous one (next steps of the same algorithm), start from the state the previous scene ended in: same `values` order, same title style. Do not restart the example.

## Style

- Colors: theme names only (`text`, `muted`, `faint`, `accent`, `ok`, `warn`, `err`, `info`, `surface`, `raised`, `grid`). In inline styles use `color("accent")`.
- `accent` marks the ONE thing to look at now. `ok` = correct/done, `err` = wrong/worst case, `info` = being examined.
- Fonts: `fonts.sans` (default), `fonts.mono` (numbers, code), `fonts.serif` (math variables, Latin only), `fonts.prose` (Vietnamese text in a serif face: poems, quotes). Sizes: `sizes.title` 68, `sizes.heading` 52, `sizes.body` 40, `sizes.small` 30. Nothing smaller than 24 px.
- At most ~12 words of prose on screen at once. The narration explains; the screen shows the idea.
- Math: `$…$` inside any kit text prop, or `Formula`. In a JSX attribute (`tex="\frac{a}{b}"`) write one backslash. Inside a JS string or array (`items={["$n\\log n$"]}`) write two, or use `String.raw`.
- Titles: ≤ 8 words, say the idea of the scene, not "Phần 3".

## When the kit is not enough

First try a `Stage`: almost any picture can be built from its shapes and moved with `Group` and `time`. Drive custom values with `useTrack` (see Math visuals). Compose primitives (`FadeIn`, `Stagger`, `Pulse`, `Animate`, `Counter`, `Arrow`, `Highlight`, `Typewriter`, `Surround`, `Icon`, `DrawPath` inside an `<svg>`) within `Stack`/`Row`. For a custom motion, read time with the hooks and Remotion's `interpolate` / `spring`. Keep custom code short.
