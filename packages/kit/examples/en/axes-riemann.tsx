import { Axes, Formula, Plot, Riemann, Stack, Switch, TitleWithVisual } from "@kit";

export const narration =
  "To find the area under the curve, we cut it into four rectangles. Their total falls a little short. Cut it into sixteen, then sixty four rectangles, and the gap almost disappears. That limit is the integral.";

// One Riemann sum whose n steps up with the narration: 4 → 16 → 64.
export default function Scene() {
  return (
    <TitleWithVisual title="From rectangles to the integral">
      <Stack gap={24}>
        <Axes x={[0, 4]} y={[0, 5]} width={1300} height={600}>
          <Plot fn="0.25x^2 + 1" at="cue:the curve" />
          <Riemann
            fn="0.25x^2 + 1"
            from={0.5}
            to={3.5}
            at="cue:four rectangles"
            n={[{ at: 0, value: 4 }, { at: "cue:sixteen", value: 16 }, { at: "cue:sixty four", value: 64 }]}
          />
        </Axes>
        <Switch at={["cue:four rectangles", "cue:that limit"]} effect="flip">
          <Formula tex="\sum_{i} f(x_i)\,\Delta x" size={64} />
          <Formula tex="\int_{0.5}^{3.5} f(x)\,dx" size={64} color="accent" />
        </Switch>
      </Stack>
    </TitleWithVisual>
  );
}
