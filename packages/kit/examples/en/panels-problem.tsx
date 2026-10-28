import { Axes, BraceBetween, Derivation, Panels, Plot, Point, Polygon, Stage, TitleWithVisual } from "@kit";

export const narration =
  "The problem: fence a rectangular garden with 20 metres of netting so that its area is as large as possible. Call the width x, so the length is 10 minus x. The area is x times 10 minus x. Its graph is a parabola, with its peak at x equals 5. So the garden is a square with sides of 5 metres.";

// Three views of one problem: the picture, the algebra, the graph. Panels appear and take focus in turn.
export default function Scene() {
  return (
    <TitleWithVisual title="Fencing the largest garden">
      <Panels
        columns={3}
        titles={["Picture", "Working", "Graph"]}
        at={["cue:the problem", "cue:call the", "cue:its graph"]}
        focus={[{ at: "cue:call the", index: 1 }, { at: "cue:its graph", index: 2 }, { at: "cue:so the garden", index: null }]}
      >
        <Stage x={[-1, 9]} y={[-1, 6]} width={420} height={320}>
          <Polygon points={[[0, 0], [7, 0], [7, 3], [0, 3]]} at="cue:rectangular garden" color="ok" fill="ok" label="$S$" />
          <BraceBetween from={[0, 0]} to={[7, 0]} label="$10 - x$" at="cue:the length" />
          <BraceBetween from={[0, 0]} to={[0, 3]} label="$x$" at="cue:call the" flip />
          <Polygon points={[[1.5, 0.5], [6.5, 0.5], [6.5, 5.5], [1.5, 5.5]]} at="cue:a square" color="accent" />
        </Stage>
        <Derivation
          size={40}
          lines={[
            { tex: "\\text{width} &= x", at: "cue:call the" },
            { tex: "\\text{length} &= 10 - x", at: "cue:the length" },
            { tex: "S &= x(10 - x)", at: "cue:the area" },
            { tex: "x &= 5", at: "cue:its peak", result: true },
          ]}
        />
        <Axes x={[0, 10]} y={[0, 28]} width={480} height={360} tickStep={[5, 10]}>
          <Plot fn="x*(10 - x)" at="cue:its graph" color="info" />
          <Point x={5} on="x*(10 - x)" at="cue:its peak" label="$(5,\ 25)$" guides />
        </Axes>
      </Panels>
    </TitleWithVisual>
  );
}
