import { BulletReveal, TitleWithVisual } from "@kit";

export const narration =
  "To sum up, the derivative gives us three things. First, the instant rate of change. Second, the slope of the tangent line. Third, its sign tells us whether the function rises or falls.";

// Each bullet appears exactly when the narrator reaches it.
export default function Scene() {
  return (
    <TitleWithVisual title="Remember" align="left">
      <BulletReveal
        numbered
        focus
        items={[
          { text: "The instant rate of change", at: "cue:first" },
          { text: "The slope of the tangent line", at: "cue:second" },
          { text: "$f'(x) > 0$: rising, $f'(x) < 0$: falling", at: "cue:third" },
        ]}
      />
    </TitleWithVisual>
  );
}
