import { Axes, Plot, Secant, TitleWithVisual } from "@kit";

export const narration =
  "Lấy hai điểm trên đường cong. Đường nối chúng là cát tuyến, độ dốc bằng delta y chia delta x. Giờ kéo điểm thứ hai lại gần. Khi khoảng cách tiến về không, cát tuyến trở thành tiếp tuyến.";

// x2 slides toward x1: the rise/run triangle shrinks and the live slope settles on the derivative.
export default function Scene() {
  return (
    <TitleWithVisual title="Từ cát tuyến đến tiếp tuyến">
      <Axes x={[-0.5, 4.5]} y={[-0.5, 5]} width={1300} height={700}>
        <Plot fn="0.3x^2 + 0.4" at={0} label="$f(x)$" />
        <Secant
          fn="0.3x^2 + 0.4"
          x1={1}
          x2={[{ at: 0, value: 3.6 }, { at: "cue:kéo điểm", value: 1.8, duration: 2 }, { at: "cue:tiến về không", value: 1.001, duration: 2.5 }]}
          at="cue:hai điểm"
          slope
        />
      </Axes>
    </TitleWithVisual>
  );
}
