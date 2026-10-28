import { Axes, Formula, Row, TitleWithVisual, Vector } from "@kit";

export const narration =
  "Mỗi ma trận là một cách biến đổi mặt phẳng. Hai vector cơ sở i mũ và j mũ cho biết mọi thứ đi đâu. Với phép trượt này, i mũ đứng yên còn j mũ nghiêng sang phải. Vector v đi theo, vì nó là tổ hợp của i mũ và j mũ.";

// The whole plane (grid, basis vectors, v) follows the matrix; the faint original grid stays as reference.
// Matrix columns wear the colors of î (ok) and ĵ (err), like the arrows.
export default function Scene() {
  return (
    <TitleWithVisual title="Ma trận là một phép biến đổi">
      <Row gap={56}>
        <Axes x={[-5, 5]} grid="plane" basis ticks={false} at="cue:mỗi ma trận" width={1080} height={720} matrix={[{ at: "cue:phép trượt", m: [[1, 1], [0, 1]] }]}>
          <Vector x={2} y={1} color="warn" label="$\vec v$" at="cue:vector v" />
        </Axes>
        <Formula tex="\begin{bmatrix} \ok{1} & \err{1} \\ \ok{0} & \err{1} \end{bmatrix}" at="cue:phép trượt" size={72} />
      </Row>
    </TitleWithVisual>
  );
}
