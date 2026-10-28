import { Angle, Axes, Polygon, Segment, TitleWithVisual } from "@kit";

export const narration =
  "Lấy một tam giác vuông với hai cạnh góc vuông a và b. Cạnh huyền là c. Dựng hình vuông trên mỗi cạnh. Diện tích hai hình vuông nhỏ cộng lại đúng bằng hình vuông lớn.";

// Pure geometry: Axes without axes or grid, every shape placed by its vertices.
export default function Scene() {
  return (
    <TitleWithVisual title="Định lý Pythagore bằng hình">
      <Axes x={[-3, 6]} y={[-3.6, 5.4]} axes={false} grid="none" equal width={1000} height={720}>
        <Polygon points={[[0, 0], [3, 0], [3, -3], [0, -3]]} at="cue:dựng hình vuông" color="info" fill="info" label="$a^2$" />
        <Polygon points={[[0, 0], [0, 2], [-2, 2], [-2, 0]]} at="cue:dựng hình vuông+0.4" color="ok" fill="ok" label="$b^2$" />
        <Polygon points={[[3, 0], [0, 2], [2, 5], [5, 3]]} at="cue:hình vuông lớn" color="accent" fill="accent" label="$c^2$" />
        <Segment from={[0, 0]} to={[3, 0]} at="cue:tam giác vuông" label="$a$" labelDir="u" color="info" width={6} />
        <Segment from={[0, 0]} to={[0, 2]} at="cue:tam giác vuông+0.3" label="$b$" labelDir="r" color="ok" width={6} />
        <Segment from={[3, 0]} to={[0, 2]} at="cue:cạnh huyền" label="$c$" labelDir="ur" color="accent" width={6} />
        <Angle vertex={[0, 0]} from={[3, 0]} to={[0, 2]} at="cue:tam giác vuông+0.6" />
      </Axes>
    </TitleWithVisual>
  );
}
