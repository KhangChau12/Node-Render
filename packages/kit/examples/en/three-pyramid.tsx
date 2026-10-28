import { Axes3D, Solid, TitleWithVisual } from "@kit";

export const narration =
  "Here is a pyramid S ABCD with a square base. The apex S sits right above the centre O of the base. The height SO is perpendicular to the base. Turn the figure around, and the side face SAB comes into view.";

// Solid finds hidden edges itself: they turn dashed, and switch as the camera orbits.
export default function Scene() {
  return (
    <TitleWithVisual title="A square pyramid">
      <Axes3D
        x={[-2, 2]}
        y={[-2, 2]}
        z={[0, 3.4]}
        equal
        axes={false}
        floor={false}
        width={1200}
        height={760}
        azimuth={[{ at: 0, value: -118 }, { at: "cue:turn the", value: -60, duration: 2.5 }]}
        elevation={16}
      >
        <Solid
          points={{ S: [0, 0, 3], A: [-1.5, -1.5, 0], B: [1.5, -1.5, 0], C: [1.5, 1.5, 0], D: [-1.5, 1.5, 0], O: [0, 0, 0] }}
          edges={["AB", "BC", "CD", "DA", "SA", "SB", "SC", "SD", { e: "AC", at: "cue:centre o" }, { e: "BD", at: "cue:centre o" }, { e: "SO", at: "cue:the height", color: "accent" }]}
          faces={[{ p: "SAB", at: "cue:side face", color: "info" }]}
          at="cue:a pyramid"
        />
      </Axes3D>
    </TitleWithVisual>
  );
}
