# Node Render

Turn a one-paragraph prompt into an animated lecture video, with you in the loop at every step.

```
Prompt ──▶ Lesson ──▶ Script ──▶ Scene code + live preview ──▶ MP4
            ↻ edit       ↻ edit      ↻ edit with AI at any frame
            + approve    + approve
```

1. **Prompt.** Describe the lecture in your own words. No forms.
2. **Lesson.** The AI drafts the lesson content. Edit by hand or ask the assistant to change a section; changes arrive as word-level diffs you accept or reject. Approve it when you are happy.
3. **Script.** The approved lesson becomes a storyboard: one card per scene with what is on screen and what the narrator says. Edit, reorder, ask the assistant. Approve it.
4. **Studio.** The AI writes one [Remotion](https://www.remotion.dev) scene per script row using the **Lecture Kit**. Preview instantly in the browser, pause at any moment and ask for a change. Every version is checked before it is saved (syntax, kit linter), then screenshotted and reviewed by a vision model, which fixes overlaps, overflow and unreadable text on its own.
5. **Export.** Render to MP4 locally, with burned-in captions, plus an `.srt` of the narration.

Every AI step streams: you see the model's reasoning summary, then the lesson, the script rows or the scene code being written, and can stop it at any time.

The UI is in Vietnamese; code, comments and docs are in English.

> **Voiceover is not built yet.** Timing is estimated from the narration text (syllables per second). Scenes sync to the narration through *cues*, so real TTS audio can replace the estimate later without touching scene code. Meanwhile, Studio can read the narration aloud with the browser's built-in voice to check pacing.

## Quick start

Requirements: Node.js 20+.

```bash
npm install
cp .env.example .env.local     # add OPENAI_API_KEY, or leave it empty to use mock mode
npm run dev                    # http://localhost:3210
```

Without an API key the app runs in **mock mode**: every AI step returns canned content, so you can try the full flow (including rendering) offline.

The first render downloads Chrome Headless Shell (~100 MB) through Remotion.

## Repository layout

```
apps/web/               Next.js app (UI, API routes, render worker)
  app/                  pages: home, lesson, script, studio, export, kit, settings
  lib/ai/               prompts, structured-output schemas, OpenAI + mock providers
  lib/actions.ts        project mutations (lesson, script, versions)
  lib/pipeline.ts       scene code pipeline: write → lint/repair → save → screenshot review → repair
  lib/stream.ts         client hook for streamed AI jobs (NDJSON from /api/projects/:id/stream)
  lib/video.ts          builds the Remotion input from a project (shared by preview and render)
  scripts/render.mjs    render worker, spawned per job
  scripts/stills.mjs    screenshot worker for the visual review
packages/kit/           Lecture Kit: Remotion components the AI writes scenes with
  src/timing/           narration timing + cue resolution ("cue:tiếp tuyến")
  src/components/       TitleCard, BulletReveal, Formula, FormulaSteps, MathMorph, Derivation, Graph, NumberLine,
                        Diagram, ArrayViz, GridViz, Tree, BarChart, PieChart, Table, Cards, DotGrid, Venn, Callout,
                        CodeBlock, Brace, Surround, Slider, LiveTex, Icon (curated Lucide set);
                        any subject: Timeline, Cycle, MindMap, Passage (annotated text), WorldMap, Atom, Molecule
  src/math/             Axes (coordinate system with view zoom, matrix and nonlinear warp) and the objects that live
                        in it: Plot, Parametric, Point (with trails), Vector, Segment, Polygon, Circle, Angle,
                        AreaUnder, Riemann, Tangent, Secant, Region, BraceBetween, Scatter, Epicycles, VectorField,
                        Label, Path, Spring, Group (move/rotate/scale); Stage (free canvas for any picture);
                        Axes3D with Surface, Curve3D, Point3D, Vector3D, Segment3D, Solid (hidden edges dashed);
                        safe expressions (with `time`); tracks (useTrack) for animated values
  src/layouts/          TitleWithVisual, TwoColumn, FullVisual (auto-shrink content that would overflow)
  src/primitives/       layout: Stack, Row, Switch · motion: FadeIn/Stagger (10 entrance effects), Pulse,
                        Animate, Camera, Counter, Arrow · text: Typewriter, Highlight, DrawPath
  src/runtime/          compiles AI-written TSX in the browser and in the renderer; lint.ts checks it
  examples/             one runnable example per component (also used as AI docs); examples/en: English versions
  docs/rules.md         hand-written rules for the AI
  docs/kit-docs.md      generated: rules + props tables + examples, sent to the AI
apps/site/               landing page (static, English / Vietnamese): product tour, showcase, kit reference
  scripts/render-media.ts renders the hero reel and every example still with the product's own pipeline
data/                   your projects and renders (git-ignored)
```

## The Lecture Kit

The kit is what makes videos look good. The AI does not draw from scratch; it composes kit components and syncs them to the narration:

```tsx
import { Graph, TitleWithVisual } from "@kit";

export default function Scene() {
  return (
    <TitleWithVisual title="Từ vận tốc trung bình đến tức thời">
      <Graph
        fn="0.3x^2 + 0.5x"
        domain={[0, 6]}
        draw="cue:quãng đường"
        secant={{ x1: 2, x2: 5, at: "cue:hai điểm", shrinkAt: "cue:gần nhau hơn" }}
        showSlope
      />
    </TitleWithVisual>
  );
}
```

Every component has a Zod schema. The schema validates props at runtime (errors go back to the AI for auto-fixing) and generates the docs the AI reads.

Motion is part of the kit, not an afterthought: data components animate their operations (`ArrayViz` cells arc over each other when swapped, lift when compared, split apart for divide and conquer; `BarChart` bars swap and resize; `Diagram` pulses travel along edges; `Tree` nodes light up as they are visited), and primitives cover emphasis (`Pulse`), camera moves (`Camera`), counting numbers (`Counter`), keyframed movement (`Animate`) and replacing content in place (`Switch`). For math, `Axes` holds objects placed by coordinates that build up and then change: a tangent slides while its slope updates, a Riemann sum refines from 4 to 64 rectangles, the view zooms into a point, the whole plane follows a matrix, and `MathMorph` moves each term of an equation to its new place. Any number can be animated with a track (`useTrack`), and TeX gets theme color macros (`\info{f(x)}`) so a quantity keeps one color in the formula and the picture.

The kit is not only for math. `Stage` is a free canvas in coordinate units where any picture is built from shapes (`Region`, `Path`, `Circle`, `Spring`, `Vector`, `Label`) and moved with `Group` and expressions of `time`: a spring oscillates, a pendulum swings, a light ray is drawn. Chemistry gets `\ce{…}` in every formula, `Atom` (electrons leave and join shells) and `Molecule` (bonds break, atoms move, new bonds form). History and geography get `Timeline` and `WorldMap` (countries light up, routes are drawn, the view flies between regions; Natural Earth 1:110m outlines, with the Paracel and Spratly archipelagos drawn as part of Viet Nam). Literature gets `Passage` (a poem or quote whose phrases are marked one by one with numbered notes) and `MindMap`. Solid geometry gets `Axes3D` + `Solid`, which dashes hidden edges and updates them as the camera turns. Hard problems can show several views at once with `Panels`, and a worked solution with `Derivation`. The background drifts slowly and scenes push in on cuts. The prompts ask for one visible change per narration sentence, and the linter rejects scenes that stay still while the narrator talks.

Components compute their own layout (`ArrayViz` gives each pointer its own lane, `Tree` positions nodes from `parent` links, layouts shrink content that would overflow into the captions). Scene code is not allowed to position things by coordinates: the linter rejects `position: absolute`, tiny fonts, hex colors, cues that are not in the narration, and TeX escapes that JavaScript would swallow.

### Adding a component

1. Write it in `packages/kit/src/components/` with a Zod schema (use `.describe()` on props) and a `KitEntry` meta object: summary, when to use, when not to.
2. Add an example in `packages/kit/examples/` and list it in `examples/index.ts`.
3. Register it in `packages/kit/src/registry.ts`.
4. Run `npm run kit:docs` to regenerate `kit-docs.md` / `kit-meta.json`.
5. Run `npm run lint:examples -w @lecture/kit`: every example must pass the same linter as AI-written scenes.
6. Preview all examples with `npm run kit:studio` (Remotion Studio).

Good candidates for new components are patterns the AI keeps writing by hand in custom scenes.

## Configuration

All settings live in `.env.local` at the repo root (see `.env.example`):

| Variable | Default | Purpose |
|---|---|---|
| `LLM_PROVIDER` | `openai` | `openai` or `mock` |
| `OPENAI_API_KEY` | – | Required for real AI output |
| `MODEL_LESSON`, `MODEL_SCRIPT`, `MODEL_CODEGEN`, `MODEL_QUICK_EDIT`, `MODEL_REVIEW` | `gpt-6.1-terra` for every task | Model per task (`MODEL_QUICK_EDIT` and `MODEL_REVIEW` get images, so they must accept image input) |
| `REASONING_*` | `medium` / `medium` / `high` / `low` / `low` | Reasoning effort per task (`low` … `max`) |
| `REASONING_SUMMARY` | `auto` | Stream the reasoning summary into the UI; `off` to disable (turned off automatically if your organization is not verified) |
| `DATA_DIR` | `./data` | Where projects and renders are stored |

Narration pace (syllables per second) and the automatic visual review are set in the app under **Cài đặt**.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the app on port 3210 |
| `npm run build` | Regenerate kit docs and build the app |
| `npm run kit:studio` | Open the kit gallery in Remotion Studio |
| `npm run kit:docs` | Regenerate `kit-docs.md` and `kit-meta.json` |
| `npm run typecheck` | Type-check kit and app |
| `npm run site:media` | Render the landing page's reels and stills (a few minutes) |
| `npm run site:build` | Build the landing page into `apps/site/dist` (published to GitHub Pages by `.github/workflows/site.yml`) |

## Roadmap

- Voiceover: pluggable TTS providers + forced alignment to replace estimated timing; record-your-own-voice mode.
- More kit components (image focus, scene transitions, province-level maps of Viet Nam).
- Streaming AI output in the editors.
- Other LLM providers.

## License

[MIT](LICENSE). Rendering uses [Remotion](https://www.remotion.dev), which is free for individuals and companies of up to 3 people; larger companies need a [Remotion company license](https://www.remotion.dev/license).
