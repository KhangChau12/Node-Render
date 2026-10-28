import { BarChart, TitleWithVisual } from "@kit";

export const narration =
  "Với một nghìn phần tử, n log n chỉ khoảng mười nghìn phép so sánh. Còn n bình phương là một triệu, lớn gấp một trăm lần.";

export default function Scene() {
  return (
    <TitleWithVisual title="Số phép so sánh khi n = 1000">
      <BarChart
        width={1100}
        height={560}
        bars={[
          { label: "$n\\log n$", value: 10, valueLabel: "≈ 10 000", tone: "ok", at: "cue:n log n" },
          { label: "$n^2$", value: 1000, valueLabel: "1 000 000", tone: "err", at: "cue:n bình phương" },
        ]}
      />
    </TitleWithVisual>
  );
}
