import { NumberLine, TitleWithVisual } from "@kit";

export const narration =
  "Start at minus two. Add five: we jump five steps to the right and land on three. The numbers greater than three form an open ray to the right.";

// An interval whose `to` lies past the range is drawn as a ray (no end dot).
export default function Scene() {
  return (
    <TitleWithVisual title="Adding is jumping right">
      <NumberLine
        range={[-5, 8]}
        step={1}
        points={[{ x: [{ at: 0, value: -2 }, { at: "cue:jump five", value: 3, duration: 0.8 }], label: "$x$", at: "cue:start at" }]}
        jumps={[{ from: -2, to: 3, at: "cue:jump five", label: "$+5$" }]}
        intervals={[{ from: 3, to: 99, at: "cue:the numbers", closed: [false, false], label: "$x > 3$" }]}
      />
    </TitleWithVisual>
  );
}
