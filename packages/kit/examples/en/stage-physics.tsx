import { Group, Label, Region, Spring, Stage, TitleWithVisual, Vector } from "@kit";

export const narration =
  "A block is attached to a spring on a smooth table. Pull the block and let go. The spring pulls it back toward equilibrium, it overshoots, then gets pushed back. The block keeps oscillating back and forth.";

// x(t) = 2 sin(2.4 t): the spring end, the block and the force share one expression, so they stay in phase.
const X = "2*sin(2.4*time)";

export default function Scene() {
  return (
    <TitleWithVisual title="A spring oscillator">
      <Stage x={[-7, 7]} y={[-3, 3]} width={1500} height={640}>
        <Region x={[-6.6, 6.6]} y={[-1.6, -1.2]} color="muted" opacity={0.35} border={false} at="cue:smooth table" />
        <Region x={[-6.6, -6.2]} y={[-1.2, 1.6]} color="muted" opacity={0.5} border={false} at="cue:smooth table" />
        <Spring from={[-6.2, 0]} to={[`${X} - 0.7`, 0]} at="cue:pull the" coils={12} />
        <Group x={X} at="cue:pull the">
          <Region x={[-0.7, 0.7]} y={[-1.2, 0.6]} color="info" opacity={0.5} label="$m$" />
          <Vector x={"-0.8*sin(2.4*time)"} y={0} from={[0, 1.2]} color="err" label="$\vec F$" at="cue:pulls it" />
        </Group>
        <Label x={0} y={2.5} text="equilibrium" at="cue:toward equilibrium" color="muted" size={30} />
      </Stage>
    </TitleWithVisual>
  );
}
