import { Axes, Point, Region, Scatter, TitleWithVisual } from "@kit";

export const narration =
  "This is the average temperature in London, month by month. Winter is cold, around five degrees. It warms up slowly and peaks in July. Singapore, by contrast, stays hot all year round.";

// Two data series in one Axes: each Scatter draws itself as a line chart, one color per city.
// Region and Point add a beat for the winter and the peak.
export default function Scene() {
  return (
    <TitleWithVisual title="Two climates">
      <Axes x={[0.5, 12.5]} y={[0, 32]} width={1400} height={680} tickStep={[1, 5]} labels={["month", "°C"]}>
        <Scatter
          points={[[1, 5.2], [2, 5.3], [3, 7.6], [4, 10.0], [5, 13.4], [6, 16.4], [7, 18.7], [8, 18.4], [9, 15.8], [10, 12.3], [11, 8.3], [12, 5.7]]}
          connect
          at="cue:in london"
          over={3}
          color="info"
          label="London"
        />
        <Region x={[0.5, 2.5]} y={[0, 32]} color="info" label="winter" labelDir="c" at="cue:winter is" />
        <Point x={7} y={18.7} at="cue:peaks in" label="$18.7\,°C$" labelDir="u" color="info" />
        <Scatter
          points={[[1, 26.5], [2, 27.1], [3, 27.6], [4, 28.0], [5, 28.3], [6, 28.3], [7, 27.9], [8, 27.9], [9, 27.6], [10, 27.6], [11, 27.0], [12, 26.4]]}
          connect
          at="cue:singapore"
          over={2}
          color="accent"
          label="Singapore"
        />
      </Axes>
    </TitleWithVisual>
  );
}
