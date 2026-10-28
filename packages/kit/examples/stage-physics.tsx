import { Group, Label, Region, Spring, Stage, TitleWithVisual, Vector } from "@kit";

export const narration =
  "Một vật gắn vào lò xo, đặt trên mặt bàn nhẵn. Kéo vật ra rồi thả. Lò xo kéo vật về vị trí cân bằng, vật vượt qua rồi bị đẩy ngược lại. Vật dao động qua lại mãi mãi.";

// x(t) = 2 sin(2.4 t), counted from "Kéo vật": the spring end, the block and the force share one expression.
const X = "2*sin(2.4*time)";

export default function Scene() {
  return (
    <TitleWithVisual title="Con lắc lò xo dao động">
      <Stage x={[-7, 7]} y={[-3, 3]} width={1500} height={640}>
        <Region x={[-6.6, 6.6]} y={[-1.6, -1.2]} color="muted" opacity={0.35} border={false} at="cue:mặt bàn" />
        <Region x={[-6.6, -6.2]} y={[-1.2, 1.6]} color="muted" opacity={0.5} border={false} at="cue:mặt bàn" />
        <Spring from={[-6.2, 0]} to={[`${X} - 0.7`, 0]} at="cue:kéo vật" coils={12} />
        <Group x={X} at="cue:kéo vật">
          <Region x={[-0.7, 0.7]} y={[-1.2, 0.6]} color="info" opacity={0.5} label="$m$" />
          <Vector x={"-0.8*sin(2.4*time)"} y={0} from={[0, 1.2]} color="err" label="$\vec F$" at="cue:lò xo kéo" />
        </Group>
        <Label x={0} y={2.5} text="vị trí cân bằng" at="cue:vị trí cân bằng" color="muted" size={30} />
      </Stage>
    </TitleWithVisual>
  );
}
