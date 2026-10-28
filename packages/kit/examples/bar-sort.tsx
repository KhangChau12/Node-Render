import { BarChart, TitleWithVisual } from "@kit";

export const narration =
  "Bubble sort so sánh từng cặp kề nhau. Năm lớn hơn hai, đổi chỗ. Năm nhỏ hơn tám, giữ nguyên. Tám lớn hơn ba, đổi chỗ. Cột lớn nhất đã nổi lên cuối dãy.";

export default function Scene() {
  return (
    <TitleWithVisual title="Bubble sort: số lớn nổi lên">
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
          { at: "cue:năm lớn", compare: [0, 1] },
          { at: "cue:đổi chỗ", swap: [0, 1] },
          { at: "cue:năm nhỏ", compare: [1, 2] },
          { at: "cue:tám lớn", compare: [2, 3] },
          { at: "cue:tám lớn@end", swap: [2, 3] },
          { at: "cue:lớn nhất", done: [3] },
        ]}
      />
    </TitleWithVisual>
  );
}
