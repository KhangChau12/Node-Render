import { TitleWithVisual, Tree } from "@kit";

export const narration =
  "Mảng ban đầu được chia quanh pivot năm. Nửa trái là ba, bốn, hai. Nửa phải là chín, bảy, sáu, tám. Mỗi nửa lại được chia tiếp, cho đến khi chỉ còn một phần tử. Đệ quy đi xuống nhánh trái trước, rồi mới sang nhánh phải.";

export default function Scene() {
  return (
    <TitleWithVisual title="Cây đệ quy của quick sort">
      <Tree
        height={600}
        nodes={[
          { id: "r", label: "[8,3,7,4,9,2,6,5]", parent: null, at: "cue:mảng ban đầu" },
          { id: "p", label: "5", parent: "r", tone: "accent", at: "cue:pivot năm" },
          { id: "L", label: "[3,4,2]", parent: "r", at: "cue:nửa trái" },
          { id: "R", label: "[9,7,6,8]", parent: "r", at: "cue:nửa phải" },
          { id: "L1", label: "[2]", parent: "L", tone: "ok", at: "cue:chia tiếp" },
          { id: "L2", label: "[4,3]", parent: "L", at: "cue:chia tiếp+0.3" },
          { id: "R1", label: "[7,6]", parent: "R", at: "cue:chia tiếp+0.6" },
          { id: "R2", label: "[9]", parent: "R", tone: "ok", at: "cue:chia tiếp+0.9" },
          { id: "L3", label: "[3]", parent: "L2", tone: "ok", at: "cue:một phần tử" },
          { id: "R3", label: "[6]", parent: "R1", tone: "ok", at: "cue:một phần tử+0.3" },
        ]}
        visit={[
          { id: "r", at: "cue:đệ quy đi" },
          { id: "L", at: "cue:nhánh trái" },
          { id: "L2", at: "cue:nhánh trái+0.6" },
          { id: "R", at: "cue:nhánh phải", tone: "info" },
        ]}
      />
    </TitleWithVisual>
  );
}
