import { BulletReveal, Graph, TwoColumn } from "@kit";

export const narration =
  "Bên trái là đồ thị y bằng x bình phương. Tiếp tuyến trượt dọc đường cong. Khi tiếp tuyến dốc lên, hàm đang tăng. Khi dốc xuống, hàm đang giảm.";

export default function Scene() {
  return (
    <TwoColumn title="Dấu của đạo hàm" ratio={0.6}>
      <Graph fn="x^2" domain={[-3, 3]} width={980} height={640} label="y = x²" tangent={{ x: -2.5, to: 2.5, at: "cue:tiếp tuyến", moveAt: "cue:trượt", moveDuration: 5 }} />
      <BulletReveal
        size="small"
        items={[
          { text: "Dốc lên: $f'(x) > 0$, hàm tăng", at: "cue:dốc lên" },
          { text: "Dốc xuống: $f'(x) < 0$, hàm giảm", at: "cue:dốc xuống" },
        ]}
      />
    </TwoColumn>
  );
}
