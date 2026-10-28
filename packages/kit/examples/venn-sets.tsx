import { TitleWithVisual, Venn } from "@kit";

export const narration =
  "Lớp có 30 bạn. 18 bạn thích Toán, 15 bạn thích Văn. Có 8 bạn thích cả hai môn. Vậy số bạn thích ít nhất một môn là 18 cộng 15 trừ 8, bằng 25.";

// Shade the intersection first, then the union; counts sit in the zones they describe.
export default function Scene() {
  return (
    <TitleWithVisual title="Đếm bằng biểu đồ Venn">
      <Venn
        at="cue:lớp có"
        universe="Lớp: 30 bạn"
        sets={[{ label: "Toán" }, { label: "Văn" }]}
        steps={[
          { at: "cue:cả hai", shade: "A&B", color: "accent" },
          { at: "cue:ít nhất một", shade: "A|B", color: "ok" },
        ]}
        values={[
          { in: "A-B", text: "10", at: "cue:thích toán" },
          { in: "B-A", text: "7", at: "cue:thích văn" },
          { in: "A&B", text: "8", at: "cue:cả hai" },
          { in: "!A&!B", text: "5", at: "cue:bằng 25" },
        ]}
      />
    </TitleWithVisual>
  );
}
