import { Axes3D, Solid, TitleWithVisual } from "@kit";

export const narration =
  "Cho hình chóp S ABCD có đáy là hình vuông. Đỉnh S nằm ngay trên tâm O của đáy. Đường cao SO vuông góc với mặt đáy. Xoay hình lại, ta thấy rõ mặt bên SAB.";

// Solid finds hidden edges itself: they turn dashed, and switch as the camera orbits.
export default function Scene() {
  return (
    <TitleWithVisual title="Hình chóp tứ giác đều">
      <Axes3D
        x={[-2, 2]}
        y={[-2, 2]}
        z={[0, 3.4]}
        equal
        axes={false}
        floor={false}
        width={1200}
        height={760}
        azimuth={[{ at: 0, value: -118 }, { at: "cue:xoay hình", value: -60, duration: 2.5 }]}
        elevation={16}
      >
        <Solid
          points={{ S: [0, 0, 3], A: [-1.5, -1.5, 0], B: [1.5, -1.5, 0], C: [1.5, 1.5, 0], D: [-1.5, 1.5, 0], O: [0, 0, 0] }}
          edges={["AB", "BC", "CD", "DA", "SA", "SB", "SC", "SD", { e: "AC", at: "cue:tâm o" }, { e: "BD", at: "cue:tâm o" }, { e: "SO", at: "cue:đường cao", color: "accent" }]}
          faces={[{ p: "SAB", at: "cue:mặt bên", color: "info" }]}
          at="cue:hình chóp"
        />
      </Axes3D>
    </TitleWithVisual>
  );
}
