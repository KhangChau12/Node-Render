import { Axes, Formula, Row, TitleWithVisual, Vector } from "@kit";

export const narration =
  "Every matrix is a way of transforming the plane. The two basis vectors i hat and j hat tell us where everything goes. With this shear, i hat stays put while j hat leans to the right. Vector v follows along, because it is a combination of i hat and j hat.";

// The whole plane (grid, basis vectors, v) follows the matrix; the faint original grid stays as reference.
export default function Scene() {
  return (
    <TitleWithVisual title="A matrix is a transformation">
      <Row gap={56}>
        <Axes x={[-5, 5]} grid="plane" basis ticks={false} at="cue:every matrix" width={1080} height={720} matrix={[{ at: "cue:this shear", m: [[1, 1], [0, 1]] }]}>
          <Vector x={2} y={1} color="warn" label="$\vec v$" at="cue:vector v" />
        </Axes>
        <Formula tex="\begin{bmatrix} \ok{1} & \err{1} \\ \ok{0} & \err{1} \end{bmatrix}" at="cue:this shear" size={72} />
      </Row>
    </TitleWithVisual>
  );
}
