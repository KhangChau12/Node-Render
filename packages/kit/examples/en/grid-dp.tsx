import { GridViz, TitleWithVisual } from "@kit";

export const narration =
  "Count the paths from the top left corner to the bottom right, moving only right or down. The first row and the first column have one way each. Every other cell is the cell above plus the cell on the left. Fill the grid this way, and the last cell is 20.";

// DP table: `from` draws arrows from the cells a value depends on into the cell being filled.
export default function Scene() {
  return (
    <TitleWithVisual title="Dynamic programming: counting paths">
      <GridViz
        at="cue:count the"
        width={760}
        values={[
          [1, 1, 1, 1],
          [1, null, null, null],
          [1, null, null, null],
          [1, null, null, null],
        ]}
        reveal="cells"
        steps={[
          { at: "cue:the first row", done: [[0, 0], [0, 1], [0, 2], [0, 3], [1, 0], [2, 0], [3, 0]], note: "first row, first column: 1 way" },
          { at: "cue:every other", focus: [[1, 1]], from: [[0, 1], [1, 0]], set: [{ r: 1, c: 1, v: 2 }], note: "$1 + 1 = 2$" },
          { at: "cue:on the left", focus: [[1, 2]], from: [[0, 2], [1, 1]], set: [{ r: 1, c: 2, v: 3 }], note: "$1 + 2 = 3$" },
          { at: "cue:fill the", set: [{ r: 1, c: 3, v: 4 }, { r: 2, c: 1, v: 3 }, { r: 2, c: 2, v: 6 }, { r: 2, c: 3, v: 10 }, { r: 3, c: 1, v: 4 }, { r: 3, c: 2, v: 10 }], note: "" },
          { at: "cue:the last cell", focus: [[3, 3]], from: [[2, 3], [3, 2]], set: [{ r: 3, c: 3, v: 20 }], note: "$10 + 10 = 20$" },
        ]}
      />
    </TitleWithVisual>
  );
}
