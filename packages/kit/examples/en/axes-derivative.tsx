import { Axes, Plot, Secant, TitleWithVisual } from "@kit";

export const narration =
  "Take two points on the curve. The line through them is a secant, and its slope is delta y over delta x. Now drag the second point closer. As the gap shrinks to zero, the secant becomes the tangent.";

// x2 slides toward x1: the rise/run triangle shrinks and the live slope settles on the derivative.
export default function Scene() {
  return (
    <TitleWithVisual title="From secant to tangent">
      <Axes x={[-0.5, 4.5]} y={[-0.5, 5]} width={1300} height={700}>
        <Plot fn="0.3x^2 + 0.4" at={0} label="$f(x)$" />
        <Secant
          fn="0.3x^2 + 0.4"
          x1={1}
          x2={[{ at: 0, value: 3.6 }, { at: "cue:drag the", value: 1.8, duration: 2 }, { at: "cue:shrinks to", value: 1.001, duration: 2.5 }]}
          at="cue:two points"
          slope
        />
      </Axes>
    </TitleWithVisual>
  );
}
