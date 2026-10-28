import { BulletReveal, TitleWithVisual } from "@kit";

export const narration =
  "Tóm lại, đạo hàm cho ta ba điều. Thứ nhất, tốc độ thay đổi tức thời. Thứ hai, hệ số góc của tiếp tuyến. Thứ ba, dấu của đạo hàm cho biết hàm tăng hay giảm.";

// Each bullet appears exactly when the narrator reaches it.
export default function Scene() {
  return (
    <TitleWithVisual title="Ghi nhớ" align="left">
      <BulletReveal
        numbered
        focus
        items={[
          { text: "Tốc độ thay đổi tức thời", at: "cue:thứ nhất" },
          { text: "Hệ số góc của tiếp tuyến", at: "cue:thứ hai" },
          { text: "$f'(x) > 0$: hàm tăng, $f'(x) < 0$: hàm giảm", at: "cue:thứ ba" },
        ]}
      />
    </TitleWithVisual>
  );
}
