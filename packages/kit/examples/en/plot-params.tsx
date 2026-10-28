import { Axes, LiveTex, Plot, Slider, Stack, TitleWithVisual } from "@kit";

export const narration =
  "Consider a times sine of x. As a grows, the wave gets taller. When a turns negative, the wave flips over. Now bend it into a parabola.";

// One track drives the curve (params), the slider and the live formula at the same time.
const A = [
  { at: 0, value: 1 },
  { at: "cue:a grows", value: 2.5, duration: 2 },
  { at: "cue:turns negative", value: -1.5, duration: 1.6 },
];

export default function Scene() {
  return (
    <TitleWithVisual title="One parameter, a family of curves">
      <Stack gap={28}>
        <Axes x={[-6.5, 6.5]} y={[-3.2, 3.2]} width={1400} height={560}>
          <Plot fn="a*sin(x)" params={{ a: A }} at="cue:consider" morph={[{ at: "cue:bend it", fn: "0.12x^2 - 2" }]} />
        </Axes>
        <Stack gap={12}>
          <Slider label="$a$" value={A} min={-3} max={3} at="cue:consider" />
          <LiveTex tex="y = \info{ {a} }\sin x" values={{ a: A }} decimals={1} at="cue:consider" size={52} />
        </Stack>
      </Stack>
    </TitleWithVisual>
  );
}
