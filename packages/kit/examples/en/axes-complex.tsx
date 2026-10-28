import { Axes, Formula, Point, Row, TitleWithVisual } from "@kit";

export const narration =
  "Every point of the plane is a complex number z. The function z squared sends each point somewhere new. Watch the whole grid bend with it. Angles double, and distances are squared.";

// warp: the whole plane (grid and points) bends from z to z² (u = x² − y², v = 2xy).
export default function Scene() {
  return (
    <TitleWithVisual title="A complex function bends the plane">
      <Row gap={56}>
        <Axes x={[-2.2, 2.2]} y={[-2.2, 2.2]} grid="plane" ticks={false} width={900} height={720} warp={[{ at: "cue:whole grid", fx: "x^2 - y^2", fy: "2*x*y" }]} transition={2.6}>
          <Point x={1} y={0.8} at="cue:complex number" label="$z$" />
        </Axes>
        <Formula tex="z \mapsto z^2" at="cue:z squared" size={80} />
      </Row>
    </TitleWithVisual>
  );
}
