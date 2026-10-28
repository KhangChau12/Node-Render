import { Axes3D, Curve3D, Point3D, Surface, TitleWithVisual } from "@kit";

export const narration =
  "Đồ thị của hàm hai biến là một mặt cong. Với x bình phương trừ y bình phương, ta được hình yên ngựa. Gốc toạ độ là điểm yên ngựa: đi theo trục x thì lên, theo trục y thì xuống.";

// The camera spins slowly so the viewer reads depth; the surface rises out of the floor.
export default function Scene() {
  return (
    <TitleWithVisual title="Mặt yên ngựa">
      <Axes3D x={[-2, 2]} y={[-2, 2]} z={[-3, 3]} spin={6} width={1300} height={760}>
        <Surface fn="0.7*(x^2 - y^2)" at="cue:mặt cong" />
        <Curve3D x="t" y="0" z="0.7*t^2" t={[-2, 2]} at="cue:theo trục x" color="ok" drawDuration={1.2} />
        <Curve3D x="0" y="t" z="-0.7*t^2" t={[-2, 2]} at="cue:theo trục y" color="err" drawDuration={1.2} />
        <Point3D x={0} y={0} z={0} at="cue:gốc toạ độ" label="điểm yên ngựa" />
      </Axes3D>
    </TitleWithVisual>
  );
}
