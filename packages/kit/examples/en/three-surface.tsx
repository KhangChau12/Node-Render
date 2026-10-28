import { Axes3D, Curve3D, Point3D, Surface, TitleWithVisual } from "@kit";

export const narration =
  "The graph of a function of two variables is a surface. For x squared minus y squared, we get a saddle. The origin is a saddle point: along the x axis it goes up, along the y axis it goes down.";

// The camera spins slowly so the viewer reads depth; the surface rises out of the floor.
export default function Scene() {
  return (
    <TitleWithVisual title="A saddle surface">
      <Axes3D x={[-2, 2]} y={[-2, 2]} z={[-3, 3]} spin={6} width={1300} height={760}>
        <Surface fn="0.7*(x^2 - y^2)" at="cue:a surface" />
        <Curve3D x="t" y="0" z="0.7*t^2" t={[-2, 2]} at="cue:the x axis" color="ok" drawDuration={1.2} />
        <Curve3D x="0" y="t" z="-0.7*t^2" t={[-2, 2]} at="cue:the y axis" color="err" drawDuration={1.2} />
        <Point3D x={0} y={0} z={0} at="cue:the origin" label="saddle point" />
      </Axes3D>
    </TitleWithVisual>
  );
}
