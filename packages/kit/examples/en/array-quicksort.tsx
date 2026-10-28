import { ArrayViz, TitleWithVisual } from "@kit";

export const narration =
  "The pivot is five, the last element. Pointer i waits before the array, j starts scanning. Eight is bigger than five, skip it. Three is smaller than five: i moves up one cell, then we swap three with eight. The green region holds the numbers no bigger than the pivot.";

export default function Scene() {
  return (
    <TitleWithVisual title="Lomuto partition" kicker="Quick sort · pass 1">
      <ArrayViz
        label="A"
        values={[8, 3, 7, 4, 9, 2, 6, 5]}
        pointerTones={{ i: "ok", j: "info" }}
        steps={[
          { at: "cue:the pivot", pivot: 7, range: [0, 7], note: "pivot = 5" },
          { at: "cue:pointer i", pointers: { i: -1, j: 0 }, note: "i = −1, j = 0" },
          { at: "cue:eight is", compare: [0, 7], note: "8 > 5 → skip" },
          { at: "cue:three is", pointers: { j: 1 }, compare: [1, 7], note: "3 ≤ 5" },
          { at: "cue:moves up", pointers: { i: 0 } },
          { at: "cue:we swap", swap: [0, 1], note: "swap A[0] ↔ A[1]" },
          { at: "cue:the green", regions: [{ from: 0, to: 0, label: "≤ pivot", tone: "ok" }], note: "" },
        ]}
      />
    </TitleWithVisual>
  );
}
