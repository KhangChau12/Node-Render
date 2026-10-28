import { Axes, Plot, Tangent, TitleWithVisual } from "@kit";

export const narration =
  "Here is the graph of f of x equals x cubed minus three x. Put a tangent line at this point. As it slides to the right, the slope shrinks and reaches zero at the peak. Zoom in very close, and the curve looks almost straight.";

// The tangent slides to the peak while its slope label counts down to 0; then the camera zooms into the peak.
export default function Scene() {
  return (
    <TitleWithVisual title="The slope changes along the curve">
      <Axes x={[-3, 3]} y={[-4, 4]} width={1400} height={700} view={[{ at: "cue:zoom in", x: [-1.2, -0.8], y: [1.75, 2.25] }]}>
        <Plot fn="x^3 - 3x" at="cue:the graph" label="$f(x) = x^3 - 3x$" labelX={2.1} labelDir="r" />
        <Tangent
          fn="x^3 - 3x"
          at="cue:tangent line"
          x={[{ at: 0, value: -2.1 }, { at: "cue:slides to", value: -1, duration: 3 }]}
          slope
        />
      </Axes>
    </TitleWithVisual>
  );
}
