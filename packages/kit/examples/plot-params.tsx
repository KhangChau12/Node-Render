import { Axes, LiveTex, Plot, Slider, Stack, TitleWithVisual } from "@kit";

export const narration =
  "Xét hàm a nhân sin x. Khi a tăng, sóng cao dần lên. Khi a âm, sóng bị lật ngược. Giờ uốn nó thành một parabol.";

// One track drives the curve (params), the slider and the live formula at the same time.
const A = [
  { at: 0, value: 1 },
  { at: "cue:a tăng", value: 2.5, duration: 2 },
  { at: "cue:a âm", value: -1.5, duration: 1.6 },
];

export default function Scene() {
  return (
    <TitleWithVisual title="Một tham số, cả họ đường cong">
      <Stack gap={28}>
        <Axes x={[-6.5, 6.5]} y={[-3.2, 3.2]} width={1400} height={560}>
          <Plot fn="a*sin(x)" params={{ a: A }} at="cue:xét hàm" morph={[{ at: "cue:uốn nó", fn: "0.12x^2 - 2" }]} />
        </Axes>
        <Stack gap={12}>
          <Slider label="$a$" value={A} min={-3} max={3} at="cue:xét hàm" />
          <LiveTex tex="y = \info{ {a} }\sin x" values={{ a: A }} decimals={1} at="cue:xét hàm" size={52} />
        </Stack>
      </Stack>
    </TitleWithVisual>
  );
}
