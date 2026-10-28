import { BulletReveal, Graph, TwoColumn } from "@kit";

export const narration =
  "On the left is the graph of y equals x squared. The tangent slides along the curve. When the tangent points up, the function is rising. When it points down, the function is falling.";

export default function Scene() {
  return (
    <TwoColumn title="The sign of the derivative" ratio={0.6}>
      <Graph fn="x^2" domain={[-3, 3]} width={980} height={640} label="y = x²" tangent={{ x: -2.5, to: 2.5, at: "cue:the tangent", moveAt: "cue:slides along", moveDuration: 5 }} />
      <BulletReveal
        size="small"
        items={[
          { text: "Points up: $f'(x) > 0$, rising", at: "cue:points up" },
          { text: "Points down: $f'(x) < 0$, falling", at: "cue:points down" },
        ]}
      />
    </TwoColumn>
  );
}
