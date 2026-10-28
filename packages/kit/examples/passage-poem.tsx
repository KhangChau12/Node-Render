import { Passage, TitleWithVisual } from "@kit";

export const narration =
  "Hãy đọc hai câu thơ tả chị em Thuý Kiều. Mai cốt cách, tuyết tinh thần là ẩn dụ: vẻ đẹp thanh cao, trong trắng. Mỗi người một vẻ cho thấy hai nét đẹp khác nhau. Mười phân vẹn mười khẳng định cả hai đều hoàn hảo.";

// Each phrase is marked when the narration reaches it; its note appears in the right column.
export default function Scene() {
  return (
    <TitleWithVisual title="Bút pháp ước lệ của Nguyễn Du">
      <Passage
        at="cue:hãy đọc"
        text={"Mai cốt cách, tuyết tinh thần,\nMỗi người một vẻ, mười phân vẹn mười."}
        source="— Nguyễn Du, Truyện Kiều"
        width={980}
        size={52}
        marks={[
          { phrase: "Mai cốt cách, tuyết tinh thần", at: "cue:là ẩn dụ", note: "Ẩn dụ: thanh cao, trong trắng" },
          { phrase: "Mỗi người một vẻ", at: "cue:hai nét đẹp", mode: "underline", color: "info", note: "Mỗi người một nét riêng" },
          { phrase: "mười phân vẹn mười", at: "cue:khẳng định", mode: "circle", color: "ok", note: "Thành ngữ: hoàn hảo" },
        ]}
      />
    </TitleWithVisual>
  );
}
