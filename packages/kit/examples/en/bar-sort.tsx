import { BarChart, TitleWithVisual } from "@kit";

export const narration =
  "Bubble sort compares each pair of neighbours. Five is bigger than two, so swap. Five is smaller than eight, keep them. Eight is bigger than three, so swap. The tallest bar has bubbled up to the end.";

export default function Scene() {
  return (
    <TitleWithVisual title="Bubble sort: big values rise">
      <BarChart
        width={1100}
        height={560}
        at="cue:bubble sort"
        gap={0.12}
        bars={[
          { label: "", value: 5 },
          { label: "", value: 2 },
          { label: "", value: 8 },
          { label: "", value: 3 },
        ]}
        steps={[
          { at: "cue:five is bigger", compare: [0, 1] },
          { at: "cue:so swap", swap: [0, 1] },
          { at: "cue:five is smaller", compare: [1, 2] },
          { at: "cue:eight is", compare: [2, 3] },
          { at: "cue:eight is@end", swap: [2, 3] },
          { at: "cue:the tallest", done: [3] },
        ]}
      />
    </TitleWithVisual>
  );
}
