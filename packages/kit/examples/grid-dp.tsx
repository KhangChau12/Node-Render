import { GridViz, TitleWithVisual } from "@kit";

export const narration =
  "Đếm số đường đi từ góc trên trái xuống góc dưới phải, chỉ được đi sang phải hoặc xuống. Hàng đầu và cột đầu chỉ có một cách. Mỗi ô còn lại bằng ô bên trên cộng ô bên trái. Cứ thế điền dần, ô cuối cùng là 20.";

// DP table: `from` draws arrows from the cells a value depends on into the cell being filled.
export default function Scene() {
  return (
    <TitleWithVisual title="Quy hoạch động: đếm đường đi">
      <GridViz
        at="cue:đếm số"
        width={760}
        values={[
          [1, 1, 1, 1],
          [1, null, null, null],
          [1, null, null, null],
          [1, null, null, null],
        ]}
        reveal="cells"
        steps={[
          { at: "cue:hàng đầu", done: [[0, 0], [0, 1], [0, 2], [0, 3], [1, 0], [2, 0], [3, 0]], note: "hàng đầu, cột đầu: 1 cách" },
          { at: "cue:mỗi ô", focus: [[1, 1]], from: [[0, 1], [1, 0]], set: [{ r: 1, c: 1, v: 2 }], note: "$1 + 1 = 2$" },
          { at: "cue:ô bên trái", focus: [[1, 2]], from: [[0, 2], [1, 1]], set: [{ r: 1, c: 2, v: 3 }], note: "$1 + 2 = 3$" },
          { at: "cue:điền dần", set: [{ r: 1, c: 3, v: 4 }, { r: 2, c: 1, v: 3 }, { r: 2, c: 2, v: 6 }, { r: 2, c: 3, v: 10 }, { r: 3, c: 1, v: 4 }, { r: 3, c: 2, v: 10 }], note: "" },
          { at: "cue:ô cuối cùng", focus: [[3, 3]], from: [[2, 3], [3, 2]], set: [{ r: 3, c: 3, v: 20 }], note: "$10 + 10 = 20$" },
        ]}
      />
    </TitleWithVisual>
  );
}
