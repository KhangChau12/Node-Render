import { Axes, Plot, Tangent, TitleWithVisual } from "@kit";

export const narration =
  "Đây là đồ thị hàm số f x bằng x mũ ba trừ ba x. Đặt một tiếp tuyến tại điểm này. Khi trượt sang phải, độ dốc giảm dần rồi bằng không ở đỉnh. Phóng to thật gần, đường cong gần như thẳng.";

// The tangent slides to the peak while its slope label counts down to 0; then the camera zooms into the peak.
export default function Scene() {
  return (
    <TitleWithVisual title="Độ dốc thay đổi dọc đường cong">
      <Axes x={[-3, 3]} y={[-4, 4]} width={1400} height={700} view={[{ at: "cue:phóng to", x: [-1.2, -0.8], y: [1.75, 2.25] }]}>
        <Plot fn="x^3 - 3x" at="cue:đồ thị" label="$f(x) = x^3 - 3x$" labelX={2.1} labelDir="r" />
        <Tangent
          fn="x^3 - 3x"
          at="cue:tiếp tuyến"
          x={[{ at: 0, value: -2.1 }, { at: "cue:trượt sang", value: -1, duration: 3 }]}
          slope
        />
      </Axes>
    </TitleWithVisual>
  );
}
