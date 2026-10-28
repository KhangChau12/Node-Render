import { Table, TitleWithVisual } from "@kit";

export const narration =
  "So sánh ba thuật toán. Merge sort luôn n log n nhưng tốn thêm bộ nhớ. Heap sort không tốn bộ nhớ phụ. Quick sort nhanh nhất trong thực tế.";

export default function Scene() {
  return (
    <TitleWithVisual title="Chọn thuật toán sắp xếp">
      <Table
        at="cue:so sánh"
        columns={["Thuật toán", "Trung bình", "Tệ nhất", "Bộ nhớ phụ"]}
        rows={[
          { cells: ["Merge sort", "$n\\log n$", "$n\\log n$", "$O(n)$"], at: "cue:merge sort" },
          { cells: ["Heap sort", "$n\\log n$", "$n\\log n$", "$O(1)$"], at: "cue:heap sort" },
          { cells: ["Quick sort", "$n\\log n$", "$n^2$", "$O(\\log n)$"], at: "cue:quick sort", tone: "accent", toneAt: "cue:nhanh nhất" },
        ]}
      />
    </TitleWithVisual>
  );
}
