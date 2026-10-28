import { Axes, Formula, Stack, TitleWithVisual, VectorField } from "@kit";

export const narration =
  "At every point of the plane an arrow shows the direction of motion. Drop in some particles: they drift with the flow and slowly spiral into the centre.";

export default function Scene() {
  return (
    <TitleWithVisual title="Vector fields and flow">
      <Stack gap={20}>
        <Formula tex="\dot x = -y - 0.2x, \quad \dot y = x - 0.2y" at="cue:every point" size={52} color="muted" />
        <Axes x={[-4, 4]} grid="none" ticks={false} width={1300} height={640}>
          <VectorField fx="-y - 0.2x" fy="x - 0.2y" at="cue:an arrow" particles="cue:drop in" />
        </Axes>
      </Stack>
    </TitleWithVisual>
  );
}
