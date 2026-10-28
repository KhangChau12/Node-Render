import { Axes, Epicycles, TitleWithVisual } from "@kit";

export const narration =
  "Một vòng tròn quay đều vẽ ra một đường tròn. Thêm vòng thứ hai quay nhanh gấp ba, rồi vòng thứ ba, thứ tư. Càng nhiều vòng, hình vẽ ra càng gần một hình vuông.";

// Frequencies 1, −3, 5, −7… with radius ∝ 1/n² draw a square; `show` adds circles one at a time.
const terms = [1, -3, 5, -7, 9, -11, 13].map((freq) => ({ freq, r: 2.4 / (freq * freq) }));

export default function Scene() {
  return (
    <TitleWithVisual title="Chồng các vòng tròn">
      <Axes x={[-4.5, 4.5]} y={[-3, 3]} axes={false} equal width={1300} height={720}>
        <Epicycles
          terms={terms}
          at="cue:một vòng tròn"
          speed={0.2}
          trail={5}
          show={[
            { at: 0, value: 1 },
            { at: "cue:vòng thứ hai", value: 2, duration: 0 },
            { at: "cue:vòng thứ ba", value: 3, duration: 0 },
            { at: "cue:thứ tư", value: 4, duration: 0 },
            { at: "cue:càng nhiều", value: 7, duration: 0 },
          ]}
        />
      </Axes>
    </TitleWithVisual>
  );
}
