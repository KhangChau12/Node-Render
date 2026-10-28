import { Axes, Formula, Point, Row, TitleWithVisual } from "@kit";

export const narration =
  "Mỗi điểm của mặt phẳng là một số phức z. Hàm z bình phương đưa mỗi điểm tới một chỗ mới. Hãy xem cả lưới uốn cong theo nó. Góc được nhân đôi, khoảng cách được bình phương.";

// warp: the whole plane (grid and points) bends from z to z² (u = x² − y², v = 2xy).
export default function Scene() {
  return (
    <TitleWithVisual title="Hàm phức uốn cong mặt phẳng">
      <Row gap={56}>
        <Axes x={[-2.2, 2.2]} y={[-2.2, 2.2]} grid="plane" ticks={false} width={900} height={720} warp={[{ at: "cue:cả lưới", fx: "x^2 - y^2", fy: "2*x*y" }]} transition={2.6}>
          <Point x={1} y={0.8} at="cue:số phức" label="$z$" />
        </Axes>
        <Formula tex="z \mapsto z^2" at="cue:z bình phương" size={80} />
      </Row>
    </TitleWithVisual>
  );
}
