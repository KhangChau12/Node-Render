import { BarChart, TitleWithVisual } from "@kit";

export const narration =
  "With a thousand elements, n log n needs about ten thousand comparisons. But n squared is a million, a hundred times more.";

export default function Scene() {
  return (
    <TitleWithVisual title="Comparisons when n = 1000">
      <BarChart
        width={1100}
        height={560}
        bars={[
          { label: "$n\\log n$", value: 10, valueLabel: "≈ 10,000", tone: "ok", at: "cue:n log n" },
          { label: "$n^2$", value: 1000, valueLabel: "1,000,000", tone: "err", at: "cue:n squared" },
        ]}
      />
    </TitleWithVisual>
  );
}
