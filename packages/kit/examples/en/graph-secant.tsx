import { Graph, TitleWithVisual } from "@kit";

export const narration =
  "Let's plot distance against time. Take two points and join them with a straight line: that is the average speed. Now pull the two points closer together, and closer still.";

// The second point slides toward the first while the narrator says "closer together".
export default function Scene() {
  return (
    <TitleWithVisual title="From average speed to instant speed">
      <Graph
        fn="0.3x^2 + 0.5x"
        domain={[0, 6]}
        axisLabels={["t", "s"]}
        draw="cue:distance against"
        secant={{ x1: 2, x2: 5, at: "cue:two points", shrinkAt: "cue:closer together", shrinkDuration: 3.5 }}
        showSlope
        slopeLabel="Average speed"
      />
    </TitleWithVisual>
  );
}
