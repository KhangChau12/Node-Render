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

# Components

`Color` = "bg" | "surface" | "raised" | "grid" | "text" | "muted" | "faint" | "accent" | "ok" | "warn" | "err" | "info". Props typed `number | string` named `at`/`draw`/`*At` take seconds or a cue (see Timing).

## Layouts (root of every scene)

### TitleWithVisual

Title on top, a large illustration area below. The default layout for most scenes.

- Use when: One main illustration: a plot, a formula, a diagram, a list
- Avoid when: Comparing two things side by side: use TwoColumn
- Children: One illustration (or one <div> holding several elements)

| prop | type | default | description |
|---|---|---|---|
| `title` | `string` | **required** | Scene title, at most ~8 words |
| `kicker` | `string` | – | Small label above the title |
| `at` | `number \| string` | `0` | Time: seconds, "cue:<phrase from the narration>", "cue:<phrase>@end", or "end-<seconds>" |
| `align` | `"center" \| "left"` | `"center"` | Alignment of the illustration |

### TwoColumn

Two columns side by side, with an optional title. Exactly two children: left, right.

- Use when: Before/after, right/wrong, two ways of solving; Formula on the left, graph on the right
- Avoid when: Only one illustration: use TitleWithVisual
- Children: Exactly two elements: left column, right column

| prop | type | default | description |
|---|---|---|---|
| `title` | `string` | – |  |
| `kicker` | `string` | – |  |
| `at` | `number \| string` | `0` | Time: seconds, "cue:<phrase from the narration>", "cue:<phrase>@end", or "end-<seconds>" |
| `ratio` | `number` | `0.5` | Width ratio of the left column |
| `divider` | `boolean` | `true` |  |

### FullVisual

The whole frame for one element, centered in the safe area.

- Use when: An opening TitleCard; One formula or a big question on its own
- Avoid when: A scene title is needed: use TitleWithVisual
- Children: One element

| prop | type | default | description |
|---|---|---|---|
| `align` | `"center" \| "left"` | `"center"` |  |

## Components

### TitleCard

A large title opening the lecture or a part of it, with a small label and a subtitle.

- Use when: The opening scene of the video; Moving on to a new part of the lecture
- Avoid when: A title above an illustration: use the TitleWithVisual layout

| prop | type | default | description |
|---|---|---|---|
| `title` | `string` | **required** |  |
| `kicker` | `string` | – | Small label above, e.g. "Lesson 3 · Derivatives" |
| `subtitle` | `string` | – |  |
| `at` | `number \| string` | `0` | Time: seconds, "cue:<phrase from the narration>", "cue:<phrase>@end", or "end-<seconds>" |
| `align` | `"left" \| "center"` | `"left"` |  |

### BulletReveal

A list of points appearing one by one, optionally numbered, with earlier points dimmed.

- Use when: Listing 2–5 short points; End-of-lesson summary
- Avoid when: More than 5 points or points longer than 12 words: split into several scenes

| prop | type | default | description |
|---|---|---|---|
| `items` | `string \| { text: string; at?: number \| string }[]` | **required** | The points; each is a string or { text, at }. Supports $…$ for math |
| `at` | `number \| string` | `0` | When the first point appears (points without their own `at` follow `gap` apart) |
| `gap` | `number` | `0.8` |  |
| `size` | `"display" \| "title" \| "heading" \| "body" \| "small" \| "caption" \| "label"` | `"body"` |  |
| `numbered` | `boolean` | `false` |  |
| `focus` | `boolean` | `false` | Dim earlier points when a new one appears |
| `effect` | `"up" \| "down" \| "left" \| "right" \| "fade" \| "pop" \| "zoom" \| "blur" \| "wipe" \| "flip"` | `"left"` | How each point appears |

### Formula

Shows a math formula (LaTeX via KaTeX) with an entrance effect.

- Use when: Formulas, definitions, equations
- Avoid when: A formula transformed over several steps: use FormulaSteps; A small symbol inside a sentence: write $…$ in the text

| prop | type | default | description |
|---|---|---|---|
| `tex` | `string` | **required** | LaTeX formula. In a JSX attribute (tex="…") write \ once; in a JS string use String.raw`…` |
| `at` | `number \| string` | `0` | Time: seconds, "cue:<phrase from the narration>", "cue:<phrase>@end", or "end-<seconds>" |
| `size` | `number` | `72` | Font size (px) |
| `color` | `Color` | `"text"` |  |
| `align` | `"left" \| "center"` | `"center"` |  |
| `reveal` | `"fade" \| "write"` | `"fade"` | fade: fades in; write: appears left to right as if being written |
| `duration` | `number` | – | Time to appear (seconds); 0.7 for fade by default, by length for write |

### FormulaSteps

Transforms a formula over several steps, each appearing with the narration.

- Use when: Proofs, simplifications, step-by-step calculations
- Avoid when: Only one formula: use Formula

| prop | type | default | description |
|---|---|---|---|
| `steps` | `{ tex: string; at: number \| string }[]` | **required** | Transformation steps; each step replaces the previous one at `at` |
| `size` | `number` | `72` |  |
| `color` | `Color` | `"text"` |  |
| `keepPrevious` | `boolean` | `false` | Keep earlier steps (dimmed) above instead of replacing them |

### MathMorph

Equation rewriting by "matching symbols": the formula is split into pieces, pieces present in both steps slide to their new place (moving a term across, factoring out), new pieces appear, removed ones fade out.

- Use when: Solving an equation step by step: moving terms across, multiplying both sides, simplifying; Algebra where the viewer needs to see where each term goes
- Avoid when: A formula on its own: use Formula; Steps with nothing in common: use FormulaSteps

| prop | type | default | description |
|---|---|---|---|
| `steps` | `{ at: number \| string; tokens: string \| { tex: string; key?: string; color?: Color }[] }[]` | **required** | Each step is one line of the formula split into pieces. Pieces with the same TeX (or the same key) in two steps slide to their new place |
| `size` | `number` | `80` |  |
| `color` | `Color` | `"text"` |  |
| `duration` | `number` | `1.1` | Duration of each transformation (seconds) |
| `spacing` | `number` | `0.12` | Extra space between pieces (em) |

### Derivation

A multi-line solution aligned on "=" (with &): each line is written with the narration, its reason on the right; earlier lines dim, the final answer is framed.

- Use when: Multi-step problems: solving equations, proofs, integrals, physics / chemistry exercises; When viewers need the earlier steps on screen to compare
- Avoid when: To see each term move: use MathMorph; One formula: use Formula

| prop | type | default | description |
|---|---|---|---|
| `lines` | `{ tex: string; at: number \| string; note?: string; tone?: Color; result?: boolean }[]` | **required** |  |
| `size` | `number` | `54` |  |
| `dim` | `boolean` | `true` | Dim earlier lines so the eye follows the new one |

### Axes

A coordinate system holding math objects placed by coordinates (Plot, Point, Vector, Segment, Polygon, Circle, AreaUnder, Riemann, Tangent, VectorField, Angle, Label). `view` zooms/pans into a region and `matrix` transforms the whole plane.

- Use when: Functions, several curves, points moving on a graph, sliding tangents, areas, Riemann sums; Vectors, linear transformations, determinants (grid="plane" + matrix + basis); Plane geometry with coordinates: triangles, circles, angles (axes={false} grid="none"); Zooming into a point to see the curve become almost straight (view)
- Avoid when: Block diagrams, processes: use Diagram; Statistics: use BarChart
- Children: Coordinate objects only (Plot, Point, Vector, Segment, Polygon, Circle, AreaUnder, Riemann, Tangent, VectorField, Angle, Label)

| prop | type | default | description |
|---|---|---|---|
| `x` | `[number, number]` | `[-5,5]` | x range shown [min, max] |
| `y` | `[number, number]` | – | y range; when empty it is chosen so 1 x unit = 1 y unit, centered on 0 |
| `width` | `number` | `1300` |  |
| `height` | `number` | `720` |  |
| `at` | `number \| string` | `0` | When the axes appear (they draw out from the origin) |
| `axes` | `boolean` | `true` | Draw the two axes; false for pure geometry (shapes only, no axes) |
| `grid` | `"none" \| "subtle" \| "plane"` | `"subtle"` | subtle: faint grid; plane: clear blue coordinate plane (linear algebra); none |
| `ticks` | `boolean` | `true` | Numbers on the axes |
| `tickStep` | `[number, number]` | – | Tick step [x, y]; leave empty to choose automatically |
| `labels` | `[string, string]` | `["x","y"]` | Axis names, support $…$ |
| `equal` | `boolean` | `false` | Keep 1 x unit = 1 y unit (circles look round); the box shrinks to keep the ratio |
| `view` | `{ at: number \| string; x: [number, number]; y: [number, number] }[]` | `[]` | Math camera: at `at` the view window glides to a new x, y range (zoom into a point on a curve, zoom back out) |
| `matrix` | `{ at: number \| string; m: [[number, number], [number, number]] }[]` | `[]` | Linear transformation of the whole plane: grid, vectors, points and shapes all follow. Each key is relative to the original matrix, not cumulative |
| `basis` | `boolean` | `false` | Show the basis vectors î (ok) and ĵ (err), following `matrix` |
| `warp` | `{ at: number \| string; fx: string; fy: string }[]` | `[]` | NONLINEAR transformation of the whole plane: the point (x, y) goes to (fx, fy) and the grid bends with it. Complex map w = z²: { fx: "x^2 - y^2", fy: "2*x*y" }. Each key is relative to the original plane |
| `transition` | `number` | `1.6` | Duration of each view/matrix change (seconds) |

### Stage

A free stage (no axes, 1 x unit = 1 y unit, 16 × 9 units by default, origin in the center) for BUILDING PICTURES in any subject: place shapes by coordinates (Polygon, Circle, Path, Region, Spring, Vector, Segment, Point, Label), move them with Group / time, zoom with `view`.

- Use when: Physics: inclined planes, pendulums, springs, forces (Vector), light through lenses, planetary orbits; Biology / geography: hand-drawn pictures (cells, leaves, rivers, simplified maps, wind directions) with Path, Circle, Label; Geometry without axes; a situation with concrete positions
- Avoid when: Block diagrams with arrows: use Diagram (lays itself out); Function graphs: use Axes
- Children: Coordinate objects as in Axes (including Group)

| prop | type | default | description |
|---|---|---|---|
| `x` | `[number, number]` | `[-8,8]` | Horizontal coordinate range; 16 units by default |
| `y` | `[number, number]` | `[-4.5,4.5]` | Vertical coordinate range; 9 units by default (16:9) |
| `width` | `number` | `1600` |  |
| `height` | `number` | `800` |  |
| `at` | `number \| string` | `0` | Time: seconds, "cue:<phrase from the narration>", "cue:<phrase>@end", or "end-<seconds>" |
| `grid` | `boolean` | `false` | Show a faint grid |
| `view` | `{ at: number \| string; x: [number, number]; y: [number, number] }[]` | `[]` | Math camera: at `at` the view window glides to a new x, y range (zoom into a point on a curve, zoom back out) |
| `transition` | `number` | `1.6` | Duration of each view/matrix change (seconds) |

### Axes3D

3D space seen through a camera that can orbit (`azimuth`, `elevation` by keyframes, `spin` turns by itself). Holds Surface, Curve3D, Point3D, Vector3D, Segment3D, Solid.

- Use when: Solid geometry: pyramids, prisms, boxes (Solid, equal); hidden edges are dashed automatically; Functions of two variables z = f(x, y), surfaces, saddle points, extrema (Surface); Vectors in space, space curves (helices), 3D trajectories
- Avoid when: Everything lies in one plane: a 2D Axes is clearer
- Children: 3D objects only (Surface, Curve3D, Point3D, Vector3D, Segment3D, Solid)

| prop | type | default | description |
|---|---|---|---|
| `x` | `[number, number]` | `[-3,3]` |  |
| `y` | `[number, number]` | `[-3,3]` |  |
| `z` | `[number, number]` | `[-3,3]` |  |
| `width` | `number` | `1200` |  |
| `height` | `number` | `760` |  |
| `at` | `number \| string` | `0` | Time: seconds, "cue:<phrase from the narration>", "cue:<phrase>@end", or "end-<seconds>" |
| `equal` | `boolean` | `false` | The same scale on all three axes (REQUIRED for solid geometry so shapes are not distorted); false: each axis fits the box (surfaces, graphs) |
| `azimuth` | `number \| { at: number \| string; value: number; duration?: number; ease?: "smooth" \| "linear" \| "spring" }[]` | `-125` | Camera rotation around the z axis (degrees); keyframes to orbit |
| `elevation` | `number \| { at: number \| string; value: number; duration?: number; ease?: "smooth" \| "linear" \| "spring" }[]` | `22` | Camera elevation above the xy plane (degrees, -80…80) |
| `spin` | `number` | `0` | Steady rotation around the z axis, degrees per second (e.g. 8), so the viewer feels the depth |
| `zoom` | `number \| { at: number \| string; value: number; duration?: number; ease?: "smooth" \| "linear" \| "spring" }[]` | `1` | A fixed number, or keyframes [{ at: 0, value: 1 }, { at: "cue:…", value: 3 }]: the first key is the starting value, each later key moves smoothly to its value |
| `axes` | `boolean` | `true` | Draw the three axes x, y, z |
| `floor` | `boolean` | `true` | Faint grid on the plane z = 0 (or the floor of the box) |
| `labels` | `[string, string, string]` | `["x","y","z"]` |  |

### Graph

A function plot with axes and grid: the curve draws itself, moving tangents/secants, points and shaded areas.

- Use when: Functions, slope, derivatives, extrema, integrals; A secant sliding into a tangent
- Avoid when: Statistical data charts; Plane geometry or diagrams: use Diagram

| prop | type | default | description |
|---|---|---|---|
| `fn` | `string` | **required** | Expression in x: "x^2", "sin(x)", "2x+1", "sqrt(x)"; supports sin cos tan sqrt abs exp ln log pi e |
| `domain` | `[number, number]` | `[-5,5]` | x range shown |
| `range` | `[number, number]` | – | y range; leave empty to compute it |
| `at` | `number \| string` | `0` | When the axes appear |
| `draw` | `number \| string` | – | When the curve starts drawing (defaults to at) |
| `drawDuration` | `number` | `1.6` |  |
| `color` | `Color` | `"text"` |  |
| `label` | `string` | – | Curve label, e.g. "y = x²" |
| `axisLabels` | `[string, string]` | `["x","y"]` |  |
| `grid` | `boolean` | `true` |  |
| `width` | `number` | `1300` |  |
| `height` | `number` | `760` |  |
| `tangent` | `{ x: number; to?: number; at?: number \| string; moveAt?: number \| string; moveDuration?: number }` | – | Tangent at x, can slide to `to` |
| `secant` | `{ x1: number; x2: number; at?: number \| string; shrinkAt?: number \| string; shrinkTo?: number; shrinkDuration?: number; becomesTangentColor?: Color }` | – | Secant through two points; the second point can slide to the first to illustrate the derivative |
| `points` | `{ x: number; label?: string; at?: number \| string; color?: Color }[]` | `[]` |  |
| `showSlope` | `boolean` | `false` | Show the slope of the tangent/secant |
| `slopeLabel` | `string` | `"Slope"` |  |
| `area` | `{ from: number; to: number; at?: number \| string; color?: Color }` | – | Shade the area under the curve from `from` to `to` |

### NumberLine

A number line with automatic ticks: points moving by keyframes, arc jumps (addition/subtraction, sequences), shaded intervals for solution sets, zooming into a region.

- Use when: Integers, addition and subtraction, absolute value; Solution sets of inequalities (closed/open endpoints); Convergent sequences, zooming in around the limit
- Avoid when: When a y axis is needed: use Axes

| prop | type | default | description |
|---|---|---|---|
| `range` | `[number, number]` | `[-5,5]` | Range shown [min, max] |
| `step` | `number` | – | Tick step; leave empty to choose automatically |
| `width` | `number` | `1400` |  |
| `at` | `number \| string` | `0` | Time: seconds, "cue:<phrase from the narration>", "cue:<phrase>@end", or "end-<seconds>" |
| `ticks` | `boolean` | `true` | Show numbers under the ticks |
| `view` | `{ at: number \| string; range: [number, number] }[]` | `[]` | Zoom/pan the number line to a new range at `at` (e.g. zoom in around √2) |
| `points` | `{ x: number \| { at: number \| string; value: number; duration?: number; ease?: "smooth" \| "linear" \| "spring" }[]; label?: string; color?: Color; at?: number \| string }[]` | `[]` |  |
| `jumps` | `{ from: number; to: number; at: number \| string; label?: string; color?: Color }[]` | `[]` | An arc jump from `from` to `to` (addition, subtraction, sequences) |
| `intervals` | `{ from: number; to: number; at?: number \| string; color?: Color; closed?: [boolean, boolean]; label?: string }[]` | `[]` | A highlighted interval on the line (solution set of an inequality) |
| `transition` | `number` | `1.4` |  |

### ArrayViz

An array of cells driven step by step, animated: swaps (two cells arc around each other), inserts, writes, compared cells lifting, i/j pointers sliding, pivot, current range, region brackets, splitting into chunks (divide and conquer), cells bouncing when placed. Computes every position itself, text never overlaps.

- Use when: Algorithms on arrays: sorting (quick, merge, insertion, bubble), binary search, two pointers, sliding window; Step-by-step simulation, one step per narration sentence
- Avoid when: More than 16 elements; More than ~10 steps in one scene: split the scene; the next scene starts from the previous end state (pass the new values)

| prop | type | default | description |
|---|---|---|---|
| `values` | `number \| string[]` | **required** | Initial values, at most 16 cells |
| `steps` | `{ at: number \| string; swap?: [integer, integer]; move?: [integer, integer]; set?: { index: integer; value: number \| string }[]; pointers?: object; compare?: integer[]; pivot?: integer \| null; done?: integer[]; range?: [integer, integer] \| null; regions?: { from: integer; to: integer; label?: string; tone?: Color }[]; note?: string; split?: integer[] }[]` | `[]` | Steps in time order |
| `at` | `number \| string` | `0` | When the array appears |
| `label` | `string` | – | Array name shown on the left, e.g. "A" |
| `showIndices` | `boolean` | `true` |  |
| `pointerTones` | `object` | `{}` | Color of each pointer, e.g. { i: "ok", j: "info" } |
| `width` | `number` | `1500` | Maximum width (px) |
| `transition` | `number` | `0.6` | Duration of each step's motion (seconds) |

### Tree

A tree that lays itself out (just declare parents): recursion trees, binary trees, classification trees. Nodes grow in, edges draw themselves; `visit` makes nodes bounce and light up in traversal order.

- Use when: Recursion trees of quick sort / merge sort / Fibonacci; Binary search trees, heaps, decision trees
- Avoid when: Graphs with cycles or several parents: use Diagram; More than ~20 nodes

| prop | type | default | description |
|---|---|---|---|
| `nodes` | `{ id: string; label: string; parent: string \| null; at?: number \| string; tone?: Color; toneAt?: number \| string }[]` | **required** |  |
| `at` | `number \| string` | `0` | Default time; nodes without `at` appear in traversal order, `gap` apart |
| `gap` | `number` | `0.35` |  |
| `width` | `number` | `1500` |  |
| `height` | `number` | `640` |  |
| `size` | `number` | `34` | Maximum font size in a node (shrinks when tight) |
| `visit` | `{ id: string; at: number \| string; tone?: Color }[]` | `[]` | Traversal: nodes bounce and light up in turn (DFS, BFS, a search path). The node being visited has a glowing ring |

### Diagram

Block diagram / discrete graph: nodes and arrows draw themselves in turn; `pulses` send a bright dot along edges, `highlights` recolor nodes with the narration (BFS, Dijkstra, data flow).

- Use when: Processes, cause → effect chains; Graphs in algorithms (Dijkstra, BFS); Concept maps
- Avoid when: Function graphs: use Graph; More than 10 nodes: split the scene

| prop | type | default | description |
|---|---|---|---|
| `nodes` | `{ id: string; label: string; x: number; y: number; at?: number \| string; tone?: Color; shape?: "box" \| "circle" }[]` | **required** |  |
| `edges` | `{ from: string; to: string; label?: string; at?: number \| string; tone?: Color; directed?: boolean }[]` | `[]` |  |
| `pulses` | `{ from: string; to: string; at: number \| string; tone?: Color; duration?: number }[]` | `[]` | A bright dot travelling along the edge from→to at time at: data/signal passing through, a BFS/DFS step |
| `highlights` | `{ id: string; at: number \| string; tone?: Color }[]` | `[]` | Recolor a node's outline at time at (with a small bounce). The node keeps the color until changed again |
| `at` | `number \| string` | `0` | Default time for nodes/edges without `at` |
| `gap` | `number` | `0.3` | Delay between nodes appearing one by one |
| `width` | `number` | `1500` |  |
| `height` | `number` | `720` |  |
| `nodeSize` | `number` | `34` | Font size in the nodes |

### BarChart

A bar chart that grows in; with `steps` bars swap (sliding past each other), change height, lift when compared, turn green when done: sorting shown with bars.

- Use when: Comparing quantities, running times, numbers of comparisons; Sorting algorithms shown with bar heights (bubble, selection, insertion); Values changing over time
- Avoid when: A continuous function: use Graph; More than 16 bars; When i/j pointers and indices are needed: use ArrayViz

| prop | type | default | description |
|---|---|---|---|
| `bars` | `{ label: string; value: number; tone?: Color; at?: number \| string; valueLabel?: string }[]` | **required** |  |
| `at` | `number \| string` | `0` | When the first bar grows (bars without `at` follow `gap` apart) |
| `gap` | `number` | `0.4` |  |
| `steps` | `{ at: number \| string; swap?: [integer, integer]; set?: { index: integer; value: number }[]; compare?: integer[]; done?: integer[]; tone?: { index: integer; tone: Color }[] }[]` | `[]` | Steps in time: swap, change height, compare, mark done |
| `max` | `number` | – | Value at full height; the largest value by default |
| `width` | `number` | `1300` |  |
| `height` | `number` | `560` |  |
| `showValues` | `boolean` | `true` |  |
| `unit` | `string` | `""` | Unit written after the number, e.g. " ms" |
| `transition` | `number` | `0.6` |  |

### Table

Comparison table: column headers, rows appear one by one, one row can be highlighted.

- Use when: Comparing several options on a few criteria (complexity, stability, memory); A table of x and f(x) values
- Avoid when: More than 8 rows or 6 columns: split the scene; Cells with long sentences: use Cards

| prop | type | default | description |
|---|---|---|---|
| `columns` | `string[]` | **required** | Column header, supports $…$ |
| `rows` | `{ cells: string[]; at?: number \| string; tone?: Color; toneAt?: number \| string }[]` | **required** |  |
| `at` | `number \| string` | `0` | When the table (column headers) appears; rows without `at` follow `gap` apart |
| `gap` | `number` | `0.5` |  |
| `width` | `number` | `1500` |  |
| `size` | `number` | `34` | Font size in the cells |

### Cards

2–4 cards side by side, each with a name and a few short points; cards can be highlighted in turn.

- Use when: Comparing 2–4 options, variants or strategies (Lomuto vs Hoare, pivot choices); Pros and cons
- Avoid when: Just one list of points: use BulletReveal; Comparing many criteria in a grid: use Table

| prop | type | default | description |
|---|---|---|---|
| `cards` | `{ title: string; points?: string[]; tone?: Color; at?: number \| string }[]` | **required** |  |
| `at` | `number \| string` | `0` | Time: seconds, "cue:<phrase from the narration>", "cue:<phrase>@end", or "end-<seconds>" |
| `gap` | `number` | `0.6` | Delay between cards appearing (seconds) |
| `focus` | `{ index: integer; at: number \| string }[]` | `[]` | Highlight one card at a time (the others dim) at these moments |
| `width` | `number` | – | Width (px); fills the container by default. Cards wrap when tight |

### DotGrid

A grid of dots (or squares) to count and talk about probability: groups are colored one by one with the narration, with counts.

- Use when: Probability, "1 in 100" rates, Bayes' theorem, false positives; Percentages, fractions you can see, sample spaces
- Avoid when: Comparing large numbers between groups: use BarChart

| prop | type | default | description |
|---|---|---|---|
| `count` | `integer` | **required** | Total number of dots (e.g. 100 people) |
| `cols` | `integer` | – | Number of columns; leave empty to choose automatically |
| `shape` | `"dot" \| "square"` | `"dot"` |  |
| `size` | `number` | – | Size of each dot (px); chosen from the count by default |
| `at` | `number \| string` | `0` | When the dots appear (spreading in) |
| `groups` | `{ count: integer; color: Color; at: number \| string; label?: string }[]` | `[]` | Color in turn: each group colors the next `count` dots at `at`. E.g. 1 sick person in 100 |
| `legend` | `boolean` | `true` | Show a legend of the groups (label + count) below |

### Callout

A highlighted note box: definition, caution, tip, common mistake.

- Use when: A short definition to remember; Warning about a common mistake
- Avoid when: The main content of a long scene: use BulletReveal

| prop | type | default | description |
|---|---|---|---|
| `text` | `string` | **required** | Content, supports $…$ |
| `title` | `string` | – |  |
| `tone` | `"accent" \| "info" \| "ok" \| "warn" \| "err"` | `"accent"` |  |
| `at` | `number \| string` | `0` | Time: seconds, "cue:<phrase from the narration>", "cue:<phrase>@end", or "end-<seconds>" |
| `width` | `number` | `900` |  |

### CodeBlock

A code block with line numbers: lines appear one by one, important lines are highlighted.

- Use when: Programming and algorithm lectures
- Avoid when: Math formulas: use Formula; More than 18 lines: trim or split the scene

| prop | type | default | description |
|---|---|---|---|
| `code` | `string` | **required** |  |
| `title` | `string` | – | File name shown above |
| `at` | `number \| string` | `0` | Time: seconds, "cue:<phrase from the narration>", "cue:<phrase>@end", or "end-<seconds>" |
| `lineGap` | `number` | `0.25` | Seconds between lines appearing; 0 to show all at once |
| `highlight` | `integer[]` | `[]` | Lines (counting from 1) to highlight |
| `highlightAt` | `number \| string` | – | When the highlight starts |
| `steps` | `{ at: number \| string; highlight: integer[] }[]` | `[]` | Move the highlight with the narration: [{ at, highlight: [3] }, { at, highlight: [8] }]. Use this instead of several CodeBlocks |
| `size` | `number` | `30` |  |

### Timeline

Horizontal timeline: events appear one by one with the narration, labels alternate above/below, with icons; `focus` highlights one event.

- Use when: History: the course of events, dynasties, campaigns; An author's life, the history of an invention, stages of development
- Avoid when: Steps of a process not tied to dates: use Diagram or Cycle

| prop | type | default | description |
|---|---|---|---|
| `events` | `{ date: string; label: string; at: number \| string; tone?: Color; icon?: "person" \| "people" \| "baby" \| "student" \| "book" \| "pen" \| "idea" \| "question" \| "check" \| "cross" \| "warning" \| "star" \| "heart" \| "clock" \| "calendar" \| "search" \| "target" \| "trophy" \| "flag" \| "puzzle" \| "home" \| "school" \| "building" \| "factory" \| "hospital" \| "money" \| "coins" \| "cart" \| "briefcase" \| "scale" \| "gavel" \| "handshake" \| "vote" \| "newspaper" \| "message" \| "mail" \| "quote" \| "languages" \| "library" \| "theater" \| "palette" \| "brush" \| "music" \| "mic" \| "camera" \| "film" \| "volume" \| "phone" \| "computer" \| "code" \| "database" \| "cpu" \| "wifi" \| "lock" \| "key" \| "gear" \| "cog" \| "plug" \| "rocket" \| "satellite" \| "calculator" \| "plane" \| "ship" \| "sailboat" \| "anchor" \| "car" \| "train" \| "bike" \| "ambulance" \| "map" \| "compass" \| "pin" \| "route" \| "signpost" \| "globe" \| "earth" \| "mountain" \| "snow-mountain" \| "tree" \| "forest" \| "waves" \| "wind" \| "tornado" \| "sun" \| "moon" \| "cloud" \| "rain" \| "storm" \| "cloud-sun" \| "rainbow" \| "sunrise" \| "sunset" \| "snowflake" \| "thermometer" \| "droplet" \| "wheat" \| "tractor" \| "pickaxe" \| "gem" \| "fuel" \| "recycle" \| "atom" \| "flask" \| "beaker" \| "test-tube" \| "microscope" \| "telescope" \| "orbit" \| "magnet" \| "lightning" \| "battery" \| "flame" \| "radiation" \| "biohazard" \| "gauge" \| "ruler" \| "weight" \| "hourglass" \| "hexagon" \| "hammer" \| "wrench" \| "leaf" \| "sprout" \| "flower" \| "apple" \| "egg" \| "milk" \| "food" \| "fish" \| "bird" \| "bug" \| "rabbit" \| "cat" \| "dog" \| "paw" \| "dna" \| "brain" \| "bone" \| "pulse" \| "eye" \| "ear" \| "hand" \| "footprints" \| "activity" \| "syringe" \| "pill" \| "stethoscope" \| "skull" \| "siren" \| "shirt" \| "crown" \| "swords" \| "sword" \| "shield" \| "castle" \| "landmark" \| "scroll" \| "feather" \| "tent" \| "church" \| "bomb" \| "sigma" \| "infinity" \| "shapes" \| "bar-chart" \| "line-chart" \| "pie-chart" }[]` | **required** | Events in time order; labels alternate above/below the axis so they never overlap |
| `at` | `number \| string` | `0` | When the time axis appears |
| `width` | `number` | `1600` |  |
| `proportional` | `boolean` | `false` | Place events in proportion to the year (date must be a number); evenly spaced by default |
| `focus` | `{ at: number \| string; index: integer \| null }[]` | `[]` | Highlight one event (the others dim); index null to clear |

### Cycle

A cycle: stages (with icons) around a circle, curved arrows from one to the next, a dot travelling around; `active` highlights the stage being discussed.

- Use when: Biology: cell cycle, life cycles, Krebs cycle, nitrogen cycle; Geography: water cycle, rock cycle; Economics, society: feedback loops
- Avoid when: A process with a start and an end: use Diagram; More than 8 stages

| prop | type | default | description |
|---|---|---|---|
| `stages` | `{ label: string; at: number \| string; icon?: "person" \| "people" \| "baby" \| "student" \| "book" \| "pen" \| "idea" \| "question" \| "check" \| "cross" \| "warning" \| "star" \| "heart" \| "clock" \| "calendar" \| "search" \| "target" \| "trophy" \| "flag" \| "puzzle" \| "home" \| "school" \| "building" \| "factory" \| "hospital" \| "money" \| "coins" \| "cart" \| "briefcase" \| "scale" \| "gavel" \| "handshake" \| "vote" \| "newspaper" \| "message" \| "mail" \| "quote" \| "languages" \| "library" \| "theater" \| "palette" \| "brush" \| "music" \| "mic" \| "camera" \| "film" \| "volume" \| "phone" \| "computer" \| "code" \| "database" \| "cpu" \| "wifi" \| "lock" \| "key" \| "gear" \| "cog" \| "plug" \| "rocket" \| "satellite" \| "calculator" \| "plane" \| "ship" \| "sailboat" \| "anchor" \| "car" \| "train" \| "bike" \| "ambulance" \| "map" \| "compass" \| "pin" \| "route" \| "signpost" \| "globe" \| "earth" \| "mountain" \| "snow-mountain" \| "tree" \| "forest" \| "waves" \| "wind" \| "tornado" \| "sun" \| "moon" \| "cloud" \| "rain" \| "storm" \| "cloud-sun" \| "rainbow" \| "sunrise" \| "sunset" \| "snowflake" \| "thermometer" \| "droplet" \| "wheat" \| "tractor" \| "pickaxe" \| "gem" \| "fuel" \| "recycle" \| "atom" \| "flask" \| "beaker" \| "test-tube" \| "microscope" \| "telescope" \| "orbit" \| "magnet" \| "lightning" \| "battery" \| "flame" \| "radiation" \| "biohazard" \| "gauge" \| "ruler" \| "weight" \| "hourglass" \| "hexagon" \| "hammer" \| "wrench" \| "leaf" \| "sprout" \| "flower" \| "apple" \| "egg" \| "milk" \| "food" \| "fish" \| "bird" \| "bug" \| "rabbit" \| "cat" \| "dog" \| "paw" \| "dna" \| "brain" \| "bone" \| "pulse" \| "eye" \| "ear" \| "hand" \| "footprints" \| "activity" \| "syringe" \| "pill" \| "stethoscope" \| "skull" \| "siren" \| "shirt" \| "crown" \| "swords" \| "sword" \| "shield" \| "castle" \| "landmark" \| "scroll" \| "feather" \| "tent" \| "church" \| "bomb" \| "sigma" \| "infinity" \| "shapes" \| "bar-chart" \| "line-chart" \| "pie-chart"; tone?: Color }[]` | **required** | Stages clockwise, starting at the top |
| `center` | `string` | – | Text in the middle of the ring (name of the cycle) |
| `size` | `number` | `800` |  |
| `active` | `{ at: number \| string; index: integer \| null }[]` | `[]` | Highlight the stage being discussed |
| `flow` | `boolean` | `true` | Once all stages are in, a bright dot travels around the ring |

### MindMap

Mind map: the central idea in the middle, 2–6 branches (one color each, with icon and 2–3 sub-points) growing out on both sides with the narration; `focus` highlights one branch.

- Use when: A topic with many facets: causes / course / results / significance; Literature: characters, themes and craft of a work; End-of-lesson review
- Avoid when: Directed relations between blocks: use Diagram; Deep hierarchies: use Tree

| prop | type | default | description |
|---|---|---|---|
| `center` | `string` | **required** | The central idea |
| `branches` | `{ label: string; items?: string[]; at: number \| string; tone?: Color; icon?: "person" \| "people" \| "baby" \| "student" \| "book" \| "pen" \| "idea" \| "question" \| "check" \| "cross" \| "warning" \| "star" \| "heart" \| "clock" \| "calendar" \| "search" \| "target" \| "trophy" \| "flag" \| "puzzle" \| "home" \| "school" \| "building" \| "factory" \| "hospital" \| "money" \| "coins" \| "cart" \| "briefcase" \| "scale" \| "gavel" \| "handshake" \| "vote" \| "newspaper" \| "message" \| "mail" \| "quote" \| "languages" \| "library" \| "theater" \| "palette" \| "brush" \| "music" \| "mic" \| "camera" \| "film" \| "volume" \| "phone" \| "computer" \| "code" \| "database" \| "cpu" \| "wifi" \| "lock" \| "key" \| "gear" \| "cog" \| "plug" \| "rocket" \| "satellite" \| "calculator" \| "plane" \| "ship" \| "sailboat" \| "anchor" \| "car" \| "train" \| "bike" \| "ambulance" \| "map" \| "compass" \| "pin" \| "route" \| "signpost" \| "globe" \| "earth" \| "mountain" \| "snow-mountain" \| "tree" \| "forest" \| "waves" \| "wind" \| "tornado" \| "sun" \| "moon" \| "cloud" \| "rain" \| "storm" \| "cloud-sun" \| "rainbow" \| "sunrise" \| "sunset" \| "snowflake" \| "thermometer" \| "droplet" \| "wheat" \| "tractor" \| "pickaxe" \| "gem" \| "fuel" \| "recycle" \| "atom" \| "flask" \| "beaker" \| "test-tube" \| "microscope" \| "telescope" \| "orbit" \| "magnet" \| "lightning" \| "battery" \| "flame" \| "radiation" \| "biohazard" \| "gauge" \| "ruler" \| "weight" \| "hourglass" \| "hexagon" \| "hammer" \| "wrench" \| "leaf" \| "sprout" \| "flower" \| "apple" \| "egg" \| "milk" \| "food" \| "fish" \| "bird" \| "bug" \| "rabbit" \| "cat" \| "dog" \| "paw" \| "dna" \| "brain" \| "bone" \| "pulse" \| "eye" \| "ear" \| "hand" \| "footprints" \| "activity" \| "syringe" \| "pill" \| "stethoscope" \| "skull" \| "siren" \| "shirt" \| "crown" \| "swords" \| "sword" \| "shield" \| "castle" \| "landmark" \| "scroll" \| "feather" \| "tent" \| "church" \| "bomb" \| "sigma" \| "infinity" \| "shapes" \| "bar-chart" \| "line-chart" \| "pie-chart" }[]` | **required** | Branches; the first half on the right, the rest on the left |
| `at` | `number \| string` | `0` | Time: seconds, "cue:<phrase from the narration>", "cue:<phrase>@end", or "end-<seconds>" |
| `width` | `number` | `1600` |  |
| `height` | `number` | `780` |  |
| `focus` | `{ at: number \| string; index: integer \| null }[]` | `[]` |  |

### Passage

An excerpt of prose, verse or a source document: it appears, then phrases are highlighted, underlined or circled with the narration, with numbered analysis notes in the right column.

- Use when: Literature: analysing lines of a poem, figures of speech, well-chosen words; History: quoting a primary source (a declaration, an edict, a proclamation); Languages: pointing out grammar structures in a sentence
- Avoid when: Passages longer than ~70 words: split across scenes; A short definition: use Callout

| prop | type | default | description |
|---|---|---|---|
| `text` | `string` | **required** | Excerpt / lines of verse (line breaks with \n in a JS string). At most ~70 words |
| `source` | `string` | – | Author and work: "— Nguyễn Du, The Tale of Kiều" |
| `at` | `number \| string` | `0` | Time: seconds, "cue:<phrase from the narration>", "cue:<phrase>@end", or "end-<seconds>" |
| `marks` | `{ phrase: string; at: number \| string; color?: Color; mode?: "marker" \| "underline" \| "circle" \| "text"; note?: string }[]` | `[]` |  |
| `size` | `number` | `44` |  |
| `serif` | `boolean` | `true` | Serif type (literature); false for informational text |
| `width` | `number` | `1000` | Width of the text block (px) |

### Venn

Venn diagram of 2–3 sets: circles draw themselves, regions are shaded by expression (A&B, A|B, A-B, !A) step by step, with counts in each region.

- Use when: Sets: intersection, union, difference, complement; Probability: intersections and unions of events, the addition rule; Comparing two concepts: what is unique and what is shared (biology, literature, history)
- Avoid when: More than 3 sets; Comparing on many criteria: use Table

| prop | type | default | description |
|---|---|---|---|
| `sets` | `{ label: string; color?: Color }[]` | **required** | 2 or 3 sets; in expressions they are A, B, C in order |
| `at` | `number \| string` | `0` | Time: seconds, "cue:<phrase from the narration>", "cue:<phrase>@end", or "end-<seconds>" |
| `universe` | `string` | – | Label of the universal set (outer rectangle), e.g. "Class 10A" |
| `steps` | `{ at: number \| string; shade: string; color?: Color }[]` | `[]` | Each step shades one region (replacing the previous one) |
| `values` | `{ in: string; text: string; at: number \| string }[]` | `[]` | A number or text placed in a region: element count, probability, a typical member |
| `width` | `number` | `1000` |  |
| `height` | `number` | `680` |  |

### PieChart

Pie / donut chart: slices sweep in one by one, legend with percentages, `focus` pulls a slice out.

- Use when: Shares and structure: economic sectors, composition of air, population structure; Percentages of a whole
- Avoid when: Comparing sizes between items or over time: use BarChart / Scatter connect

| prop | type | default | description |
|---|---|---|---|
| `slices` | `{ label: string; value: number; color?: Color }[]` | **required** |  |
| `at` | `number \| string` | `0` | When the slices sweep in one after another |
| `size` | `number` | `560` |  |
| `donut` | `boolean` | `true` |  |
| `center` | `string` | – | Text in the middle of the ring (donut) |
| `percent` | `boolean` | `true` | Show percentages in the legend |
| `focus` | `{ at: number \| string; index: integer \| null }[]` | `[]` | Pull a slice out and dim the others |

### GridViz

A 2D grid of cells driven by steps: fill values (cells flip), highlight the cell being computed, arrows from the cells it depends on, highlight rows/columns, mark cells done; `matrix` for a bracketed matrix.

- Use when: Dynamic programming: LCS, knapsack, counting paths (from → focus); Matrices: row × column products, Gaussian elimination; Game boards, Punnett squares (genetics), multiplication tables
- Avoid when: Tables of text comparing criteria: use Table; One-dimensional arrays: use ArrayViz

| prop | type | default | description |
|---|---|---|---|
| `values` | `number \| string \| null[][]` | **required** | Values by row; null = empty cell (filled later with steps.set) |
| `rowLabels` | `string[]` | – |  |
| `colLabels` | `string[]` | – |  |
| `at` | `number \| string` | `0` | Time: seconds, "cue:<phrase from the narration>", "cue:<phrase>@end", or "end-<seconds>" |
| `reveal` | `"all" \| "rows" \| "cells"` | `"all"` | How the table appears: all at once, row by row, cell by cell |
| `matrix` | `boolean` | `false` | Matrix style: no cell borders, square brackets on both sides |
| `width` | `number` | `1000` |  |
| `cell` | `number` | – | Cell size (px); computed from width by default |
| `steps` | `{ at: number \| string; set?: { r: integer; c: integer; v: number \| string }[]; focus?: [integer, integer][]; from?: [integer, integer][]; rows?: integer[]; cols?: integer[]; done?: [integer, integer][]; note?: string }[]` | `[]` |  |

### WorldMap

World map (country borders at 1:110m): countries light up with the narration, markers by longitude/latitude (pulsing), routes with arrows drawn progressively, `view` flies from one region to another. Draws the Paracel and Spratly archipelagos.

- Use when: History: the extent of an empire, the countries at war, the direction of an advance, the Silk Road; Geography: where a country is, economic regions, migration flows, sea routes; Any lesson that needs to say "where"
- Avoid when: Detailed maps of provinces / cities (the data only has country borders); A simplified hand-drawn sketch: use Stage + Path

| prop | type | default | description |
|---|---|---|---|
| `region` | `"world" \| "asia" \| "east-asia" \| "southeast-asia" \| "vietnam" \| "europe" \| "africa" \| "middle-east" \| "north-america" \| "south-america" \| "americas" \| "oceania" \| [number, number, number, number]` | `"world"` | View: world, asia, east-asia, southeast-asia, vietnam, europe, africa, middle-east, north-america, south-america, americas, oceania; or [min longitude, max longitude, min latitude, max latitude] |
| `view` | `{ at: number \| string; region: "world" \| "asia" \| "east-asia" \| "southeast-asia" \| "vietnam" \| "europe" \| "africa" \| "middle-east" \| "north-america" \| "south-america" \| "americas" \| "oceania" \| [number, number, number, number] }[]` | `[]` | Fly to another region at `at` (world → Southeast Asia → Viet Nam) |
| `width` | `number` | `1500` |  |
| `height` | `number` | `800` |  |
| `at` | `number \| string` | `0` | Time: seconds, "cue:<phrase from the narration>", "cue:<phrase>@end", or "end-<seconds>" |
| `highlights` | `{ countries: string[]; at: number \| string; color?: Color; label?: string; outAt?: number \| string }[]` | `[]` | Color countries with the narration (Natural Earth English names or common Vietnamese names) |
| `markers` | `{ at: [number, number]; label?: string; when: number \| string; color?: Color; dir?: "u" \| "d" \| "l" \| "r" \| "ur" \| "ul" \| "dr" \| "dl" }[]` | `[]` | Markers (cities, battles); `when` is when they appear |
| `routes` | `{ points: [number, number][]; when: number \| string; color?: Color; label?: string; duration?: number; dashed?: boolean }[]` | `[]` | Routes with an arrow (campaigns, migrations, trade, voyages), drawn progressively |
| `islands` | `boolean` | `true` | Draw the Paracel and Spratly archipelagos (Viet Nam) when they are in view |
| `transition` | `number` | `1.8` |  |

### Atom

Bohr model of an atom: nucleus, electron shells appearing one by one and orbiting; highlight the outer shell; `lose` / `gain` send electrons out / in to make ions.

- Use when: Atomic structure, electron configuration, valence electrons; Ionic bonding: Na loses 1 electron, Cl gains 1 (two Atoms in a Row + Arrow)
- Avoid when: Bonds within a molecule: use Molecule

| prop | type | default | description |
|---|---|---|---|
| `symbol` | `string` | **required** | Nucleus symbol, e.g. "Na" or "11+" |
| `shells` | `integer[]` | **required** | Electrons per shell from the inside out, e.g. Na: [2, 8, 1] |
| `at` | `number \| string` | `0` | When the nucleus appears; the electron shells follow one by one |
| `size` | `number` | `560` |  |
| `spin` | `boolean` | `true` | Electrons orbit the nucleus |
| `highlight` | `{ at: number \| string; shell: integer }[]` | `[]` | Highlight a shell (the outer shell / valence electrons) |
| `lose` | `{ at: number \| string; count?: integer }` | – | The outer shell loses electrons (they fly away): a positive ion |
| `gain` | `{ at: number \| string; count?: integer }` | – | The outer shell gains electrons (they fly in): a negative ion |
| `label` | `string` | – | Name under the atom, supports $…$ |
| `color` | `Color` | `"accent"` |  |

### Molecule

A 2D ball-and-stick molecule (colored by element): atoms pop in, single/double/triple bonds draw themselves; `steps` move atoms, break bonds (dashed, then fading) and form new ones: the reaction happens on screen.

- Use when: Molecular structure: H₂O, CO₂, CH₄, C₂H₄; Reactions: 2H₂ + O₂ → 2H₂O (old bonds break, atoms rearrange, new bonds form); Isomers, functional groups (organic chemistry)
- Avoid when: Only the equation is needed: use Formula with \ce{…}; Molecules with more than ~40 atoms

| prop | type | default | description |
|---|---|---|---|
| `atoms` | `{ id: string; el: string; x: number; y: number; charge?: string }[]` | **required** | Atoms with 2D coordinates (unit = bond length, y up). E.g. H₂O: O(0,0), H(-0.8,-0.6), H(0.8,-0.6) |
| `bonds` | `{ a: string; b: string; order?: integer }[]` | `[]` | Initial bonds (single, double, triple) |
| `at` | `number \| string` | `0` | When the molecule appears (atoms pop in, bonds draw after) |
| `steps` | `{ at: number \| string; move?: object; break?: string[]; form?: { a: string; b: string; order?: integer }[]; highlight?: string[]; note?: string }[]` | `[]` | How the reaction unfolds with the narration |
| `scale` | `number` | `120` | Pixels per unit (bond length) |
| `labels` | `boolean` | `true` | Write the element symbol on each ball |

## Inside <Axes> (math objects placed by coordinates)

### Plot

A curve y = f(x) in Axes: draws itself, parameters change over time (`params`), morphs into another function (`morph`).

- Use when: Function graphs; several functions on the same axes (one color each); Showing how a parameter reshapes the graph: a·sin(x) as a grows; Morphing x² → x³
- Avoid when: Parametric curves x(t), y(t): use Parametric

| prop | type | default | description |
|---|---|---|---|
| `fn` | `string \| function` | **required** | Expression string ("x^2 - 1", "a*sin(x)") or a JS function ((x) => …) |
| `params` | `object` | `{}` | Parameters in the expression, which can change over time: { a: [{ at: 0, value: 1 }, { at: "cue:larger", value: 3 }] } |
| `domain` | `[number, number]` | – | Draw only within this x range |
| `at` | `number \| string` | – | When the curve starts drawing (right after the axes by default) |
| `drawDuration` | `number` | `1.6` |  |
| `color` | `Color` | `"info"` |  |
| `width` | `number` | `5` |  |
| `dashed` | `boolean` | `false` |  |
| `label` | `string` | – | Curve label, e.g. "$f(x)=x^2$" |
| `labelX` | `number` | – | x position of the label (near the right end by default) |
| `labelDir` | `"c" \| "u" \| "d" \| "l" \| "r" \| "ur" \| "ul" \| "dr" \| "dl"` | `"ur"` | Label direction relative to the point: u d l r ur ul dr dl, c = centered |
| `morph` | `{ at: number \| string; fn: string \| function }[]` | `[]` | Morph: at `at` the curve bends smoothly into a new function |
| `outAt` | `number \| string` | – | When the curve fades out |

### Parametric

A parametric curve (x(t), y(t)) in Axes, traced as if by a moving pen.

- Use when: Circles, ellipses, spirals, Lissajous curves, trajectories; Curves that are not graphs of functions
- Avoid when: y = f(x): use Plot; A simple circle: use Circle

| prop | type | default | description |
|---|---|---|---|
| `x` | `string \| function` | **required** | x as a function of t, e.g. "cos(t)" |
| `y` | `string \| function` | **required** | y as a function of t, e.g. "sin(t)" |
| `t` | `[number, number]` | `[0,6.2832]` | Parameter range of t |
| `params` | `object` | `{}` |  |
| `at` | `number \| string` | – | Time: seconds, "cue:<phrase from the narration>", "cue:<phrase>@end", or "end-<seconds>" |
| `drawDuration` | `number` | `2` |  |
| `color` | `Color` | `"warn"` |  |
| `width` | `number` | `5` |  |
| `fill` | `Color` | – | Fill the inside (closed curves) |
| `samples` | `integer` | `500` |  |

### Point

A point in Axes with a label; `x` can move by keyframes, `on` keeps the point on a curve, `coords` shows live coordinates.

- Use when: Marking points, roots, extrema, intersections; A point sliding along a graph with the narration; Vertices in geometry (A, B, C)
- Avoid when: More than ~8 points: use one Plot or group them

| prop | type | default | description |
|---|---|---|---|
| `x` | `number \| { at: number \| string; value: number; duration?: number; ease?: "smooth" \| "linear" \| "spring" }[] \| string` | **required** | x: a number, keyframes to make the point move, or an expression of time ("2*cos(time)") |
| `y` | `number \| { at: number \| string; value: number; duration?: number; ease?: "smooth" \| "linear" \| "spring" }[] \| string` | – | y; leave empty when using `on` |
| `on` | `string \| function` | – | The point stays on the curve y = on(x): only x needs to move |
| `params` | `object` | `{}` |  |
| `at` | `number \| string` | – | Time: seconds, "cue:<phrase from the narration>", "cue:<phrase>@end", or "end-<seconds>" |
| `color` | `Color` | `"accent"` |  |
| `size` | `number` | `11` |  |
| `label` | `string` | – | Label, e.g. "$A$" or "$(2, 4)$" |
| `labelDir` | `"c" \| "u" \| "d" \| "l" \| "r" \| "ur" \| "ul" \| "dr" \| "dl"` | `"ur"` | Label direction relative to the point: u d l r ur ul dr dl, c = centered |
| `coords` | `boolean` | `false` | The label shows the current (x, y), updating as the point moves |
| `guides` | `boolean` | `false` | Dashed guide lines down to both axes |
| `trail` | `number` | `0` | Trail: redraws the path the point travelled in the last N seconds (60 = the whole path). Only works when x/y are keyframes or expressions, not numbers computed with useTrack |
| `trailColor` | `Color` | – |  |
| `outAt` | `number \| string` | – | Time: seconds, "cue:<phrase from the narration>", "cue:<phrase>@end", or "end-<seconds>" |

### Vector

A vector arrow in Axes, growing from its origin; components can move by keyframes; follows the Axes `matrix` transformation.

- Use when: Vectors, vector addition (put `from` at the tip of the other), forces, velocities; Linear transformations: vectors follow the matrix
- Avoid when: Arrows between blocks: use Arrow or Diagram

| prop | type | default | description |
|---|---|---|---|
| `x` | `number \| { at: number \| string; value: number; duration?: number; ease?: "smooth" \| "linear" \| "spring" }[] \| string` | **required** | x component: a number, keyframes, or an expression of time |
| `y` | `number \| { at: number \| string; value: number; duration?: number; ease?: "smooth" \| "linear" \| "spring" }[] \| string` | **required** | y component |
| `from` | `[number, number]` | `[0,0]` | Origin of the vector |
| `at` | `number \| string` | – | Time: seconds, "cue:<phrase from the narration>", "cue:<phrase>@end", or "end-<seconds>" |
| `color` | `Color` | `"accent"` |  |
| `label` | `string` | – | E.g. "$\\vec v$" |
| `labelDir` | `"c" \| "u" \| "d" \| "l" \| "r" \| "ur" \| "ul" \| "dr" \| "dl"` | – | Label direction relative to the point: u d l r ur ul dr dl, c = centered |
| `width` | `number` | `6` |  |
| `components` | `boolean` | `false` | Show the x, y components as dashed lines |

### Segment

A segment (or a line with `extend`) between two coordinate points, drawing itself, with a label at its middle.

- Use when: Sides in geometry, altitudes, medians; Secants through two points, connecting lines, distances
- Avoid when: Closed polygons: use Polygon

| prop | type | default | description |
|---|---|---|---|
| `from` | `[number, number]` | **required** |  |
| `to` | `[number, number]` | **required** |  |
| `at` | `number \| string` | – | Time: seconds, "cue:<phrase from the narration>", "cue:<phrase>@end", or "end-<seconds>" |
| `color` | `Color` | `"text"` |  |
| `width` | `number` | `4` |  |
| `dashed` | `boolean` | `false` |  |
| `extend` | `boolean` | `false` | Extend into a full line through the two points |
| `label` | `string` | – | Label at the middle of the segment, e.g. the length "$c$" |
| `labelDir` | `"c" \| "u" \| "d" \| "l" \| "r" \| "ur" \| "ul" \| "dr" \| "dl"` | `"u"` | Label direction relative to the point: u d l r ur ul dr dl, c = centered |
| `duration` | `number` | `0.7` |  |

### Polygon

A polygon (triangle, square…) by the coordinates of its vertices: the outline draws itself, then the inside is filled.

- Use when: Geometry: triangles, squares on the sides (Pythagoras), the parallelogram of a determinant
- Avoid when: Area under a curve: use AreaUnder

| prop | type | default | description |
|---|---|---|---|
| `points` | `[number, number][]` | **required** | Vertices [[x, y], …] |
| `closed` | `boolean` | `true` |  |
| `at` | `number \| string` | – | Time: seconds, "cue:<phrase from the narration>", "cue:<phrase>@end", or "end-<seconds>" |
| `color` | `Color` | `"info"` |  |
| `fill` | `Color \| "none"` | `"none"` | Fill color inside (translucent) |
| `width` | `number` | `4` |  |
| `label` | `string` | – | Label at the centroid, e.g. the area "$S$" |
| `duration` | `number` | `1.2` |  |

### Circle

A circle from a center and radius in coordinates, drawn around once; the radius can move by keyframes.

- Use when: The unit circle, circumscribed circles, ε-neighbourhoods
- Avoid when: Ellipses or other curves: use Parametric

| prop | type | default | description |
|---|---|---|---|
| `center` | `[number, number]` | `[0,0]` |  |
| `r` | `number \| { at: number \| string; value: number; duration?: number; ease?: "smooth" \| "linear" \| "spring" }[]` | **required** | Radius (coordinate units), can move by keyframes |
| `at` | `number \| string` | – | Time: seconds, "cue:<phrase from the narration>", "cue:<phrase>@end", or "end-<seconds>" |
| `color` | `Color` | `"info"` |  |
| `fill` | `Color \| "none"` | `"none"` |  |
| `width` | `number` | `4` |  |
| `dashed` | `boolean` | `false` |  |
| `duration` | `number` | `1.2` |  |

### Angle

An angle mark at a vertex (a translucent arc, or a small square for a right angle) with a label.

- Use when: Geometry: angles of a triangle, right angles, the rotation angle θ on the unit circle
- Avoid when: When there are no two clear sides to mark an angle between

| prop | type | default | description |
|---|---|---|---|
| `vertex` | `[number, number]` | **required** | Vertex of the angle |
| `from` | `[number, number]` | **required** | A point on the first side |
| `to` | `[number, number]` | **required** | A point on the second side |
| `at` | `number \| string` | – | Time: seconds, "cue:<phrase from the narration>", "cue:<phrase>@end", or "end-<seconds>" |
| `radius` | `number` | `56` | Arc radius (px) |
| `color` | `Color` | `"warn"` |  |
| `label` | `string` | – | E.g. "$\\alpha$" |
| `right` | `boolean` | – | Draw a right-angle mark (detected automatically when the angle ≈ 90°) |

### AreaUnder

Shades the area under a curve (or between two curves) from `from` to `to`, sweeping from the left; the bounds can move by keyframes.

- Use when: Integrals, areas, probability under a density curve; A moving upper bound to illustrate the accumulation function
- Avoid when: Approximation by rectangles: use Riemann

| prop | type | default | description |
|---|---|---|---|
| `fn` | `string \| function` | **required** | Expression string ("x^2 - 1", "a*sin(x)") or a JS function ((x) => …) |
| `params` | `object` | `{}` |  |
| `from` | `number \| { at: number \| string; value: number; duration?: number; ease?: "smooth" \| "linear" \| "spring" }[]` | **required** | Lower bound (can move) |
| `to` | `number \| { at: number \| string; value: number; duration?: number; ease?: "smooth" \| "linear" \| "spring" }[]` | **required** | Upper bound (can move) |
| `lower` | `string \| function` | – | Lower curve (area between two curves); the x axis by default |
| `at` | `number \| string` | – | When the shading sweeps from left to right |
| `color` | `Color` | `"info"` |  |
| `opacity` | `number` | `0.3` |  |
| `label` | `string` | – | Label in the middle of the region, e.g. "$S$" |

### Riemann

Riemann sum: rectangles under the curve grow from the axis; `n` keyframes refine them so the sum visibly approaches the area.

- Use when: Definition of the integral, approximating areas, limits as n → ∞
- Avoid when: Just shading an area: use AreaUnder

| prop | type | default | description |
|---|---|---|---|
| `fn` | `string \| function` | **required** | Expression string ("x^2 - 1", "a*sin(x)") or a JS function ((x) => …) |
| `params` | `object` | `{}` |  |
| `from` | `number` | **required** |  |
| `to` | `number` | **required** |  |
| `n` | `number \| { at: number \| string; value: number; duration?: number; ease?: "smooth" \| "linear" \| "spring" }[]` | **required** | Number of rectangles; keyframes to refine: [{ at: 0, value: 4 }, { at: "cue:more", value: 16 }] |
| `rule` | `"left" \| "right" \| "mid"` | `"left"` | Take the height at the left edge, the right edge or the middle |
| `at` | `number \| string` | – | Time: seconds, "cue:<phrase from the narration>", "cue:<phrase>@end", or "end-<seconds>" |
| `color` | `Color` | `"info"` |  |
| `opacity` | `number` | `0.45` |  |

### Tangent

The tangent to a curve at x (x can slide by keyframes), with a live slope label.

- Use when: Derivatives, instantaneous slope, extrema (horizontal tangent); Sliding the tangent along the curve while the slope changes
- Avoid when: A secant through two points: use Segment extend

| prop | type | default | description |
|---|---|---|---|
| `fn` | `string \| function` | **required** | Expression string ("x^2 - 1", "a*sin(x)") or a JS function ((x) => …) |
| `params` | `object` | `{}` |  |
| `x` | `number \| { at: number \| string; value: number; duration?: number; ease?: "smooth" \| "linear" \| "spring" }[]` | **required** | x of the point of tangency; keyframes make the tangent slide along the curve |
| `at` | `number \| string` | – | Time: seconds, "cue:<phrase from the narration>", "cue:<phrase>@end", or "end-<seconds>" |
| `length` | `number` | `440` | Length of the tangent segment (px) |
| `color` | `Color` | `"warn"` |  |
| `slope` | `boolean` | `false` | Show a slope label next to the point, updating continuously |
| `slopeLabel` | `string` | `"f'(x)"` | Name of the slope in the label (TeX) |

### VectorField

A vector field (fx, fy) in Axes: a grid of arrows growing out from the center, length/brightness by magnitude; `particles` release particles that drift with the flow.

- Use when: Differential equations, force fields, flows, gradients, div/curl
- Avoid when: Just a few separate vectors: use Vector

| prop | type | default | description |
|---|---|---|---|
| `fx` | `string \| function` | **required** | x component of the field, in x, y. E.g. "-y" |
| `fy` | `string \| function` | **required** | y component, e.g. "x" |
| `step` | `number` | – | Spacing between arrows (coordinate units); chosen automatically by default |
| `at` | `number \| string` | – | Time: seconds, "cue:<phrase from the narration>", "cue:<phrase>@end", or "end-<seconds>" |
| `color` | `Color` | `"info"` |  |
| `particles` | `number \| string` | – | From this moment, release particles that drift with the field (flow) |
| `count` | `integer` | `120` | Number of particles |
| `speed` | `number` | `1` |  |

### Label

Text or a formula placed at a coordinate in Axes (follows zoom and transformations).

- Use when: A note next to part of the picture: "$S = \pi r^2$", "increasing", "decreasing"
- Avoid when: Labels of points, vectors, segments: use their label prop; A large formula outside the picture: use Formula

| prop | type | default | description |
|---|---|---|---|
| `x` | `number \| { at: number \| string; value: number; duration?: number; ease?: "smooth" \| "linear" \| "spring" }[]` | **required** | A fixed number, or keyframes [{ at: 0, value: 1 }, { at: "cue:…", value: 3 }]: the first key is the starting value, each later key moves smoothly to its value |
| `y` | `number \| { at: number \| string; value: number; duration?: number; ease?: "smooth" \| "linear" \| "spring" }[]` | **required** | A fixed number, or keyframes [{ at: 0, value: 1 }, { at: "cue:…", value: 3 }]: the first key is the starting value, each later key moves smoothly to its value |
| `text` | `string` | **required** | Text, supports $…$ |
| `at` | `number \| string` | – | Time: seconds, "cue:<phrase from the narration>", "cue:<phrase>@end", or "end-<seconds>" |
| `color` | `Color` | `"text"` |  |
| `size` | `number` | `36` |  |
| `dir` | `"c" \| "u" \| "d" \| "l" \| "r" \| "ur" \| "ul" \| "dr" \| "dl"` | `"c"` | Label direction relative to the point: u d l r ur ul dr dl, c = centered |
| `outAt` | `number \| string` | – | Time: seconds, "cue:<phrase from the narration>", "cue:<phrase>@end", or "end-<seconds>" |

### Group

Groups coordinate objects, then shifts / rotates / scales the whole group by keyframes or by `time`: a sliding body, a rotating triangle, a swinging pendulum, a rolling wheel.

- Use when: Geometric transformations: translating, rotating, scaling a shape; Physics: a block sliding down a slope, a pendulum (rotate="25*sin(3*time)"), steady rotation; Moving a cluster (shape + label) together
- Avoid when: Transforming the whole plane: use the Axes matrix / warp
- Children: Coordinate objects (Polygon, Segment, Circle, Point, Label, Path, Spring…)

| prop | type | default | description |
|---|---|---|---|
| `x` | `number \| { at: number \| string; value: number; duration?: number; ease?: "smooth" \| "linear" \| "spring" }[] \| string` | `0` | Horizontal shift (coordinate units) |
| `y` | `number \| { at: number \| string; value: number; duration?: number; ease?: "smooth" \| "linear" \| "spring" }[] \| string` | `0` | Vertical shift |
| `rotate` | `number \| { at: number \| string; value: number; duration?: number; ease?: "smooth" \| "linear" \| "spring" }[] \| string` | `0` | Rotation (degrees, counterclockwise) around `about`; "90*time" spins steadily |
| `scale` | `number \| { at: number \| string; value: number; duration?: number; ease?: "smooth" \| "linear" \| "spring" }[] \| string` | `1` | Scale up / down around `about` |
| `about` | `[number, number]` | `[0,0]` | Center of rotation / scaling |
| `at` | `number \| string` | – | When the whole group appears (children still follow their own `at`) |
| `outAt` | `number \| string` | – | When the whole group fades out |

### Secant

A secant through two points of a curve, with its Δx, Δy triangle and a live slope label; let x2 move to x1 to watch the secant become the tangent.

- Use when: Definition of the derivative: Δx → 0; Average rate of change over an interval; Slope of the line through two points
- Avoid when: Just the tangent: use Tangent

| prop | type | default | description |
|---|---|---|---|
| `fn` | `string \| function` | **required** | Expression string ("x^2 - 1", "a*sin(x)") or a JS function ((x) => …) |
| `params` | `object` | `{}` |  |
| `x1` | `number \| { at: number \| string; value: number; duration?: number; ease?: "smooth" \| "linear" \| "spring" }[]` | **required** | x of the first point |
| `x2` | `number \| { at: number \| string; value: number; duration?: number; ease?: "smooth" \| "linear" \| "spring" }[]` | **required** | x of the second point; keyframes bring it close to x1 (Δx → 0) so the secant becomes the tangent |
| `at` | `number \| string` | – | Time: seconds, "cue:<phrase from the narration>", "cue:<phrase>@end", or "end-<seconds>" |
| `color` | `Color` | `"warn"` |  |
| `riseRun` | `boolean` | `true` | Draw the Δx (horizontal) and Δy (vertical) sides of the slope triangle |
| `dxLabel` | `string` | `"$\\Delta x$"` |  |
| `dyLabel` | `string` | `"$\\Delta y$"` |  |
| `slope` | `boolean` | `false` | Live Δy/Δx slope label, updating as the point moves |
| `extend` | `boolean` | `true` | Extend into a full line through the two points |

### Region

A translucent band or rectangle in coordinates (x ∈ [a, b], y ∈ [c, d]); its ends can shrink by keyframes.

- Use when: ε–δ limits: the ε band shrinks; Solution regions of inequalities, confidence intervals; Box-shaped things on a Stage (blocks, walls, ground, water)
- Avoid when: Area under a curve: use AreaUnder

| prop | type | default | description |
|---|---|---|---|
| `x` | `[number \| { at: number \| string; value: number; duration?: number; ease?: "smooth" \| "linear" \| "spring" }[], number \| { at: number \| string; value: number; duration?: number; ease?: "smooth" \| "linear" \| "spring" }[]]` | – | x range [a, b] (each end can move by keyframes); empty = the full width |
| `y` | `[number \| { at: number \| string; value: number; duration?: number; ease?: "smooth" \| "linear" \| "spring" }[], number \| { at: number \| string; value: number; duration?: number; ease?: "smooth" \| "linear" \| "spring" }[]]` | – | y range [c, d]; empty = the full height |
| `at` | `number \| string` | – | Time: seconds, "cue:<phrase from the narration>", "cue:<phrase>@end", or "end-<seconds>" |
| `outAt` | `number \| string` | – | Time: seconds, "cue:<phrase from the narration>", "cue:<phrase>@end", or "end-<seconds>" |
| `color` | `Color` | `"info"` |  |
| `opacity` | `number` | `0.18` |  |
| `border` | `boolean` | `true` | Dashed outline |
| `label` | `string` | – |  |
| `labelDir` | `"c" \| "u" \| "d" \| "l" \| "r" \| "ur" \| "ul" \| "dr" \| "dl"` | `"c"` | Label direction relative to the point: u d l r ur ul dr dl, c = centered |

### BraceBetween

A curly brace between two coordinate points, with a label: a side length, Δx, "n units".

- Use when: Marking the length of a side or a segment in a figure; Pointing out Δx, a height h, a radius, a wavelength λ
- Avoid when: A brace under an HTML block (formula, array): use Brace

| prop | type | default | description |
|---|---|---|---|
| `from` | `[number, number]` | **required** |  |
| `to` | `[number, number]` | **required** |  |
| `label` | `string` | – |  |
| `at` | `number \| string` | – | Time: seconds, "cue:<phrase from the narration>", "cue:<phrase>@end", or "end-<seconds>" |
| `color` | `Color` | `"accent"` |  |
| `flip` | `boolean` | `false` | Flip the side of the brace (default: to the right going from from to to, i.e. below when going left to right) |
| `offset` | `number` | `12` | Distance from the segment to the brace (px) |

### Scatter

Data as points in Axes: points appear in turn, `connect` makes a line chart, `fit` draws the regression line.

- Use when: Real data: temperature by month, population by year, experimental results; Correlation, linear regression; Several data series to compare (one Scatter per series, one color each)
- Avoid when: A function with a formula: use Plot; Comparing a few separate numbers: use BarChart

| prop | type | default | description |
|---|---|---|---|
| `points` | `[number, number][]` | **required** | Data points [[x, y], …] |
| `at` | `number \| string` | – | Time: seconds, "cue:<phrase from the narration>", "cue:<phrase>@end", or "end-<seconds>" |
| `over` | `number` | `1.2` | Points appear one after another over this many seconds |
| `color` | `Color` | `"info"` |  |
| `size` | `number` | `9` |  |
| `connect` | `boolean` | `false` | Connect the points into a line (line chart: temperature by month, population by year) |
| `fit` | `number \| string` | – | When to draw the linear regression line (line of best fit) |
| `fitColor` | `Color` | `"accent"` |  |
| `label` | `string` | – | Label of the data series, placed next to the last point |

### Epicycles

A chain of rotating circles (a Fourier series) drawing a shape; `show` adds circles one by one so the approximation improves.

- Use when: Fourier series, a square wave as a sum of sines; Combined circular motions
- Avoid when: A single circular motion: use Point with x="cos(time)"

| prop | type | default | description |
|---|---|---|---|
| `terms` | `{ freq: number; r: number; phase?: number }[]` | **required** | Circles chained tip to tail (Fourier series) |
| `center` | `[number, number]` | `[0,0]` |  |
| `speed` | `number` | `0.15` | Base turns per second |
| `show` | `number \| { at: number \| string; value: number; duration?: number; ease?: "smooth" \| "linear" \| "spring" }[]` | – | Number of circles in use; keyframes add terms one by one so the shape gets closer |
| `at` | `number \| string` | – | Time: seconds, "cue:<phrase from the narration>", "cue:<phrase>@end", or "end-<seconds>" |
| `color` | `Color` | `"accent"` |  |
| `trail` | `number` | `60` | Trail length (seconds) |

### Path

A smooth (or straight-segment) path through coordinate points, drawing itself; arrowhead at the end, a dot travelling along it, closed and filled.

- Use when: Free drawing on a Stage: coastlines, rivers, orbits, light rays, army routes, ocean currents; Closed hand-drawn shapes: a leaf, a cell, a lake (closed + fill); Curved arrows showing movement or flow (arrow, flow)
- Avoid when: Graphs y = f(x): use Plot; Straight-sided polygons: use Polygon

| prop | type | default | description |
|---|---|---|---|
| `points` | `[number, number][]` | **required** | Points [[x, y], …] in coordinates |
| `smooth` | `boolean` | `true` | A smooth curve through the points (false: straight segments) |
| `closed` | `boolean` | `false` |  |
| `at` | `number \| string` | – | Time: seconds, "cue:<phrase from the narration>", "cue:<phrase>@end", or "end-<seconds>" |
| `duration` | `number` | `1.2` | Time to draw |
| `color` | `Color` | `"text"` |  |
| `fill` | `Color \| "none"` | `"none"` |  |
| `fillOpacity` | `number` | `0.22` |  |
| `width` | `number` | `4` |  |
| `dashed` | `boolean` | `false` |  |
| `arrow` | `boolean` | `false` | Arrowhead at the end (movement, flow, wind direction) |
| `flow` | `boolean` | `false` | A bright dot travelling along the path continuously once drawn |
| `label` | `string` | – |  |
| `labelAt` | `number` | `0.5` | Label position along the path (0 start, 1 end) |
| `labelDir` | `"c" \| "u" \| "d" \| "l" \| "r" \| "ur" \| "ul" \| "dr" \| "dl"` | `"u"` | Label direction relative to the point: u d l r ur ul dr dl, c = centered |
| `outAt` | `number \| string` | – | Time: seconds, "cue:<phrase from the narration>", "cue:<phrase>@end", or "end-<seconds>" |

### Spring

A zigzag spring between two points, stretching and compressing as one end moves (expressions of time).

- Use when: Spring oscillators, Hooke's law; Elastic links between two bodies
- Avoid when: A straight string: use Segment

| prop | type | default | description |
|---|---|---|---|
| `from` | `[number \| { at: number \| string; value: number; duration?: number; ease?: "smooth" \| "linear" \| "spring" }[] \| string, number \| { at: number \| string; value: number; duration?: number; ease?: "smooth" \| "linear" \| "spring" }[] \| string]` | **required** | Fixed end [x, y]; each coordinate can be a number, keyframes or an expression of time |
| `to` | `[number \| { at: number \| string; value: number; duration?: number; ease?: "smooth" \| "linear" \| "spring" }[] \| string, number \| { at: number \| string; value: number; duration?: number; ease?: "smooth" \| "linear" \| "spring" }[] \| string]` | **required** | End attached to the body, e.g. ["2 + 0.8*sin(3*time)", 0] for an oscillation |
| `coils` | `integer` | `10` |  |
| `thickness` | `number` | `0.35` | Width of the spring (coordinate units) |
| `at` | `number \| string` | – | Time: seconds, "cue:<phrase from the narration>", "cue:<phrase>@end", or "end-<seconds>" |
| `color` | `Color` | `"muted"` |  |

### Surface

A surface z = f(x, y) in Axes3D, colored by height and shaded; rises out of the floor; params move by keyframes, `morph` turns it into another function.

- Use when: Functions of two variables, partial derivatives, extrema, saddle points; Waves in two dimensions (with time), the 2D normal distribution
- Avoid when: Functions of one variable: use Plot in Axes

| prop | type | default | description |
|---|---|---|---|
| `fn` | `string` | **required** | Expression in x, y (and params, time): "x^2 - y^2", "sin(x)*cos(y)" |
| `params` | `object` | `{}` |  |
| `x` | `[number, number]` | – | x domain (the Axes3D x range by default) |
| `y` | `[number, number]` | – |  |
| `resolution` | `integer` | `26` |  |
| `at` | `number \| string` | – | When the surface rises out of the plane z = 0 |
| `low` | `Color` | `"info"` | Color of low parts |
| `high` | `Color` | `"accent"` | Color of high parts |
| `opacity` | `number` | `0.88` |  |
| `wire` | `boolean` | `true` | Draw a mesh on the surface |
| `morph` | `{ at: number \| string; fn: string }[]` | `[]` | Morph into another function at `at` |

### Curve3D

A parametric curve (x(t), y(t), z(t)) in Axes3D, traced as if by a moving pen.

- Use when: Helices, trajectories in space, lines of intersection
- Avoid when: Straight lines: use Segment3D

| prop | type | default | description |
|---|---|---|---|
| `x` | `string` | **required** | x theo t |
| `y` | `string` | **required** | y theo t |
| `z` | `string` | **required** | z theo t |
| `t` | `[number, number]` | `[0,6.2832]` |  |
| `params` | `object` | `{}` |  |
| `at` | `number \| string` | – | Time: seconds, "cue:<phrase from the narration>", "cue:<phrase>@end", or "end-<seconds>" |
| `drawDuration` | `number` | `2` |  |
| `color` | `Color` | `"warn"` |  |
| `width` | `number` | `5` |  |

### Point3D

A labelled point in Axes3D; coordinates can move by keyframes or with time; `drop` draws a line down to the floor.

- Use when: Marking points on a surface, extrema, positions of objects
- Avoid when: Vertices of a pyramid/prism: Solid draws and labels them itself

| prop | type | default | description |
|---|---|---|---|
| `x` | `number \| { at: number \| string; value: number; duration?: number; ease?: "smooth" \| "linear" \| "spring" }[] \| string` | **required** | A number, keyframes, or an expression of time, in seconds since the Axes3D appeared ("2*cos(time)") |
| `y` | `number \| { at: number \| string; value: number; duration?: number; ease?: "smooth" \| "linear" \| "spring" }[] \| string` | **required** | A number, keyframes, or an expression of time, in seconds since the Axes3D appeared ("2*cos(time)") |
| `z` | `number \| { at: number \| string; value: number; duration?: number; ease?: "smooth" \| "linear" \| "spring" }[] \| string` | **required** | A number, keyframes, or an expression of time, in seconds since the Axes3D appeared ("2*cos(time)") |
| `at` | `number \| string` | – | Time: seconds, "cue:<phrase from the narration>", "cue:<phrase>@end", or "end-<seconds>" |
| `color` | `Color` | `"accent"` |  |
| `size` | `number` | `10` |  |
| `label` | `string` | – |  |
| `labelDir` | `"c" \| "u" \| "d" \| "l" \| "r" \| "ur" \| "ul" \| "dr" \| "dl"` | `"ur"` |  |
| `drop` | `boolean` | `false` | A dashed line straight down to the plane z = 0 (shows the height) |

### Vector3D

A vector arrow in Axes3D, growing from `from`; components can move.

- Use when: Vectors in space, cross products, normals, gradients
- Avoid when: Vectors in the plane: use Vector in Axes

| prop | type | default | description |
|---|---|---|---|
| `to` | `[number \| { at: number \| string; value: number; duration?: number; ease?: "smooth" \| "linear" \| "spring" }[] \| string, number \| { at: number \| string; value: number; duration?: number; ease?: "smooth" \| "linear" \| "spring" }[] \| string, number \| { at: number \| string; value: number; duration?: number; ease?: "smooth" \| "linear" \| "spring" }[] \| string]` | **required** | Components [x, y, z] |
| `from` | `[number, number, number]` | `[0,0,0]` |  |
| `at` | `number \| string` | – | Time: seconds, "cue:<phrase from the narration>", "cue:<phrase>@end", or "end-<seconds>" |
| `color` | `Color` | `"accent"` |  |
| `label` | `string` | – |  |
| `width` | `number` | `6` |  |

### Segment3D

A segment between two points in Axes3D, drawing itself.

- Use when: Connecting lines, projections, distances in space (outside a Solid)
- Avoid when: Edges of a polyhedron: declare them in Solid so hidden ones are dashed

| prop | type | default | description |
|---|---|---|---|
| `from` | `[number, number, number]` | **required** |  |
| `to` | `[number, number, number]` | **required** |  |
| `at` | `number \| string` | – | Time: seconds, "cue:<phrase from the narration>", "cue:<phrase>@end", or "end-<seconds>" |
| `color` | `Color` | `"text"` |  |
| `width` | `number` | `4` |  |
| `dashed` | `boolean` | `false` |  |
| `label` | `string` | – |  |

### Solid

A polyhedron for solid geometry: declare named point coordinates and a list of edges; edges appear one by one, point names sit outside the shape, hidden segments are DASHED AUTOMATICALLY and update with the camera; tint side faces / cross-sections with `faces`.

- Use when: Pyramid S.ABCD, tetrahedra, prisms, boxes, cubes; Altitude SH, lines of intersection, cross-sections, the angle between a line and a plane
- Avoid when: Solids of revolution, curved surfaces: use Surface / Curve3D

| prop | type | default | description |
|---|---|---|---|
| `points` | `object` | **required** | Named points: { S: [0, 0, 3], A: [-1, -1, 0], … }; helper points can be added (midpoint M, center O, foot of the altitude H) |
| `edges` | `string \| { e: string; at?: number \| string; color?: Color; width?: number }[]` | **required** | Edges/segments to draw: "SA", "AB", "SO" (multi-character names use a dash: "A'-B'"). Segments behind or inside the solid are DASHED automatically |
| `faces` | `{ p: string; at?: number \| string; color?: Color; outAt?: number \| string }[]` | `[]` | Faces/cross-sections tinted (side face SAB, a cross-section, the plane (SBD)) |
| `at` | `number \| string` | – | When drawing starts; edges appear one by one |
| `stagger` | `number` | `0.18` | Delay between edges while drawing (seconds) |
| `color` | `Color` | `"text"` |  |
| `labels` | `boolean` | `true` | Write the point names |
| `hidden` | `boolean` | `true` | Dash hidden segments automatically (for the current camera angle) |

## Primitives (for custom visuals)

### Stack

Stacks its children vertically, `gap` apart. The way to put several elements in one area.

- Use when: An area with 2–3 stacked elements: formula above, graph below; array above, note below
- Avoid when: Side by side: use Row; Two halves of the screen: use the TwoColumn layout
- Children: Elements stacked vertically

| prop | type | default | description |
|---|---|---|---|
| `gap` | `number` | `32` | Space between elements (px) |
| `align` | `"start" \| "center" \| "end" \| "stretch"` | `"center"` | Horizontal alignment of the elements |

### Row

Lays its children out in a horizontal row, `gap` apart.

- Use when: 2–4 small elements side by side: label + formula, status boxes
- Avoid when: Two halves of the screen with a scene title: use TwoColumn; Comparing options: use Cards
- Children: Elements laid out horizontally

| prop | type | default | description |
|---|---|---|---|
| `gap` | `number` | `48` |  |
| `align` | `"start" \| "center" \| "end" \| "stretch"` | `"center"` | Vertical alignment of the elements |
| `justify` | `"start" \| "center" \| "end" \| "between"` | `"center"` |  |

### Switch

Shows its children one at a time IN THE SAME PLACE, each replacing the previous one. Takes the space of the largest child.

- Use when: Replacing content with the narration: note for step 1 → step 2, formula before → after; Instead of several stacked FadeIn with outAt: those keep taking space even when faded
- Avoid when: Elements that must show together: use Stack or Stagger
- Children: Elements replacing each other, as many as the entries in `at`

| prop | type | default | description |
|---|---|---|---|
| `at` | `number \| string[]` | **required** | When each child appears, in order: child k shows from at[k] and replaces the previous one |
| `duration` | `number` | `0.45` | Transition time (seconds) |
| `effect` | `"fade" \| "up" \| "left" \| "flip" \| "zoom"` | `"up"` | Transition: up (old content drifts up, new rises in), left slides sideways, flip, zoom, fade |

### Panels

A grid of 2–4 panels with small titles, each a view of the same problem (figure, graph, table, working); panels appear in turn, `focus` highlights the one being discussed.

- Use when: Complex problems that need several representations at once: figure + graph + working; Comparing 3–4 cases (a > 0, a = 0, a < 0)
- Avoid when: Just a left and a right part under a scene title: use TwoColumn; A single illustration: Panels are not needed
- Children: 2–4 elements, one panel each (keep each panel compact: Axes ≤ 760 × 460)

| prop | type | default | description |
|---|---|---|---|
| `columns` | `integer` | `2` | Number of columns; children wrap when a row is full (2 columns × 2 rows for 4 panels) |
| `titles` | `string[]` | – | Small title of each panel, supports $…$ |
| `at` | `number \| string[]` | – | When each panel appears (all at once by default) |
| `gap` | `number` | `48` |  |
| `frame` | `boolean` | `true` | Border and light background for each panel |
| `focus` | `{ at: number \| string; index: integer \| null }[]` | `[]` | Highlight one panel (the others dim) |

### Pulse

Brief emphasis on its children at one or more moments: swell, glow, ring, shake, bounce.

- Use when: The narration says "note that", "important", "this is exactly"; Marking a result just computed; shake when talking about a mistake
- Avoid when: Emphasis all through the scene: keep it for key moments
- Children: Element to emphasise

| prop | type | default | description |
|---|---|---|---|
| `at` | `number \| string \| number \| string[]` | **required** | One or more moments of emphasis, e.g. ["cue:note that", "cue:important"] |
| `mode` | `"scale" \| "glow" \| "ring" \| "shake" \| "bounce"` | `"scale"` | scale swells slightly, glow shines, ring spreads a ring, shake shakes (error/wrong), bounce jumps |
| `color` | `Color` | `"accent"` |  |
| `strength` | `number` | `1` |  |
| `duration` | `number` | `0.7` |  |

### Camera

Virtual camera: zooms into an area of its child (e.g. part of an array, a branch of a tree) and back out, with smooth motion.

- Use when: The narration moves attention to a detail: "look at the left half", "consider this subarray"; Opening on a close-up, then pulling back to the whole picture
- Avoid when: Zooming constantly for no reason; Wrapping the whole layout: wrap only the illustration inside it
- Children: One illustration element

| prop | type | default | description |
|---|---|---|---|
| `keys` | `{ at: number \| string; zoom?: number; x?: number; y?: number }[]` | **required** | Camera keys: zoom into an area, then back out |
| `duration` | `number` | `1.1` |  |
| `room` | `number` | `140` | Space (px) above and below the child so zooming does not crop it |

### Animate

Moves, scales, rotates or fades its children through keyframes, relative to where the layout placed them.

- Use when: An element moving aside / shrinking to make room for what comes next; Objects moving with a purpose: rolling, sliding, falling
- Avoid when: Just appearing: use FadeIn with an effect; Initial placement: use Stack/Row, never Animate to lay out a page
- Children: Element to move

| prop | type | default | description |
|---|---|---|---|
| `keys` | `{ at: number \| string; x?: number; y?: number; scale?: number; rotate?: number; opacity?: number }[]` | **required** | States over time; moves smoothly between keys. Properties not given keep their previous value |
| `from` | `{ x?: number; y?: number; scale?: number; rotate?: number; opacity?: number }` | `{}` | State before the first key |
| `duration` | `number` | `0.7` | Transition time between two states |
| `spring` | `boolean` | `false` | Transition with a slight bounce |

### Counter

A number that counts up to its target, and can keep counting to new values with the narration.

- Use when: Numbers of comparisons, running times, results of a calculation; Showing a number shoot up: 10 000 → 1 000 000
- Avoid when: A static number: use plain text

| prop | type | default | description |
|---|---|---|---|
| `value` | `number` | **required** | Target value |
| `from` | `number` | `0` |  |
| `at` | `number \| string` | `0` | When counting starts |
| `duration` | `number` | `1.4` |  |
| `steps` | `{ at: number \| string; value: number }[]` | `[]` | Keep counting to new values at later times |
| `decimals` | `integer` | `0` |  |
| `prefix` | `string` | `""` |  |
| `suffix` | `string` | `""` |  |
| `label` | `string` | – | Small label above the number |
| `size` | `number` | `96` |  |
| `color` | `Color` | `"accent"` |  |

### Arrow

An arrow that draws itself (with a label, optionally a dot flowing along it), placed between elements in a Row/Stack.

- Use when: Transformations A → B: input → result, before → after; A short chain of steps in one row
- Avoid when: Diagrams with many nodes and edges: use Diagram

| prop | type | default | description |
|---|---|---|---|
| `at` | `number \| string` | `0` | Time: seconds, "cue:<phrase from the narration>", "cue:<phrase>@end", or "end-<seconds>" |
| `direction` | `"right" \| "left" \| "down" \| "up"` | `"right"` |  |
| `length` | `number` | `140` |  |
| `label` | `string` | – | Label on the arrow, supports $…$ |
| `color` | `Color` | `"muted"` |  |
| `duration` | `number` | `0.6` |  |
| `flow` | `boolean` | `false` | A bright dot travelling along the arrow continuously once drawn (flow) |

### FadeIn

Makes a block of content appear at a given time with an effect (slide, pop, zoom, blur, wipe, flip).

- Use when: Custom content that must appear exactly when the narration mentions it; Wrapping an element that has no `at` prop of its own
- Avoid when: Components that already have their own `at` (TitleCard, Formula, Graph…)
- Children: Content to show

| prop | type | default | description |
|---|---|---|---|
| `at` | `number \| string` | `0` | Time: seconds, "cue:<phrase from the narration>", "cue:<phrase>@end", or "end-<seconds>" |
| `delay` | `number` | `0` | Extra delay (seconds) after `at` |
| `duration` | `number` | `0.6` | Time to appear (seconds) |
| `y` | `number` | `24` | How many px it slides up from |
| `x` | `number` | `0` | How many px it slides sideways |
| `scale` | `number` | `1` | Starting scale, e.g. 0.94 |
| `outAt` | `number \| string` | – | When it disappears (optional) |
| `effect` | `"up" \| "down" \| "left" \| "right" \| "fade" \| "pop" \| "zoom" \| "blur" \| "wipe" \| "flip"` | `"up"` | Entrance: up/down/left/right slide in, pop bounces in, zoom grows from small, blur comes into focus, wipe sweeps from the left, flip flips in, fade only fades |

### Stagger

Makes its children appear one after another, `gap` seconds apart.

- Use when: A group of custom elements appearing in sequence
- Avoid when: Bullet lists: use BulletReveal
- Children: Elements appearing in turn

| prop | type | default | description |
|---|---|---|---|
| `at` | `number \| string` | `0` | Time: seconds, "cue:<phrase from the narration>", "cue:<phrase>@end", or "end-<seconds>" |
| `gap` | `number` | `0.35` | Delay between children (seconds) |
| `duration` | `number` | `0.6` |  |
| `y` | `number` | `24` |  |
| `effect` | `"up" \| "down" \| "left" \| "right" \| "fade" \| "pop" \| "zoom" \| "blur" \| "wipe" \| "flip"` | `"up"` | Entrance: up/down/left/right slide in, pop bounces in, zoom grows from small, blur comes into focus, wipe sweeps from the left, flip flips in, fade only fades |

### Typewriter

Types text out character by character, like a typewriter.

- Use when: An opening question, a short definition to stress
- Avoid when: Text longer than 2 lines; Code: use CodeBlock

| prop | type | default | description |
|---|---|---|---|
| `text` | `string` | **required** | Text to type out |
| `at` | `number \| string` | `0` | Time: seconds, "cue:<phrase from the narration>", "cue:<phrase>@end", or "end-<seconds>" |
| `cps` | `number` | `28` | Characters per second |
| `size` | `"display" \| "title" \| "heading" \| "body" \| "small" \| "caption" \| "label"` | `"body"` |  |
| `color` | `Color` | `"text"` |  |
| `mono` | `boolean` | `false` |  |
| `cursor` | `boolean` | `true` |  |

### Highlight

Highlights, underlines or recolors a phrase exactly when the narration mentions it.

- Use when: Stressing a key term in a sentence on screen
- Avoid when: Highlighting a whole long passage
- Children: Phrase to emphasise

| prop | type | default | description |
|---|---|---|---|
| `at` | `number \| string` | `0` | Time: seconds, "cue:<phrase from the narration>", "cue:<phrase>@end", or "end-<seconds>" |
| `color` | `Color` | `"accent"` |  |
| `duration` | `number` | `0.5` |  |
| `mode` | `"underline" \| "marker" \| "text"` | `"marker"` | marker: highlights the background, underline: underlines, text: recolors the text |

### Brace

A curly brace that grows under (or over) its child, exactly as wide, with a label: "how many is this", "what this part is".

- Use when: Naming part of a formula or a stretch of an array: "n elements", "the derivative"; Grouping a few elements in a Row
- Avoid when: Labels inside a plot: use Label in Axes
- Children: The element being labelled

| prop | type | default | description |
|---|---|---|---|
| `label` | `string` | – | Label under (or over) the brace, supports $…$ |
| `dir` | `"down" \| "up"` | `"down"` | Brace below or above the content |
| `at` | `number \| string` | `0` | When the brace grows in |
| `color` | `Color` | `"accent"` |  |
| `size` | `number` | `36` | Label font size |

### DrawPath

Draws an SVG path progressively from start to end. Must be placed inside an <svg>.

- Use when: Hand-drawn shapes, arrows, custom outlines
- Avoid when: Function graphs: use Graph; Block diagrams: use Diagram

| prop | type | default | description |
|---|---|---|---|
| `d` | `string` | **required** | The d attribute of an SVG path |
| `at` | `number \| string` | `0` | Time: seconds, "cue:<phrase from the narration>", "cue:<phrase>@end", or "end-<seconds>" |
| `duration` | `number` | `1` |  |
| `color` | `Color` | `"text"` |  |
| `width` | `number` | `4` |  |
| `fill` | `Color \| "none"` | `"none"` |  |

### Surround

Hand-drawn mark around its child: box, circle, underline, strike-through (discarded) or cross (wrong), with a short label; stays until outAt.

- Use when: Pointing out the result to remember (box), a mistake (cross), a rejected option (strike); Circling a term in a formula or a cell in a table
- Avoid when: Brief emphasis: use Pulse
- Children: The element to mark

| prop | type | default | description |
|---|---|---|---|
| `at` | `number \| string` | **required** | When the box / stroke starts drawing around the child |
| `outAt` | `number \| string` | – | Time: seconds, "cue:<phrase from the narration>", "cue:<phrase>@end", or "end-<seconds>" |
| `shape` | `"box" \| "circle" \| "underline" \| "strike" \| "cross"` | `"box"` | box frames, circle encircles, underline underlines, strike crosses out (discarded), cross marks it wrong |
| `color` | `Color` | `"accent"` |  |
| `label` | `string` | – | Short label above the frame, supports $…$ |
| `padding` | `number` | `14` |  |

### Icon

A line icon by name, with a label and an entrance effect. Available names: person, people, baby, student, book, pen, idea, question, check, cross, warning, star, heart, clock, calendar, search, target, trophy, flag, puzzle, home, school, building, factory, hospital, money, coins, cart, briefcase, scale, gavel, handshake, vote, newspaper, message, mail, quote, languages, library, theater, palette, brush, music, mic, camera, film, volume, phone, computer, code, database, cpu, wifi, lock, key, gear, cog, plug, rocket, satellite, calculator, plane, ship, sailboat, anchor, car, train, bike, ambulance, map, compass, pin, route, signpost, globe, earth, mountain, snow-mountain, tree, forest, waves, wind, tornado, sun, moon, cloud, rain, storm, cloud-sun, rainbow, sunrise, sunset, snowflake, thermometer, droplet, wheat, tractor, pickaxe, gem, fuel, recycle, atom, flask, beaker, test-tube, microscope, telescope, orbit, magnet, lightning, battery, flame, radiation, biohazard, gauge, ruler, weight, hourglass, hexagon, hammer, wrench, leaf, sprout, flower, apple, egg, milk, food, fish, bird, bug, rabbit, cat, dog, paw, dna, brain, bone, pulse, eye, ear, hand, footprints, activity, syringe, pill, stethoscope, skull, siren, shirt, crown, swords, sword, shield, castle, landmark, scroll, feather, tent, church, bomb, sigma, infinity, shapes, bar-chart, line-chart, pie-chart.

- Use when: Illustrating concepts outside math: living things, weather, history, society; A row of icons + arrows for a cause → effect chain (Row + Icon + Arrow)
- Avoid when: Decoration without meaning; More than ~6 icons at once

| prop | type | default | description |
|---|---|---|---|
| `name` | `"person" \| "people" \| "baby" \| "student" \| "book" \| "pen" \| "idea" \| "question" \| "check" \| "cross" \| "warning" \| "star" \| "heart" \| "clock" \| "calendar" \| "search" \| "target" \| "trophy" \| "flag" \| "puzzle" \| "home" \| "school" \| "building" \| "factory" \| "hospital" \| "money" \| "coins" \| "cart" \| "briefcase" \| "scale" \| "gavel" \| "handshake" \| "vote" \| "newspaper" \| "message" \| "mail" \| "quote" \| "languages" \| "library" \| "theater" \| "palette" \| "brush" \| "music" \| "mic" \| "camera" \| "film" \| "volume" \| "phone" \| "computer" \| "code" \| "database" \| "cpu" \| "wifi" \| "lock" \| "key" \| "gear" \| "cog" \| "plug" \| "rocket" \| "satellite" \| "calculator" \| "plane" \| "ship" \| "sailboat" \| "anchor" \| "car" \| "train" \| "bike" \| "ambulance" \| "map" \| "compass" \| "pin" \| "route" \| "signpost" \| "globe" \| "earth" \| "mountain" \| "snow-mountain" \| "tree" \| "forest" \| "waves" \| "wind" \| "tornado" \| "sun" \| "moon" \| "cloud" \| "rain" \| "storm" \| "cloud-sun" \| "rainbow" \| "sunrise" \| "sunset" \| "snowflake" \| "thermometer" \| "droplet" \| "wheat" \| "tractor" \| "pickaxe" \| "gem" \| "fuel" \| "recycle" \| "atom" \| "flask" \| "beaker" \| "test-tube" \| "microscope" \| "telescope" \| "orbit" \| "magnet" \| "lightning" \| "battery" \| "flame" \| "radiation" \| "biohazard" \| "gauge" \| "ruler" \| "weight" \| "hourglass" \| "hexagon" \| "hammer" \| "wrench" \| "leaf" \| "sprout" \| "flower" \| "apple" \| "egg" \| "milk" \| "food" \| "fish" \| "bird" \| "bug" \| "rabbit" \| "cat" \| "dog" \| "paw" \| "dna" \| "brain" \| "bone" \| "pulse" \| "eye" \| "ear" \| "hand" \| "footprints" \| "activity" \| "syringe" \| "pill" \| "stethoscope" \| "skull" \| "siren" \| "shirt" \| "crown" \| "swords" \| "sword" \| "shield" \| "castle" \| "landmark" \| "scroll" \| "feather" \| "tent" \| "church" \| "bomb" \| "sigma" \| "infinity" \| "shapes" \| "bar-chart" \| "line-chart" \| "pie-chart"` | **required** | Icon name (see the list in the docs) |
| `size` | `number` | `120` |  |
| `color` | `Color` | `"text"` |  |
| `at` | `number \| string` | `0` | Time: seconds, "cue:<phrase from the narration>", "cue:<phrase>@end", or "end-<seconds>" |
| `effect` | `"up" \| "down" \| "left" \| "right" \| "fade" \| "pop" \| "zoom" \| "blur" \| "wipe" \| "flip"` | `"pop"` | Entrance: up/down/left/right slide in, pop bounces in, zoom grows from small, blur comes into focus, wipe sweeps from the left, flip flips in, fade only fades |
| `label` | `string` | – | Text under the icon, supports $…$ |
| `badge` | `boolean` | `false` | Put the icon in a filled circle |

### Slider

A slider showing a parameter as it changes (knob + number), following the same keyframes as the graph.

- Use when: Exploring a parameter: "as a grows, the graph …" (next to the Axes, same keyframes as Plot params); A physical quantity that changes: slope angle, mass, temperature
- Avoid when: A big number on its own: use Counter

| prop | type | default | description |
|---|---|---|---|
| `label` | `string` | **required** | Parameter name, supports $…$, e.g. "$a$" |
| `value` | `number \| { at: number \| string; value: number; duration?: number; ease?: "smooth" \| "linear" \| "spring" }[]` | **required** | Value (keyframes): use the SAME keyframes as the Plot params so slider and graph move together |
| `min` | `number` | **required** |  |
| `max` | `number` | **required** |  |
| `at` | `number \| string` | `0` | Time: seconds, "cue:<phrase from the narration>", "cue:<phrase>@end", or "end-<seconds>" |
| `width` | `number` | `520` |  |
| `decimals` | `integer` | `1` |  |
| `color` | `Color` | `"accent"` |  |

### LiveTex

A formula with live numbers: each {name} slot is filled with the current value of its keyframes, every frame.

- Use when: Quantities computed from a moving picture: slope, area, sin θ = 0.71; Results that update as a parameter changes
- Avoid when: A static formula: use Formula

| prop | type | default | description |
|---|---|---|---|
| `tex` | `string` | **required** | TeX formula with {name} slots: "a = {a}", "S = {s}\text{ cm}^2" |
| `values` | `object` | **required** | Value for each slot (keyframes), updated every frame |
| `decimals` | `integer` | `2` |  |
| `at` | `number \| string` | `0` | Time: seconds, "cue:<phrase from the narration>", "cue:<phrase>@end", or "end-<seconds>" |
| `size` | `number` | `64` |  |
| `color` | `Color` | `"text"` |  |

# Examples

Each example shows the narration it was written for, then the scene code.

## graph-secant.tsx

Narration: "Hãy vẽ quãng đường theo thời gian. Lấy hai điểm, nối bằng một đường thẳng: đó là vận tốc trung bình. Giờ kéo hai điểm lại gần nhau hơn, và gần hơn nữa."

```tsx
import { Graph, TitleWithVisual } from "@kit";

// The second point slides toward the first while the narrator says "gần nhau hơn".
export default function Scene() {
  return (
    <TitleWithVisual title="Từ vận tốc trung bình đến tức thời">
      <Graph
        fn="0.3x^2 + 0.5x"
        domain={[0, 6]}
        axisLabels={["t", "s"]}
        draw="cue:quãng đường"
        secant={{ x1: 2, x2: 5, at: "cue:hai điểm", shrinkAt: "cue:gần nhau hơn", shrinkDuration: 3.5 }}
        showSlope
        slopeLabel="Vận tốc trung bình"
      />
    </TitleWithVisual>
  );
}
```

## two-column.tsx

Narration: "Bên trái là đồ thị y bằng x bình phương. Tiếp tuyến trượt dọc đường cong. Khi tiếp tuyến dốc lên, hàm đang tăng. Khi dốc xuống, hàm đang giảm."

```tsx
import { BulletReveal, Graph, TwoColumn } from "@kit";

export default function Scene() {
  return (
    <TwoColumn title="Dấu của đạo hàm" ratio={0.6}>
      <Graph fn="x^2" domain={[-3, 3]} width={980} height={640} label="y = x²" tangent={{ x: -2.5, to: 2.5, at: "cue:tiếp tuyến", moveAt: "cue:trượt", moveDuration: 5 }} />
      <BulletReveal
        size="small"
        items={[
          { text: "Dốc lên: $f'(x) > 0$, hàm tăng", at: "cue:dốc lên" },
          { text: "Dốc xuống: $f'(x) < 0$, hàm giảm", at: "cue:dốc xuống" },
        ]}
      />
    </TwoColumn>
  );
}
```

## title-card.tsx

Narration: "Chào các em. Hôm nay chúng ta tìm hiểu đạo hàm, bắt đầu từ một câu hỏi rất đời thường."

```tsx
import { FullVisual, TitleCard } from "@kit";

export default function Scene() {
  return (
    <FullVisual align="left">
      <TitleCard kicker="Giải tích 11 · Bài 1" title="Đạo hàm, hiểu từ trực giác" subtitle="Vận tốc tức thời được tính như thế nào?" at="cue:đạo hàm" />
    </FullVisual>
  );
}
```

## bullets.tsx

Narration: "Tóm lại, đạo hàm cho ta ba điều. Thứ nhất, tốc độ thay đổi tức thời. Thứ hai, hệ số góc của tiếp tuyến. Thứ ba, dấu của đạo hàm cho biết hàm tăng hay giảm."

```tsx
import { BulletReveal, TitleWithVisual } from "@kit";

// Each bullet appears exactly when the narrator reaches it.
export default function Scene() {
  return (
    <TitleWithVisual title="Ghi nhớ" align="left">
      <BulletReveal
        numbered
        focus
        items={[
          { text: "Tốc độ thay đổi tức thời", at: "cue:thứ nhất" },
          { text: "Hệ số góc của tiếp tuyến", at: "cue:thứ hai" },
          { text: "$f'(x) > 0$: hàm tăng, $f'(x) < 0$: hàm giảm", at: "cue:thứ ba" },
        ]}
      />
    </TitleWithVisual>
  );
}
```

## formula.tsx

Narration: "Khi khoảng cách h tiến về không, độ dốc ấy có một cái tên: đạo hàm."

```tsx
import { Formula, Highlight, FadeIn, TitleWithVisual, fonts, sizes, color } from "@kit";

export default function Scene() {
  return (
    <TitleWithVisual title="Định nghĩa đạo hàm">
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 48 }}>
        <Formula tex="f'(x) = \lim_{h \to 0} \frac{f(x+h) - f(x)}{h}" size={88} at="cue:khoảng cách" />
        <FadeIn at="cue:đạo hàm">
          <div style={{ fontSize: sizes.body, color: color("muted"), fontFamily: fonts.sans }}>
            Giới hạn này gọi là <Highlight at="cue:đạo hàm">đạo hàm của f tại x</Highlight>
          </div>
        </FadeIn>
      </div>
    </TitleWithVisual>
  );
}
```

## formula-steps.tsx

Narration: "Thử với f của x bằng x bình phương. Ta khai triển tử số, rút gọn cho h, rồi cho h tiến về không. Kết quả là hai x."

```tsx
import { FormulaSteps, TitleWithVisual } from "@kit";

// In JS strings LaTeX backslashes must be doubled; String.raw avoids that.
export default function Scene() {
  return (
    <TitleWithVisual title="Ví dụ: $f(x) = x^2$">
      <FormulaSteps
        keepPrevious
        size={64}
        steps={[
          { tex: String.raw`\frac{(x+h)^2 - x^2}{h}`, at: "cue:khai triển" },
          { tex: String.raw`= \frac{2xh + h^2}{h} = 2x + h`, at: "cue:rút gọn" },
          { tex: String.raw`\xrightarrow{h \to 0} 2x`, at: "cue:kết quả" },
        ]}
      />
    </TitleWithVisual>
  );
}
```

## math-morph.tsx

Narration: "Giải phương trình hai x cộng ba bằng bảy. Chuyển ba sang vế phải, nó đổi dấu. Bảy trừ ba bằng bốn. Chia hai vế cho hai, ta được x bằng hai."

```tsx
import { Brace, FullVisual, MathMorph } from "@kit";

// Pieces with the same TeX (or the same key) slide to their new place; "+3" becomes "-3" through its key.
export default function Scene() {
  return (
    <FullVisual>
      <Brace label="nghiệm" at="cue:ta được" color="ok" size={40}>
        <MathMorph
          size={110}
          steps={[
            { at: "cue:giải phương trình", tokens: ["2x", "+3", "=", "7"] },
            { at: "cue:chuyển ba", tokens: ["2x", "=", "7", { tex: "-3", key: "+3", color: "accent" }] },
            { at: "cue:bảy trừ", tokens: ["2x", "=", "4"] },
            { at: "cue:chia hai", tokens: [{ tex: "x", key: "2x" }, "=", { tex: "2", color: "ok" }] },
          ]}
        />
      </Brace>
    </FullVisual>
  );
}
```

## derivation-physics.tsx

Narration: "Một vật rơi tự do từ độ cao 45 mét. Quãng đường rơi bằng một phần hai g t bình phương. Thay số, ta có 45 bằng 5 t bình phương. Suy ra t bình phương bằng 9. Vậy vật chạm đất sau 3 giây."

```tsx
import { Derivation, Stack, Surround, TitleWithVisual } from "@kit";

// Lines align on "&="; each line is written when the narration reaches it, with its reason on the right.
export default function Scene() {
  return (
    <TitleWithVisual title="Bao lâu thì chạm đất?">
      <Stack gap={40}>
        <Derivation
          lines={[
            { tex: "h &= \\tfrac{1}{2} g t^2", at: "cue:quãng đường rơi", note: "rơi tự do" },
            { tex: "45 &= 5\\,t^2", at: "cue:thay số", note: "$h = 45$, $g = 10$" },
            { tex: "t^2 &= 9", at: "cue:suy ra", note: "chia hai vế cho 5" },
            { tex: "t &= 3\\ \\text{s}", at: "cue:vậy vật", result: true },
          ]}
        />
        <Surround at="cue:3 giây" shape="underline" color="ok">
          <div style={{ fontSize: 34 }}>Chạm đất sau 3 giây</div>
        </Surround>
      </Stack>
    </TitleWithVisual>
  );
}
```

## axes-complex.tsx

Narration: "Mỗi điểm của mặt phẳng là một số phức z. Hàm z bình phương đưa mỗi điểm tới một chỗ mới. Hãy xem cả lưới uốn cong theo nó. Góc được nhân đôi, khoảng cách được bình phương."

```tsx
import { Axes, Formula, Point, Row, TitleWithVisual } from "@kit";

// warp: the whole plane (grid and points) bends from z to z² (u = x² − y², v = 2xy).
export default function Scene() {
  return (
    <TitleWithVisual title="Hàm phức uốn cong mặt phẳng">
      <Row gap={56}>
        <Axes x={[-2.2, 2.2]} y={[-2.2, 2.2]} grid="plane" ticks={false} width={900} height={720} warp={[{ at: "cue:cả lưới", fx: "x^2 - y^2", fy: "2*x*y" }]} transition={2.6}>
          <Point x={1} y={0.8} at="cue:số phức" label="$z$" />
        </Axes>
        <Formula tex="z \mapsto z^2" at="cue:z bình phương" size={80} />
      </Row>
    </TitleWithVisual>
  );
}
```

## stage-physics.tsx

Narration: "Một vật gắn vào lò xo, đặt trên mặt bàn nhẵn. Kéo vật ra rồi thả. Lò xo kéo vật về vị trí cân bằng, vật vượt qua rồi bị đẩy ngược lại. Vật dao động qua lại mãi mãi."

```tsx
import { Group, Label, Region, Spring, Stage, TitleWithVisual, Vector } from "@kit";

// x(t) = 2 sin(2.4 t), counted from "Kéo vật": the spring end, the block and the force share one expression.
const X = "2*sin(2.4*time)";

export default function Scene() {
  return (
    <TitleWithVisual title="Con lắc lò xo dao động">
      <Stage x={[-7, 7]} y={[-3, 3]} width={1500} height={640}>
        <Region x={[-6.6, 6.6]} y={[-1.6, -1.2]} color="muted" opacity={0.35} border={false} at="cue:mặt bàn" />
        <Region x={[-6.6, -6.2]} y={[-1.2, 1.6]} color="muted" opacity={0.5} border={false} at="cue:mặt bàn" />
        <Spring from={[-6.2, 0]} to={[`${X} - 0.7`, 0]} at="cue:kéo vật" coils={12} />
        <Group x={X} at="cue:kéo vật">
          <Region x={[-0.7, 0.7]} y={[-1.2, 0.6]} color="info" opacity={0.5} label="$m$" />
          <Vector x={"-0.8*sin(2.4*time)"} y={0} from={[0, 1.2]} color="err" label="$\vec F$" at="cue:lò xo kéo" />
        </Group>
        <Label x={0} y={2.5} text="vị trí cân bằng" at="cue:vị trí cân bằng" color="muted" size={30} />
      </Stage>
    </TitleWithVisual>
  );
}
```

## three-pyramid.tsx

Narration: "Cho hình chóp S ABCD có đáy là hình vuông. Đỉnh S nằm ngay trên tâm O của đáy. Đường cao SO vuông góc với mặt đáy. Xoay hình lại, ta thấy rõ mặt bên SAB."

```tsx
import { Axes3D, Solid, TitleWithVisual } from "@kit";

// Solid finds hidden edges itself: they turn dashed, and switch as the camera orbits.
export default function Scene() {
  return (
    <TitleWithVisual title="Hình chóp tứ giác đều">
      <Axes3D
        x={[-2, 2]}
        y={[-2, 2]}
        z={[0, 3.4]}
        equal
        axes={false}
        floor={false}
        width={1200}
        height={760}
        azimuth={[{ at: 0, value: -118 }, { at: "cue:xoay hình", value: -60, duration: 2.5 }]}
        elevation={16}
      >
        <Solid
          points={{ S: [0, 0, 3], A: [-1.5, -1.5, 0], B: [1.5, -1.5, 0], C: [1.5, 1.5, 0], D: [-1.5, 1.5, 0], O: [0, 0, 0] }}
          edges={["AB", "BC", "CD", "DA", "SA", "SB", "SC", "SD", { e: "AC", at: "cue:tâm o" }, { e: "BD", at: "cue:tâm o" }, { e: "SO", at: "cue:đường cao", color: "accent" }]}
          faces={[{ p: "SAB", at: "cue:mặt bên", color: "info" }]}
          at="cue:hình chóp"
        />
      </Axes3D>
    </TitleWithVisual>
  );
}
```

## number-line.tsx

Narration: "Bắt đầu tại âm hai. Cộng thêm năm, ta nhảy năm bước sang phải và dừng ở ba. Tập các số lớn hơn ba là một tia mở về bên phải."

```tsx
import { NumberLine, TitleWithVisual } from "@kit";

// An interval whose `to` lies past the range is drawn as a ray (no end dot).
export default function Scene() {
  return (
    <TitleWithVisual title="Cộng là nhảy sang phải">
      <NumberLine
        range={[-5, 8]}
        step={1}
        points={[{ x: [{ at: 0, value: -2 }, { at: "cue:nhảy năm", value: 3, duration: 0.8 }], label: "$x$", at: "cue:bắt đầu" }]}
        jumps={[{ from: -2, to: 3, at: "cue:nhảy năm", label: "$+5$" }]}
        intervals={[{ from: 3, to: 99, at: "cue:tập các", closed: [false, false], label: "$x > 3$" }]}
      />
    </TitleWithVisual>
  );
}
```

## array-quicksort.tsx

Narration: "Pivot là năm, phần tử cuối. Con trỏ i đứng trước mảng, j bắt đầu quét. Tám lớn hơn năm, bỏ qua. Ba nhỏ hơn năm: i tiến lên một ô, rồi đổi chỗ ba với tám. Vùng màu xanh là các số không lớn hơn pivot."

```tsx
import { ArrayViz, TitleWithVisual } from "@kit";

export default function Scene() {
  return (
    <TitleWithVisual title="Phân hoạch Lomuto" kicker="Quick sort · lượt 1">
      <ArrayViz
        label="A"
        values={[8, 3, 7, 4, 9, 2, 6, 5]}
        pointerTones={{ i: "ok", j: "info" }}
        steps={[
          { at: "cue:pivot là", pivot: 7, range: [0, 7], note: "pivot = 5" },
          { at: "cue:con trỏ i", pointers: { i: -1, j: 0 }, note: "i = −1, j = 0" },
          { at: "cue:tám lớn", compare: [0, 7], note: "8 > 5 → bỏ qua" },
          { at: "cue:ba nhỏ", pointers: { j: 1 }, compare: [1, 7], note: "3 ≤ 5" },
          { at: "cue:tiến lên", pointers: { i: 0 } },
          { at: "cue:đổi chỗ", swap: [0, 1], note: "đổi A[0] ↔ A[1]" },
          { at: "cue:vùng màu xanh", regions: [{ from: 0, to: 0, label: "≤ pivot", tone: "ok" }], note: "" },
        ]}
      />
    </TitleWithVisual>
  );
}
```

## tree.tsx

Narration: ""

```tsx
import { TitleWithVisual, Tree } from "@kit";

export const narration =
  "Mảng ban đầu được chia quanh pivot năm. Nửa trái là ba, bốn, hai. Nửa phải là chín, bảy, sáu, tám. Mỗi nửa lại được chia tiếp, cho đến khi chỉ còn một phần tử. Đệ quy đi xuống nhánh trái trước, rồi mới sang nhánh phải.";

export default function Scene() {
  return (
    <TitleWithVisual title="Cây đệ quy của quick sort">
      <Tree
        height={600}
        nodes={[
          { id: "r", label: "[8,3,7,4,9,2,6,5]", parent: null, at: "cue:mảng ban đầu" },
          { id: "p", label: "5", parent: "r", tone: "accent", at: "cue:pivot năm" },
          { id: "L", label: "[3,4,2]", parent: "r", at: "cue:nửa trái" },
          { id: "R", label: "[9,7,6,8]", parent: "r", at: "cue:nửa phải" },
          { id: "L1", label: "[2]", parent: "L", tone: "ok", at: "cue:chia tiếp" },
          { id: "L2", label: "[4,3]", parent: "L", at: "cue:chia tiếp+0.3" },
          { id: "R1", label: "[7,6]", parent: "R", at: "cue:chia tiếp+0.6" },
          { id: "R2", label: "[9]", parent: "R", tone: "ok", at: "cue:chia tiếp+0.9" },
          { id: "L3", label: "[3]", parent: "L2", tone: "ok", at: "cue:một phần tử" },
          { id: "R3", label: "[6]", parent: "R1", tone: "ok", at: "cue:một phần tử+0.3" },
        ]}
        visit={[
          { id: "r", at: "cue:đệ quy đi" },
          { id: "L", at: "cue:nhánh trái" },
          { id: "L2", at: "cue:nhánh trái+0.6" },
          { id: "R", at: "cue:nhánh phải", tone: "info" },
        ]}
      />
    </TitleWithVisual>
  );
}
```

## diagram.tsx

Narration: "Thuật toán bắt đầu từ đỉnh A. Từ A ta đi tới B với chi phí hai, và tới C với chi phí năm. Tín hiệu lan từ A sang B rồi sang D. Đường qua B rồi tới D là ngắn nhất."

```tsx
import { Diagram, TitleWithVisual } from "@kit";

export default function Scene() {
  return (
    <TitleWithVisual title="Đường đi ngắn nhất">
      <Diagram
        width={1400}
        height={640}
        nodes={[
          { id: "A", label: "A", x: 0.08, y: 0.5, shape: "circle", tone: "accent", at: "cue:đỉnh a" },
          { id: "B", label: "B", x: 0.4, y: 0.15, shape: "circle", at: "cue:tới b" },
          { id: "C", label: "C", x: 0.4, y: 0.85, shape: "circle", at: "cue:tới c" },
          { id: "D", label: "D", x: 0.85, y: 0.5, shape: "circle", at: "cue:tín hiệu" },
        ]}
        edges={[
          { from: "A", to: "B", label: "2", at: "cue:tới b" },
          { from: "A", to: "C", label: "5", at: "cue:tới c" },
          { from: "B", to: "D", label: "3", at: "cue:tín hiệu" },
          { from: "C", to: "D", label: "4", at: "cue:tín hiệu" },
        ]}
        pulses={[
          { from: "A", to: "B", at: "cue:lan từ" },
          { from: "B", to: "D", at: "cue:sang d" },
        ]}
        highlights={[
          { id: "B", at: "cue:sang b", tone: "info" },
          { id: "D", at: "cue:ngắn nhất", tone: "ok" },
        ]}
      />
    </TitleWithVisual>
  );
}
```

## bar-sort.tsx

Narration: "Bubble sort so sánh từng cặp kề nhau. Năm lớn hơn hai, đổi chỗ. Năm nhỏ hơn tám, giữ nguyên. Tám lớn hơn ba, đổi chỗ. Cột lớn nhất đã nổi lên cuối dãy."

```tsx
import { BarChart, TitleWithVisual } from "@kit";

export default function Scene() {
  return (
    <TitleWithVisual title="Bubble sort: số lớn nổi lên">
      <BarChart
        width={1100}
        height={560}
        at="cue:bubble sort"
        gap={0.12}
        bars={[
          { label: "", value: 5 },
          { label: "", value: 2 },
          { label: "", value: 8 },
          { label: "", value: 3 },
        ]}
        steps={[
          { at: "cue:năm lớn", compare: [0, 1] },
          { at: "cue:đổi chỗ", swap: [0, 1] },
          { at: "cue:năm nhỏ", compare: [1, 2] },
          { at: "cue:tám lớn", compare: [2, 3] },
          { at: "cue:tám lớn@end", swap: [2, 3] },
          { at: "cue:lớn nhất", done: [3] },
        ]}
      />
    </TitleWithVisual>
  );
}
```

## table.tsx

Narration: "So sánh ba thuật toán. Merge sort luôn n log n nhưng tốn thêm bộ nhớ. Heap sort không tốn bộ nhớ phụ. Quick sort nhanh nhất trong thực tế."

```tsx
import { Table, TitleWithVisual } from "@kit";

export default function Scene() {
  return (
    <TitleWithVisual title="Chọn thuật toán sắp xếp">
      <Table
        at="cue:so sánh"
        columns={["Thuật toán", "Trung bình", "Tệ nhất", "Bộ nhớ phụ"]}
        rows={[
          { cells: ["Merge sort", "$n\\log n$", "$n\\log n$", "$O(n)$"], at: "cue:merge sort" },
          { cells: ["Heap sort", "$n\\log n$", "$n\\log n$", "$O(1)$"], at: "cue:heap sort" },
          { cells: ["Quick sort", "$n\\log n$", "$n^2$", "$O(\\log n)$"], at: "cue:quick sort", tone: "accent", toneAt: "cue:nhanh nhất" },
        ]}
      />
    </TitleWithVisual>
  );
}
```

## cards.tsx

Narration: "Có ba cách chọn pivot. Lấy phần tử cuối thì đơn giản. Chọn ngẫu nhiên tránh được dữ liệu xấu. Trung vị của ba là lựa chọn thực dụng nhất."

```tsx
import { Cards, TitleWithVisual } from "@kit";

export default function Scene() {
  return (
    <TitleWithVisual title="Chọn pivot thế nào?">
      <Cards
        at="cue:ba cách"
        cards={[
          { title: "Phần tử cuối", points: ["Đơn giản", "Tệ với mảng đã sắp"], tone: "warn" },
          { title: "Ngẫu nhiên", points: ["Tránh dữ liệu xấu", "Cần sinh số ngẫu nhiên"], tone: "info" },
          { title: "Trung vị của ba", points: ["Đầu, giữa, cuối", "Ổn định trong thực tế"], tone: "ok" },
        ]}
        focus={[
          { index: 0, at: "cue:phần tử cuối" },
          { index: 1, at: "cue:ngẫu nhiên" },
          { index: 2, at: "cue:trung vị" },
        ]}
      />
    </TitleWithVisual>
  );
}
```

## dot-grid.tsx

Narration: "Hình dung một trăm người. Chỉ một người thật sự mắc bệnh. Nhưng xét nghiệm báo nhầm thêm chín người khỏe mạnh. Vậy trong mười người dương tính, chỉ một người bị bệnh."

```tsx
import { DotGrid, Formula, Stack, TitleWithVisual } from "@kit";

export default function Scene() {
  return (
    <TitleWithVisual title="Dương tính chưa chắc đã mắc bệnh">
      <Stack gap={40}>
        <DotGrid
          count={100}
          cols={20}
          at="cue:một trăm người"
          groups={[
            { count: 1, color: "err", at: "cue:thật sự", label: "Mắc bệnh" },
            { count: 9, color: "warn", at: "cue:báo nhầm", label: "Dương tính giả" },
          ]}
        />
        <Formula tex="P(\text{bệnh} \mid +) = \frac{\err{1}}{\err{1} + \warn{9}} = 10\%" at="cue:vậy trong" reveal="write" size={60} />
      </Stack>
    </TitleWithVisual>
  );
}
```

## callout.tsx

Narration: "Lưu ý: hàm số liên tục tại một điểm chưa chắc đã có đạo hàm tại điểm đó."

```tsx
import { Callout, FullVisual } from "@kit";

export default function Scene() {
  return (
    <FullVisual>
      <Callout tone="warn" title="Lỗi hay gặp" text="Liên tục tại $x_0$ chưa chắc có đạo hàm tại $x_0$. Ví dụ: $y = |x|$ tại $x = 0$." at="cue:lưu ý" width={1300} />
    </FullVisual>
  );
}
```

## code-block.tsx

Narration: "Đây là đạo hàm số tính bằng sai phân trung tâm. Dòng quan trọng nhất là dòng trả về, nơi ta chia cho hai h."

```tsx
import { CodeBlock, TitleWithVisual } from "@kit";

export default function Scene() {
  return (
    <TitleWithVisual title="Tính đạo hàm bằng code" align="center">
      <CodeBlock
        title="derivative.py"
        at="cue:đây là"
        highlight={[3]}
        highlightAt="cue:dòng trả về"
        code={`def derivative(f, x, h=1e-5):
    # central difference
    return (f(x + h) - f(x - h)) / (2 * h)

print(derivative(lambda x: x**2, 3))  # 6.0`}
      />
    </TitleWithVisual>
  );
}
```

## timeline-history.tsx

Narration: "Năm 938, Ngô Quyền đánh tan quân Nam Hán trên sông Bạch Đằng. Năm 1288, Trần Hưng Đạo lại dùng cọc gỗ trên chính dòng sông ấy. Năm 1789, Quang Trung đại phá quân Thanh. Ba chiến thắng, cùng một tinh thần."

```tsx
import { Timeline, TitleWithVisual } from "@kit";

// Dates as numbers + proportional spacing: the gaps between events are real.
export default function Scene() {
  return (
    <TitleWithVisual title="Ba chiến thắng lừng lẫy">
      <Timeline
        at="cue:năm 938"
        proportional
        events={[
          { date: "938", label: "Ngô Quyền, Bạch Đằng", at: "cue:năm 938", icon: "anchor" },
          { date: "1288", label: "Trần Hưng Đạo, Bạch Đằng", at: "cue:năm 1288", icon: "swords" },
          { date: "1789", label: "Quang Trung đại phá quân Thanh", at: "cue:năm 1789", icon: "flag" },
        ]}
        focus={[{ at: "cue:cọc gỗ", index: 1 }, { at: "cue:ba chiến thắng", index: null }]}
      />
    </TitleWithVisual>
  );
}
```

## icons-water.tsx

Narration: "Nắng làm nước biển bốc hơi. Hơi nước bay lên cao, gặp lạnh thì ngưng tụ thành mây. Mây nặng hạt rơi xuống thành mưa. Nước chảy theo sông trở về biển, và vòng tuần hoàn lại bắt đầu."

```tsx
import { Cycle, TitleWithVisual } from "@kit";

// One stage per sentence; `active` follows the narration around the ring.
export default function Scene() {
  return (
    <TitleWithVisual title="Vòng tuần hoàn của nước">
      <Cycle
        center="Vòng tuần hoàn nước"
        stages={[
          { label: "Bốc hơi", icon: "sun", at: "cue:bốc hơi", tone: "warn" },
          { label: "Ngưng tụ", icon: "cloud", at: "cue:ngưng tụ", tone: "info" },
          { label: "Mưa", icon: "rain", at: "cue:thành mưa", tone: "info" },
          { label: "Dòng chảy", icon: "waves", at: "cue:chảy theo sông", tone: "ok" },
        ]}
        active={[
          { at: "cue:bốc hơi", index: 0 },
          { at: "cue:ngưng tụ", index: 1 },
          { at: "cue:thành mưa", index: 2 },
          { at: "cue:chảy theo sông", index: 3 },
          { at: "cue:lại bắt đầu", index: null },
        ]}
        size={780}
      />
    </TitleWithVisual>
  );
}
```

## mindmap-literature.tsx

Narration: "Truyện Kiều có thể nhìn từ bốn phía. Về nội dung, đó là số phận người phụ nữ tài hoa bạc mệnh. Về nhân vật, Thuý Kiều hiện lên tài sắc và hiếu nghĩa. Về nghệ thuật, Nguyễn Du dùng thể lục bát điêu luyện. Và giá trị nhân đạo thấm trong từng câu thơ."

```tsx
import { MindMap, TitleWithVisual } from "@kit";

// Branches arrive with their sentence; `focus` stays on the branch being discussed.
export default function Scene() {
  return (
    <TitleWithVisual title="Truyện Kiều qua bốn góc nhìn">
      <MindMap
        center="Truyện Kiều"
        at="cue:truyện kiều"
        branches={[
          { label: "Nội dung", items: ["Số phận người phụ nữ", "Tài hoa bạc mệnh"], at: "cue:về nội dung", icon: "book" },
          { label: "Nhân vật", items: ["Thuý Kiều: tài, sắc", "Hiếu nghĩa"], at: "cue:về nhân vật", icon: "person" },
          { label: "Nghệ thuật", items: ["Thể lục bát", "Ngôn ngữ điêu luyện"], at: "cue:về nghệ thuật", icon: "feather" },
          { label: "Giá trị", items: ["Nhân đạo", "Tố cáo xã hội"], at: "cue:giá trị nhân đạo", icon: "heart" },
        ]}
        focus={[
          { at: "cue:về nội dung", index: 0 },
          { at: "cue:về nhân vật", index: 1 },
          { at: "cue:về nghệ thuật", index: 2 },
          { at: "cue:giá trị nhân đạo", index: 3 },
        ]}
      />
    </TitleWithVisual>
  );
}
```

## passage-poem.tsx

Narration: "Hãy đọc hai câu thơ tả chị em Thuý Kiều. Mai cốt cách, tuyết tinh thần là ẩn dụ: vẻ đẹp thanh cao, trong trắng. Mỗi người một vẻ cho thấy hai nét đẹp khác nhau. Mười phân vẹn mười khẳng định cả hai đều hoàn hảo."

```tsx
import { Passage, TitleWithVisual } from "@kit";

// Each phrase is marked when the narration reaches it; its note appears in the right column.
export default function Scene() {
  return (
    <TitleWithVisual title="Bút pháp ước lệ của Nguyễn Du">
      <Passage
        at="cue:hãy đọc"
        text={"Mai cốt cách, tuyết tinh thần,\nMỗi người một vẻ, mười phân vẹn mười."}
        source="— Nguyễn Du, Truyện Kiều"
        width={980}
        size={52}
        marks={[
          { phrase: "Mai cốt cách, tuyết tinh thần", at: "cue:là ẩn dụ", note: "Ẩn dụ: thanh cao, trong trắng" },
          { phrase: "Mỗi người một vẻ", at: "cue:hai nét đẹp", mode: "underline", color: "info", note: "Mỗi người một nét riêng" },
          { phrase: "mười phân vẹn mười", at: "cue:khẳng định", mode: "circle", color: "ok", note: "Thành ngữ: hoàn hảo" },
        ]}
      />
    </TitleWithVisual>
  );
}
```

## venn-sets.tsx

Narration: "Lớp có 30 bạn. 18 bạn thích Toán, 15 bạn thích Văn. Có 8 bạn thích cả hai môn. Vậy số bạn thích ít nhất một môn là 18 cộng 15 trừ 8, bằng 25."

```tsx
import { TitleWithVisual, Venn } from "@kit";

// Shade the intersection first, then the union; counts sit in the zones they describe.
export default function Scene() {
  return (
    <TitleWithVisual title="Đếm bằng biểu đồ Venn">
      <Venn
        at="cue:lớp có"
        universe="Lớp: 30 bạn"
        sets={[{ label: "Toán" }, { label: "Văn" }]}
        steps={[
          { at: "cue:cả hai", shade: "A&B", color: "accent" },
          { at: "cue:ít nhất một", shade: "A|B", color: "ok" },
        ]}
        values={[
          { in: "A-B", text: "10", at: "cue:thích toán" },
          { in: "B-A", text: "7", at: "cue:thích văn" },
          { in: "A&B", text: "8", at: "cue:cả hai" },
          { in: "!A&!B", text: "5", at: "cue:bằng 25" },
        ]}
      />
    </TitleWithVisual>
  );
}
```

## pie-economy.tsx

Narration: "Không khí khô gồm chủ yếu là nitơ, chiếm khoảng 78 phần trăm. Oxi chiếm 21 phần trăm. Phần còn lại, chưa tới một phần trăm, là argon và các khí khác."

```tsx
import { PieChart, TitleWithVisual } from "@kit";

// Slices sweep in; `focus` pulls out the slice the narrator is talking about.
export default function Scene() {
  return (
    <TitleWithVisual title="Thành phần của không khí">
      <PieChart
        at="cue:không khí"
        center="Không khí khô"
        slices={[
          { label: "Nitơ $\\ce{N2}$", value: 78, color: "info" },
          { label: "Oxi $\\ce{O2}$", value: 21, color: "ok" },
          { label: "Argon và khí khác", value: 1, color: "warn" },
        ]}
        focus={[
          { at: "cue:chủ yếu", index: 0 },
          { at: "cue:oxi chiếm", index: 1 },
          { at: "cue:phần còn lại", index: 2 },
        ]}
      />
    </TitleWithVisual>
  );
}
```

## grid-dp.tsx

Narration: "Đếm số đường đi từ góc trên trái xuống góc dưới phải, chỉ được đi sang phải hoặc xuống. Hàng đầu và cột đầu chỉ có một cách. Mỗi ô còn lại bằng ô bên trên cộng ô bên trái. Cứ thế điền dần, ô cuối cùng là 20."

```tsx
import { GridViz, TitleWithVisual } from "@kit";

// DP table: `from` draws arrows from the cells a value depends on into the cell being filled.
export default function Scene() {
  return (
    <TitleWithVisual title="Quy hoạch động: đếm đường đi">
      <GridViz
        at="cue:đếm số"
        width={760}
        values={[
          [1, 1, 1, 1],
          [1, null, null, null],
          [1, null, null, null],
          [1, null, null, null],
        ]}
        reveal="cells"
        steps={[
          { at: "cue:hàng đầu", done: [[0, 0], [0, 1], [0, 2], [0, 3], [1, 0], [2, 0], [3, 0]], note: "hàng đầu, cột đầu: 1 cách" },
          { at: "cue:mỗi ô", focus: [[1, 1]], from: [[0, 1], [1, 0]], set: [{ r: 1, c: 1, v: 2 }], note: "$1 + 1 = 2$" },
          { at: "cue:ô bên trái", focus: [[1, 2]], from: [[0, 2], [1, 1]], set: [{ r: 1, c: 2, v: 3 }], note: "$1 + 2 = 3$" },
          { at: "cue:điền dần", set: [{ r: 1, c: 3, v: 4 }, { r: 2, c: 1, v: 3 }, { r: 2, c: 2, v: 6 }, { r: 2, c: 3, v: 10 }, { r: 3, c: 1, v: 4 }, { r: 3, c: 2, v: 10 }], note: "" },
          { at: "cue:ô cuối cùng", focus: [[3, 3]], from: [[2, 3], [3, 2]], set: [{ r: 3, c: 3, v: 20 }], note: "$10 + 10 = 20$" },
        ]}
      />
    </TitleWithVisual>
  );
}
```

## map-history.tsx

Narration: "Thế kỷ mười lăm, châu Âu tìm đường biển sang châu Á. Năm 1498, Vasco da Gama đi từ Bồ Đào Nha, vòng qua mũi Hảo Vọng, tới Ấn Độ. Con đường này mở ra thời đại giao thương toàn cầu."

```tsx
import { TitleWithVisual, WorldMap } from "@kit";

// The route is drawn as the narration follows it; the countries at both ends light up.
export default function Scene() {
  return (
    <TitleWithVisual title="Đường biển sang Ấn Độ">
      <WorldMap
        region={[-30, 95, -42, 50]}
        at="cue:thế kỷ"
        highlights={[
          { countries: ["Bồ Đào Nha"], at: "cue:bồ đào nha", color: "accent" },
          { countries: ["Ấn Độ"], at: "cue:tới ấn độ", color: "ok", label: "Ấn Độ" },
        ]}
        markers={[
          { at: [-9.1, 38.7], label: "Lisbon", when: "cue:bồ đào nha", dir: "l" },
          { at: [18.5, -34.4], label: "Mũi Hảo Vọng", when: "cue:mũi hảo vọng", dir: "r" },
          { at: [75.8, 11.3], label: "Calicut", when: "cue:tới ấn độ", dir: "r" },
        ]}
        routes={[
          {
            points: [[-9.1, 38.7], [-18, 22], [-20, 2], [-5, -22], [18.5, -36.5], [36, -22], [42, -4], [55, 8], [75.8, 11.3]],
            when: "cue:năm 1498",
            duration: 5,
            color: "err",
          },
        ]}
      />
    </TitleWithVisual>
  );
}
```

## chem-ionic.tsx

Narration: "Natri có một electron ở lớp ngoài cùng, còn clo có bảy. Natri nhường electron đó cho clo. Natri thành ion dương, clo thành ion âm. Hai ion hút nhau tạo thành muối ăn."

```tsx
import { Arrow, Atom, Formula, Row, Stack, TitleWithVisual } from "@kit";

// The outer electron of Na flies out (lose) while Cl gains one (gain), timed to the same sentence.
export default function Scene() {
  return (
    <TitleWithVisual title="Liên kết ion trong muối ăn">
      <Stack gap={30}>
        <Row gap={40}>
          <Atom symbol="Na" shells={[2, 8, 1]} at="cue:natri có" size={440} highlight={[{ at: "cue:lớp ngoài cùng", shell: -1 }]} lose={{ at: "cue:nhường electron" }} label="$\ce{Na -> Na+}$" />
          <Arrow at="cue:nhường electron" length={140} label="$e^-$" color="accent" flow />
          <Atom symbol="Cl" shells={[2, 8, 7]} at="cue:còn clo" size={440} highlight={[{ at: "cue:có bảy", shell: -1 }]} gain={{ at: "cue:nhường electron+0.6" }} label="$\ce{Cl -> Cl-}$" />
        </Row>
        <Formula tex="\ce{Na+ + Cl- -> NaCl}" at="cue:hút nhau" reveal="write" size={64} />
      </Stack>
    </TitleWithVisual>
  );
}
```

## chem-reaction.tsx

Narration: "Hai phân tử hiđro gặp một phân tử oxi. Các liên kết cũ bị phá vỡ. Nguyên tử sắp xếp lại, và liên kết mới hình thành. Kết quả là hai phân tử nước."

```tsx
import { Formula, Molecule, Stack, TitleWithVisual } from "@kit";

// Bonds break, atoms move to their new places, new bonds form: the equation happens on screen.
export default function Scene() {
  return (
    <TitleWithVisual title="Hiđro cháy tạo thành nước">
      <Stack gap={24}>
        <Molecule
          at="cue:hai phân tử"
          scale={110}
          atoms={[
            { id: "H1", el: "H", x: -4, y: 1 },
            { id: "H2", el: "H", x: -3, y: 1 },
            { id: "H3", el: "H", x: -4, y: -1 },
            { id: "H4", el: "H", x: -3, y: -1 },
            { id: "O1", el: "O", x: 0.4, y: 0 },
            { id: "O2", el: "O", x: 1.6, y: 0 },
          ]}
          bonds={[{ a: "H1", b: "H2" }, { a: "H3", b: "H4" }, { a: "O1", b: "O2", order: 2 }]}
          steps={[
            { at: "cue:bị phá vỡ", break: ["H1-H2", "H3-H4", "O1-O2"], note: "liên kết cũ đứt" },
            {
              at: "cue:sắp xếp lại",
              move: { O1: [-1.5, 0], O2: [2.5, 0], H1: [-2.3, 0.6], H2: [-0.7, 0.6], H3: [1.7, 0.6], H4: [3.3, 0.6] },
              note: "",
            },
            { at: "cue:liên kết mới", form: [{ a: "O1", b: "H1" }, { a: "O1", b: "H2" }, { a: "O2", b: "H3" }, { a: "O2", b: "H4" }], highlight: ["O1", "O2"], note: "liên kết O–H hình thành" },
          ]}
        />
        <Formula tex="\ce{2H2 + O2 -> 2H2O}" at="cue:kết quả" reveal="write" size={64} />
      </Stack>
    </TitleWithVisual>
  );
}
```

## axes-calculus.tsx

Narration: "Đây là đồ thị hàm số f x bằng x mũ ba trừ ba x. Đặt một tiếp tuyến tại điểm này. Khi trượt sang phải, độ dốc giảm dần rồi bằng không ở đỉnh. Phóng to thật gần, đường cong gần như thẳng."

```tsx
import { Axes, Plot, Tangent, TitleWithVisual } from "@kit";

// The tangent slides to the peak while its slope label counts down to 0; then the camera zooms into the peak.
export default function Scene() {
  return (
    <TitleWithVisual title="Độ dốc thay đổi dọc đường cong">
      <Axes x={[-3, 3]} y={[-4, 4]} width={1400} height={700} view={[{ at: "cue:phóng to", x: [-1.2, -0.8], y: [1.75, 2.25] }]}>
        <Plot fn="x^3 - 3x" at="cue:đồ thị" label="$f(x) = x^3 - 3x$" labelX={2.1} labelDir="r" />
        <Tangent
          fn="x^3 - 3x"
          at="cue:tiếp tuyến"
          x={[{ at: 0, value: -2.1 }, { at: "cue:trượt sang", value: -1, duration: 3 }]}
          slope
        />
      </Axes>
    </TitleWithVisual>
  );
}
```

## axes-linear.tsx

Narration: "Mỗi ma trận là một cách biến đổi mặt phẳng. Hai vector cơ sở i mũ và j mũ cho biết mọi thứ đi đâu. Với phép trượt này, i mũ đứng yên còn j mũ nghiêng sang phải. Vector v đi theo, vì nó là tổ hợp của i mũ và j mũ."

```tsx
import { Axes, Formula, Row, TitleWithVisual, Vector } from "@kit";

// The whole plane (grid, basis vectors, v) follows the matrix; the faint original grid stays as reference.
// Matrix columns wear the colors of î (ok) and ĵ (err), like the arrows.
export default function Scene() {
  return (
    <TitleWithVisual title="Ma trận là một phép biến đổi">
      <Row gap={56}>
        <Axes x={[-5, 5]} grid="plane" basis ticks={false} at="cue:mỗi ma trận" width={1080} height={720} matrix={[{ at: "cue:phép trượt", m: [[1, 1], [0, 1]] }]}>
          <Vector x={2} y={1} color="warn" label="$\vec v$" at="cue:vector v" />
        </Axes>
        <Formula tex="\begin{bmatrix} \ok{1} & \err{1} \\ \ok{0} & \err{1} \end{bmatrix}" at="cue:phép trượt" size={72} />
      </Row>
    </TitleWithVisual>
  );
}
```

## axes-geometry.tsx

Narration: "Lấy một tam giác vuông với hai cạnh góc vuông a và b. Cạnh huyền là c. Dựng hình vuông trên mỗi cạnh. Diện tích hai hình vuông nhỏ cộng lại đúng bằng hình vuông lớn."

```tsx
import { Angle, Axes, Polygon, Segment, TitleWithVisual } from "@kit";

// Pure geometry: Axes without axes or grid, every shape placed by its vertices.
export default function Scene() {
  return (
    <TitleWithVisual title="Định lý Pythagore bằng hình">
      <Axes x={[-3, 6]} y={[-3.6, 5.4]} axes={false} grid="none" equal width={1000} height={720}>
        <Polygon points={[[0, 0], [3, 0], [3, -3], [0, -3]]} at="cue:dựng hình vuông" color="info" fill="info" label="$a^2$" />
        <Polygon points={[[0, 0], [0, 2], [-2, 2], [-2, 0]]} at="cue:dựng hình vuông+0.4" color="ok" fill="ok" label="$b^2$" />
        <Polygon points={[[3, 0], [0, 2], [2, 5], [5, 3]]} at="cue:hình vuông lớn" color="accent" fill="accent" label="$c^2$" />
        <Segment from={[0, 0]} to={[3, 0]} at="cue:tam giác vuông" label="$a$" labelDir="u" color="info" width={6} />
        <Segment from={[0, 0]} to={[0, 2]} at="cue:tam giác vuông+0.3" label="$b$" labelDir="r" color="ok" width={6} />
        <Segment from={[3, 0]} to={[0, 2]} at="cue:cạnh huyền" label="$c$" labelDir="ur" color="accent" width={6} />
        <Angle vertex={[0, 0]} from={[3, 0]} to={[0, 2]} at="cue:tam giác vuông+0.6" />
      </Axes>
    </TitleWithVisual>
  );
}
```

## axes-unit-circle.tsx

Narration: "Cho một điểm chạy trên đường tròn đơn vị. Góc theta tăng dần. Hình chiếu xuống trục ngang là cos theta, còn chiều cao chính là sin theta."

```tsx
import { Angle, Axes, Circle, Point, Segment, TitleWithVisual, useTrack } from "@kit";

// useTrack gives one animated number; everything computed from it moves together.
export default function Scene() {
  const theta = useTrack([{ at: 0, value: 0.6 }, { at: "cue:tăng dần", value: 2.2, duration: 3.5, ease: "linear" }]);
  const x = Math.cos(theta);
  const y = Math.sin(theta);
  return (
    <TitleWithVisual title="Sin và cos trên đường tròn đơn vị">
      <Axes x={[-1.6, 1.6]} y={[-1.25, 1.25]} equal ticks={false} width={1200} height={720}>
        <Circle r={1} at="cue:đường tròn" color="muted" />
        <Segment from={[0, 0]} to={[x, y]} at="cue:một điểm" color="text" duration={0.4} />
        <Angle vertex={[0, 0]} from={[1, 0]} to={[x, y]} at="cue:góc theta" label="$\theta$" radius={64} />
        <Segment from={[0, 0]} to={[x, 0]} at="cue:hình chiếu" color="ok" width={7} label="$\cos\theta$" labelDir="d" duration={0.4} />
        <Segment from={[x, 0]} to={[x, y]} at="cue:chiều cao" color="err" width={7} label="$\sin\theta$" labelDir="l" duration={0.4} />
        <Point x={x} y={y} at="cue:một điểm" />
      </Axes>
    </TitleWithVisual>
  );
}
```

## axes-riemann.tsx

Narration: "Muốn tính diện tích dưới đường cong, ta chia nó thành bốn hình chữ nhật. Tổng diện tích còn thiếu một chút. Chia thành mười sáu hình, rồi sáu mươi tư hình, phần thiếu gần như biến mất. Giới hạn ấy chính là tích phân."

```tsx
import { Axes, Formula, Plot, Riemann, Stack, Switch, TitleWithVisual } from "@kit";

// One Riemann sum whose n steps up with the narration: 4 → 16 → 64.
export default function Scene() {
  return (
    <TitleWithVisual title="Từ hình chữ nhật đến tích phân">
      <Stack gap={24}>
        <Axes x={[0, 4]} y={[0, 5]} width={1300} height={600}>
          <Plot fn="0.25x^2 + 1" at="cue:đường cong" />
          <Riemann
            fn="0.25x^2 + 1"
            from={0.5}
            to={3.5}
            at="cue:bốn hình"
            n={[{ at: 0, value: 4 }, { at: "cue:mười sáu", value: 16 }, { at: "cue:sáu mươi tư", value: 64 }]}
          />
        </Axes>
        <Switch at={["cue:bốn hình", "cue:giới hạn ấy"]} effect="flip">
          <Formula tex="\sum_{i} f(x_i)\,\Delta x" size={64} />
          <Formula tex="\int_{0.5}^{3.5} f(x)\,dx" size={64} color="accent" />
        </Switch>
      </Stack>
    </TitleWithVisual>
  );
}
```

## axes-field.tsx

Narration: "Mỗi điểm trong mặt phẳng có một mũi tên chỉ hướng chuyển động. Thả các hạt vào, chúng trôi theo dòng và xoáy dần vào tâm."

```tsx
import { Axes, Formula, Stack, TitleWithVisual, VectorField } from "@kit";

export default function Scene() {
  return (
    <TitleWithVisual title="Trường vector và dòng chảy">
      <Stack gap={20}>
        <Formula tex="\dot x = -y - 0.2x, \quad \dot y = x - 0.2y" at="cue:mỗi điểm" size={52} color="muted" />
        <Axes x={[-4, 4]} grid="none" ticks={false} width={1300} height={640}>
          <VectorField fx="-y - 0.2x" fy="x - 0.2y" at="cue:mũi tên" particles="cue:thả các hạt" />
        </Axes>
      </Stack>
    </TitleWithVisual>
  );
}
```

## axes-derivative.tsx

Narration: "Lấy hai điểm trên đường cong. Đường nối chúng là cát tuyến, độ dốc bằng delta y chia delta x. Giờ kéo điểm thứ hai lại gần. Khi khoảng cách tiến về không, cát tuyến trở thành tiếp tuyến."

```tsx
import { Axes, Plot, Secant, TitleWithVisual } from "@kit";

// x2 slides toward x1: the rise/run triangle shrinks and the live slope settles on the derivative.
export default function Scene() {
  return (
    <TitleWithVisual title="Từ cát tuyến đến tiếp tuyến">
      <Axes x={[-0.5, 4.5]} y={[-0.5, 5]} width={1300} height={700}>
        <Plot fn="0.3x^2 + 0.4" at={0} label="$f(x)$" />
        <Secant
          fn="0.3x^2 + 0.4"
          x1={1}
          x2={[{ at: 0, value: 3.6 }, { at: "cue:kéo điểm", value: 1.8, duration: 2 }, { at: "cue:tiến về không", value: 1.001, duration: 2.5 }]}
          at="cue:hai điểm"
          slope
        />
      </Axes>
    </TitleWithVisual>
  );
}
```

## panels-problem.tsx

Narration: "Bài toán: rào một mảnh vườn hình chữ nhật bằng 20 mét lưới, sao cho diện tích lớn nhất. Gọi chiều rộng là x, chiều dài là 10 trừ x. Diện tích là x nhân 10 trừ x. Đồ thị là một parabol, đỉnh tại x bằng 5. Vậy mảnh vườn là hình vuông cạnh 5 mét."

```tsx
import { Axes, BraceBetween, Derivation, Panels, Plot, Point, Polygon, Stage, TitleWithVisual } from "@kit";

// Three views of one problem: the picture, the algebra, the graph. Panels appear and take focus in turn.
export default function Scene() {
  return (
    <TitleWithVisual title="Rào vườn sao cho rộng nhất">
      <Panels
        columns={3}
        titles={["Hình", "Lời giải", "Đồ thị"]}
        at={["cue:bài toán", "cue:gọi chiều", "cue:đồ thị"]}
        focus={[{ at: "cue:gọi chiều", index: 1 }, { at: "cue:đồ thị", index: 2 }, { at: "cue:vậy mảnh", index: null }]}
      >
        <Stage x={[-1, 9]} y={[-1, 6]} width={420} height={320}>
          <Polygon points={[[0, 0], [7, 0], [7, 3], [0, 3]]} at="cue:hình chữ nhật" color="ok" fill="ok" label="$S$" />
          <BraceBetween from={[0, 0]} to={[7, 0]} label="$10 - x$" at="cue:chiều dài" />
          <BraceBetween from={[0, 0]} to={[0, 3]} label="$x$" at="cue:gọi chiều" flip />
          <Polygon points={[[1.5, 0.5], [6.5, 0.5], [6.5, 5.5], [1.5, 5.5]]} at="cue:hình vuông" color="accent" />
        </Stage>
        <Derivation
          size={40}
          lines={[
            { tex: "\\text{rộng} &= x", at: "cue:gọi chiều" },
            { tex: "\\text{dài} &= 10 - x", at: "cue:chiều dài" },
            { tex: "S &= x(10 - x)", at: "cue:diện tích là" },
            { tex: "x &= 5", at: "cue:đỉnh tại", result: true },
          ]}
        />
        <Axes x={[0, 10]} y={[0, 28]} width={480} height={360} tickStep={[5, 10]}>
          <Plot fn="x*(10 - x)" at="cue:đồ thị" color="info" />
          <Point x={5} on="x*(10 - x)" at="cue:đỉnh tại" label="$(5;\ 25)$" guides />
        </Axes>
      </Panels>
    </TitleWithVisual>
  );
}
```

## chart-climate.tsx

Narration: "Đây là nhiệt độ trung bình từng tháng ở Hà Nội. Mùa đông lạnh, khoảng 17 độ. Nhiệt độ tăng dần và đạt đỉnh vào tháng 6, tháng 7. Còn Thành phố Hồ Chí Minh thì nóng quanh năm, gần như không đổi."

```tsx
import { Axes, Point, Region, Scatter, TitleWithVisual } from "@kit";

// Two data series in one Axes: each Scatter draws itself as a line chart, one color per city.
// Region and Point add a beat for the winter and the peak.
export default function Scene() {
  return (
    <TitleWithVisual title="Khí hậu hai miền">
      <Axes x={[0.5, 12.5]} y={[10, 32]} width={1400} height={680} tickStep={[1, 5]} labels={["tháng", "°C"]}>
        <Scatter
          points={[[1, 16.4], [2, 17.2], [3, 20.2], [4, 23.7], [5, 27.3], [6, 28.8], [7, 28.9], [8, 28.2], [9, 27.2], [10, 24.6], [11, 21.4], [12, 18.2]]}
          connect
          at="cue:ở hà nội"
          over={3}
          color="info"
          label="Hà Nội"
        />
        <Region x={[0.5, 2.5]} y={[10, 32]} color="info" label="mùa đông" labelDir="c" at="cue:mùa đông" />
        <Point x={7} y={28.9} at="cue:đạt đỉnh" label="$28{,}9\,°C$" labelDir="u" color="info" />
        <Scatter
          points={[[1, 25.8], [2, 26.7], [3, 27.9], [4, 28.9], [5, 28.3], [6, 27.5], [7, 27.1], [8, 27.1], [9, 26.8], [10, 26.7], [11, 26.4], [12, 25.7]]}
          connect
          at="cue:thành phố"
          over={2}
          color="accent"
          label="TP.HCM"
        />
      </Axes>
    </TitleWithVisual>
  );
}
```

## axes-fourier.tsx

Narration: "Một vòng tròn quay đều vẽ ra một đường tròn. Thêm vòng thứ hai quay nhanh gấp ba, rồi vòng thứ ba, thứ tư. Càng nhiều vòng, hình vẽ ra càng gần một hình vuông."

```tsx
import { Axes, Epicycles, TitleWithVisual } from "@kit";

// Frequencies 1, −3, 5, −7… with radius ∝ 1/n² draw a square; `show` adds circles one at a time.
const terms = [1, -3, 5, -7, 9, -11, 13].map((freq) => ({ freq, r: 2.4 / (freq * freq) }));

export default function Scene() {
  return (
    <TitleWithVisual title="Chồng các vòng tròn">
      <Axes x={[-4.5, 4.5]} y={[-3, 3]} axes={false} equal width={1300} height={720}>
        <Epicycles
          terms={terms}
          at="cue:một vòng tròn"
          speed={0.2}
          trail={5}
          show={[
            { at: 0, value: 1 },
            { at: "cue:vòng thứ hai", value: 2, duration: 0 },
            { at: "cue:vòng thứ ba", value: 3, duration: 0 },
            { at: "cue:thứ tư", value: 4, duration: 0 },
            { at: "cue:càng nhiều", value: 7, duration: 0 },
          ]}
        />
      </Axes>
    </TitleWithVisual>
  );
}
```

## stage-biology.tsx

Narration: "Đây là một tế bào thực vật. Bao ngoài là thành tế bào cứng. Ở giữa là nhân, nơi chứa thông tin di truyền. Lục lạp nằm rải rác, nơi diễn ra quang hợp."

```tsx
import { Circle, Label, Path, Stage, TitleWithVisual } from "@kit";

// A schematic built from shapes placed in coordinates: closed Paths with fill, a Circle, Labels.
export default function Scene() {
  return (
    <TitleWithVisual title="Cấu tạo tế bào thực vật">
      <Stage x={[-8, 8]} y={[-4, 4]} width={1500} height={760}>
        <Path points={[[-5.3, -2.5], [5.3, -2.5], [5.6, 0], [5.3, 2.5], [-5.3, 2.5], [-5.6, 0]]} closed smooth={false} color="ok" fill="ok" fillOpacity={0.08} width={3} at="cue:tế bào thực vật" />
        <Path points={[[-6, -3], [6, -3], [6.4, 0], [6, 3], [-6, 3], [-6.4, 0]]} closed smooth={false} color="ok" width={10} at="cue:thành tế bào" label="thành tế bào" labelAt={0.42} labelDir="r" />
        <Circle center={[0, 0.2]} r={1.3} color="warn" fill="warn" at="cue:nhân" />
        <Label x={0} y={0.2} text="nhân" at="cue:nhân+0.4" size={34} />
        <Path points={[[-4.4, 1.2], [-3.6, 1.6], [-2.9, 1.2], [-3.6, 0.8]]} closed color="ok" fill="ok" fillOpacity={0.5} at="cue:lục lạp" duration={0.6} />
        <Path points={[[2.8, -1.2], [3.6, -0.8], [4.3, -1.2], [3.6, -1.6]]} closed color="ok" fill="ok" fillOpacity={0.5} at="cue:rải rác" duration={0.6} />
        <Path points={[[2.6, 1.6], [3.4, 2.0], [4.1, 1.6], [3.4, 1.2]]} closed color="ok" fill="ok" fillOpacity={0.5} at="cue:rải rác+0.3" duration={0.6} />
        <Label x={-3.6} y={2.0} text="lục lạp" at="cue:lục lạp+0.4" color="ok" size={30} />
      </Stage>
    </TitleWithVisual>
  );
}
```

## three-surface.tsx

Narration: "Đồ thị của hàm hai biến là một mặt cong. Với x bình phương trừ y bình phương, ta được hình yên ngựa. Gốc toạ độ là điểm yên ngựa: đi theo trục x thì lên, theo trục y thì xuống."

```tsx
import { Axes3D, Curve3D, Point3D, Surface, TitleWithVisual } from "@kit";

// The camera spins slowly so the viewer reads depth; the surface rises out of the floor.
export default function Scene() {
  return (
    <TitleWithVisual title="Mặt yên ngựa">
      <Axes3D x={[-2, 2]} y={[-2, 2]} z={[-3, 3]} spin={6} width={1300} height={760}>
        <Surface fn="0.7*(x^2 - y^2)" at="cue:mặt cong" />
        <Curve3D x="t" y="0" z="0.7*t^2" t={[-2, 2]} at="cue:theo trục x" color="ok" drawDuration={1.2} />
        <Curve3D x="0" y="t" z="-0.7*t^2" t={[-2, 2]} at="cue:theo trục y" color="err" drawDuration={1.2} />
        <Point3D x={0} y={0} z={0} at="cue:gốc toạ độ" label="điểm yên ngựa" />
      </Axes3D>
    </TitleWithVisual>
  );
}
```

## code-steps.tsx

Narration: "Ba lỗi hay gặp. Thứ nhất, khởi tạo i sai: phải là l trừ một. Thứ hai, vòng j chạy quá xa. Thứ ba, quên hoán đổi cuối cùng với pivot."

```tsx
import { Callout, CodeBlock, Stack, Switch, TwoColumn } from "@kit";

export default function Scene() {
  return (
    <TwoColumn title="Lỗi hay gặp khi cài Lomuto" ratio={0.58}>
      <CodeBlock
        size={30}
        lineGap={0}
        at="cue:ba lỗi"
        code={`function partition(A, l, r)
  pivot = A[r]
  i = l - 1
  for j = l to r - 1
    if A[j] < pivot
      i = i + 1
      swap A[i], A[j]
  swap A[i + 1], A[r]
  return i + 1`}
        steps={[
          { at: "cue:khởi tạo", highlight: [3] },
          { at: "cue:vòng j", highlight: [4] },
          { at: "cue:quên hoán đổi", highlight: [8] },
        ]}
      />
      <Stack>
        <Switch at={["cue:khởi tạo", "cue:vòng j", "cue:quên hoán đổi"]}>
          <Callout tone="err" title="Lỗi 1" text="Khởi tạo $i = l$ thay vì $l - 1$" width={620} />
          <Callout tone="err" title="Lỗi 2" text="$j$ chạy tới $r$, so pivot với chính nó" width={620} />
          <Callout tone="err" title="Lỗi 3" text="Quên đặt pivot vào $A[i+1]$" width={620} />
        </Switch>
      </Stack>
    </TwoColumn>
  );
}
```

## motion.tsx

Narration: "Lấy n bằng một nghìn. Nếu thuật toán chạy n log n, ta cần khoảng mười nghìn phép so sánh. Nhưng nếu là n bình phương, con số vọt lên một triệu. Gấp một trăm lần!"

```tsx
import { Arrow, Counter, FadeIn, Formula, Pulse, Row, Stack, Switch, TitleWithVisual } from "@kit";

export default function Scene() {
  return (
    <TitleWithVisual title="Một nghìn phần tử, hai số phận">
      <Stack gap={56}>
        <Row gap={40}>
          <FadeIn at="cue:lấy n" effect="pop">
            <Formula tex="n = 1000" size={84} />
          </FadeIn>
          <Arrow at="cue:thuật toán chạy" length={200} flow />
          <Switch at={["cue:thuật toán chạy", "cue:n bình phương"]} effect="flip">
            <Formula tex="n\log n" size={84} color="ok" />
            <Formula tex="n^2" size={84} color="err" />
          </Switch>
          <Arrow at="cue:ta cần" length={200} />
          <Pulse at="cue:gấp một trăm" mode="ring" color="err" strength={1.4}>
            <Counter value={10000} at="cue:mười nghìn" steps={[{ at: "cue:vọt lên", value: 1000000 }]} duration={1.6} size={100} />
          </Pulse>
        </Row>
        <FadeIn at="cue:gấp một trăm" effect="blur">
          <Formula tex="\times\,100" size={72} color="accent" />
        </FadeIn>
      </Stack>
    </TitleWithVisual>
  );
}
```

## camera-split.tsx

Narration: "Merge sort chia mảng làm đôi. Rồi chia tiếp mỗi nửa. Hãy nhìn kỹ nửa trái: ba và tám. Sau đó ta lùi lại để thấy toàn bộ các khúc."

```tsx
import { ArrayViz, Camera, TitleWithVisual } from "@kit";

export default function Scene() {
  return (
    <TitleWithVisual title="Chia để trị">
      <Camera
        keys={[
          { at: "cue:nhìn kỹ", zoom: 1.8, x: 0.14, y: 0.3 },
          { at: "cue:lùi lại", zoom: 1, x: 0.5, y: 0.5 },
        ]}
      >
        <ArrayViz
          values={[8, 3, 5, 1, 9, 2, 7, 4]}
          showIndices={false}
          steps={[
            { at: "cue:làm đôi", split: [3], note: "2 nửa" },
            { at: "cue:chia tiếp", split: [1, 3, 5], note: "4 khúc" },
            { at: "cue:ba và", compare: [0, 1] },
            { at: "cue:lùi lại", note: "mỗi khúc 2 phần tử" },
          ]}
        />
      </Camera>
    </TitleWithVisual>
  );
}
```

## icons-chain.tsx

Narration: "Rừng bị chặt phá. Mưa lớn không còn gì giữ lại, đất bị xói mòn. Nước dồn xuống sông rất nhanh, gây lũ quét."

```tsx
import { Arrow, Icon, Pulse, Row, TitleWithVisual } from "@kit";

// A cause → effect chain: icons arrive one per clause, the consequence pulses red.
export default function Scene() {
  return (
    <TitleWithVisual title="Mất rừng dẫn tới lũ quét">
      <Row gap={36}>
        <Icon name="forest" label="Chặt phá rừng" at="cue:rừng bị" color="ok" badge size={180} />
        <Arrow at="cue:mưa lớn" length={130} />
        <Icon name="rain" label="Đất xói mòn" at="cue:xói mòn" color="warn" badge size={180} effect="left" />
        <Arrow at="cue:nước dồn" length={130} flow />
        <Pulse at="cue:lũ quét+0.3" mode="shake" color="err">
          <Icon name="waves" label="Lũ quét" at="cue:lũ quét" color="err" badge size={180} />
        </Pulse>
      </Row>
    </TitleWithVisual>
  );
}
```

## plot-params.tsx

Narration: "Xét hàm a nhân sin x. Khi a tăng, sóng cao dần lên. Khi a âm, sóng bị lật ngược. Giờ uốn nó thành một parabol."

```tsx
import { Axes, LiveTex, Plot, Slider, Stack, TitleWithVisual } from "@kit";

// One track drives the curve (params), the slider and the live formula at the same time.
const A = [
  { at: 0, value: 1 },
  { at: "cue:a tăng", value: 2.5, duration: 2 },
  { at: "cue:a âm", value: -1.5, duration: 1.6 },
];

export default function Scene() {
  return (
    <TitleWithVisual title="Một tham số, cả họ đường cong">
      <Stack gap={28}>
        <Axes x={[-6.5, 6.5]} y={[-3.2, 3.2]} width={1400} height={560}>
          <Plot fn="a*sin(x)" params={{ a: A }} at="cue:xét hàm" morph={[{ at: "cue:uốn nó", fn: "0.12x^2 - 2" }]} />
        </Axes>
        <Stack gap={12}>
          <Slider label="$a$" value={A} min={-3} max={3} at="cue:xét hàm" />
          <LiveTex tex="y = \info{ {a} }\sin x" values={{ a: A }} decimals={1} at="cue:xét hàm" size={52} />
        </Stack>
      </Stack>
    </TitleWithVisual>
  );
}
```
