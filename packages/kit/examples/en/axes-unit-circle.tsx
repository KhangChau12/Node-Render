import { Angle, Axes, Circle, Point, Segment, TitleWithVisual, useTrack } from "@kit";

export const narration =
  "A point moves around the unit circle. The angle theta grows. Its shadow on the horizontal axis is cos theta, and its height is exactly sin theta.";

// useTrack gives one animated number; everything computed from it moves together.
export default function Scene() {
  const theta = useTrack([{ at: 0, value: 0.6 }, { at: "cue:theta grows", value: 2.2, duration: 3.5, ease: "linear" }]);
  const x = Math.cos(theta);
  const y = Math.sin(theta);
  return (
    <TitleWithVisual title="Sine and cosine on the unit circle">
      <Axes x={[-1.6, 1.6]} y={[-1.25, 1.25]} equal ticks={false} width={1200} height={720}>
        <Circle r={1} at="cue:unit circle" color="muted" />
        <Segment from={[0, 0]} to={[x, y]} at="cue:a point" color="text" duration={0.4} />
        <Angle vertex={[0, 0]} from={[1, 0]} to={[x, y]} at="cue:the angle" label="$\theta$" radius={64} />
        <Segment from={[0, 0]} to={[x, 0]} at="cue:its shadow" color="ok" width={7} label="$\cos\theta$" labelDir="d" duration={0.4} />
        <Segment from={[x, 0]} to={[x, y]} at="cue:its height" color="err" width={7} label="$\sin\theta$" labelDir="l" duration={0.4} />
        <Point x={x} y={y} at="cue:a point" />
      </Axes>
    </TitleWithVisual>
  );
}
