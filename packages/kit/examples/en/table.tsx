import { Table, TitleWithVisual } from "@kit";

export const narration =
  "Let's compare three algorithms. Merge sort is always n log n but needs extra memory. Heap sort needs no extra memory. Quick sort is the fastest in practice.";

export default function Scene() {
  return (
    <TitleWithVisual title="Choosing a sorting algorithm">
      <Table
        at="cue:compare three"
        columns={["Algorithm", "Average", "Worst", "Extra memory"]}
        rows={[
          { cells: ["Merge sort", "$n\\log n$", "$n\\log n$", "$O(n)$"], at: "cue:merge sort" },
          { cells: ["Heap sort", "$n\\log n$", "$n\\log n$", "$O(1)$"], at: "cue:heap sort" },
          { cells: ["Quick sort", "$n\\log n$", "$n^2$", "$O(\\log n)$"], at: "cue:quick sort", tone: "accent", toneAt: "cue:the fastest" },
        ]}
      />
    </TitleWithVisual>
  );
}
