import { ArrayViz, TitleWithVisual } from "@kit";

export const narration =
  "Pivot là năm, phần tử cuối. Con trỏ i đứng trước mảng, j bắt đầu quét. Tám lớn hơn năm, bỏ qua. Ba nhỏ hơn năm: i tiến lên một ô, rồi đổi chỗ ba với tám. Vùng màu xanh là các số không lớn hơn pivot.";

export default function Scene() {
  return (
    <TitleWithVisual title="Phân hoạch Lomuto" kicker="Quick sort · lượt 1">
      <ArrayViz
        label="A"
        values={[8, 3, 7, 4, 9, 2, 6, 5]}
        pointerTones={{ i: "ok", j: "info" }}
        steps={[
          { at: "cue:pivot là", pivot: 7, range: [0, 7], note: "pivot = 5" },
          { at: "cue:con trỏ i", pointers: { i: -1, j: 0 }, note: "i = −1, j = 0" },
          { at: "cue:tám lớn", compare: [0, 7], note: "8 > 5 → bỏ qua" },
          { at: "cue:ba nhỏ", pointers: { j: 1 }, compare: [1, 7], note: "3 ≤ 5" },
          { at: "cue:tiến lên", pointers: { i: 0 } },
          { at: "cue:đổi chỗ", swap: [0, 1], note: "đổi A[0] ↔ A[1]" },
          { at: "cue:vùng màu xanh", regions: [{ from: 0, to: 0, label: "≤ pivot", tone: "ok" }], note: "" },
        ]}
      />
    </TitleWithVisual>
  );
}
