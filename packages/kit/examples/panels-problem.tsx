import { Axes, BraceBetween, Derivation, Panels, Plot, Point, Polygon, Stage, TitleWithVisual } from "@kit";

export const narration =
  "Bài toán: rào một mảnh vườn hình chữ nhật bằng 20 mét lưới, sao cho diện tích lớn nhất. Gọi chiều rộng là x, chiều dài là 10 trừ x. Diện tích là x nhân 10 trừ x. Đồ thị là một parabol, đỉnh tại x bằng 5. Vậy mảnh vườn là hình vuông cạnh 5 mét.";

// Three views of one problem: the picture, the algebra, the graph. Panels appear and take focus in turn.
export default function Scene() {
  return (
    <TitleWithVisual title="Rào vườn sao cho rộng nhất">
      <Panels
        columns={3}
        titles={["Hình", "Lời giải", "Đồ thị"]}
        at={["cue:bài toán", "cue:gọi chiều", "cue:đồ thị"]}
        focus={[{ at: "cue:gọi chiều", index: 1 }, { at: "cue:đồ thị", index: 2 }, { at: "cue:vậy mảnh", index: null }]}
      >
        <Stage x={[-1, 9]} y={[-1, 6]} width={420} height={320}>
          <Polygon points={[[0, 0], [7, 0], [7, 3], [0, 3]]} at="cue:hình chữ nhật" color="ok" fill="ok" label="$S$" />
          <BraceBetween from={[0, 0]} to={[7, 0]} label="$10 - x$" at="cue:chiều dài" />
          <BraceBetween from={[0, 0]} to={[0, 3]} label="$x$" at="cue:gọi chiều" flip />
          <Polygon points={[[1.5, 0.5], [6.5, 0.5], [6.5, 5.5], [1.5, 5.5]]} at="cue:hình vuông" color="accent" />
        </Stage>
        <Derivation
          size={40}
          lines={[
            { tex: "\\text{rộng} &= x", at: "cue:gọi chiều" },
            { tex: "\\text{dài} &= 10 - x", at: "cue:chiều dài" },
            { tex: "S &= x(10 - x)", at: "cue:diện tích là" },
            { tex: "x &= 5", at: "cue:đỉnh tại", result: true },
          ]}
        />
        <Axes x={[0, 10]} y={[0, 28]} width={480} height={360} tickStep={[5, 10]}>
          <Plot fn="x*(10 - x)" at="cue:đồ thị" color="info" />
          <Point x={5} on="x*(10 - x)" at="cue:đỉnh tại" label="$(5;\ 25)$" guides />
        </Axes>
      </Panels>
    </TitleWithVisual>
  );
}
