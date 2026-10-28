import { Axes, Epicycles, TitleWithVisual } from "@kit";

export const narration =
  "One circle turning at a steady pace draws a circle. Add a second circle spinning three times faster, then a third circle, a fourth. The more circles, the closer the drawing gets to a square.";

// Frequencies 1, −3, 5, −7… with radius ∝ 1/n² draw a square; `show` adds circles one at a time.
const terms = [1, -3, 5, -7, 9, -11, 13].map((freq) => ({ freq, r: 2.4 / (freq * freq) }));

export default function Scene() {
  return (
    <TitleWithVisual title="Circles on circles">
      <Axes x={[-4.5, 4.5]} y={[-3, 3]} axes={false} equal width={1300} height={720}>
        <Epicycles
          terms={terms}
          at="cue:one circle"
          speed={0.2}
          trail={5}
          show={[
            { at: 0, value: 1 },
            { at: "cue:second circle", value: 2, duration: 0 },
            { at: "cue:third circle", value: 3, duration: 0 },
            { at: "cue:a fourth", value: 4, duration: 0 },
            { at: "cue:the more", value: 7, duration: 0 },
          ]}
        />
      </Axes>
    </TitleWithVisual>
  );
}
