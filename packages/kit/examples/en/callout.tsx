import { Callout, FullVisual } from "@kit";

export const narration = "Careful: a function that is continuous at a point does not always have a derivative there.";

export default function Scene() {
  return (
    <FullVisual>
      <Callout tone="warn" title="Common mistake" text="Continuous at $x_0$ does not mean differentiable at $x_0$. Example: $y = |x|$ at $x = 0$." at="cue:careful" width={1300} />
    </FullVisual>
  );
}
