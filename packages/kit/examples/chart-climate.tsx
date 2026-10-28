import { Axes, Point, Region, Scatter, TitleWithVisual } from "@kit";

export const narration =
  "Đây là nhiệt độ trung bình từng tháng ở Hà Nội. Mùa đông lạnh, khoảng 17 độ. Nhiệt độ tăng dần và đạt đỉnh vào tháng 6, tháng 7. Còn Thành phố Hồ Chí Minh thì nóng quanh năm, gần như không đổi.";

// Two data series in one Axes: each Scatter draws itself as a line chart, one color per city.
// Region and Point add a beat for the winter and the peak.
export default function Scene() {
  return (
    <TitleWithVisual title="Khí hậu hai miền">
      <Axes x={[0.5, 12.5]} y={[10, 32]} width={1400} height={680} tickStep={[1, 5]} labels={["tháng", "°C"]}>
        <Scatter
          points={[[1, 16.4], [2, 17.2], [3, 20.2], [4, 23.7], [5, 27.3], [6, 28.8], [7, 28.9], [8, 28.2], [9, 27.2], [10, 24.6], [11, 21.4], [12, 18.2]]}
          connect
          at="cue:ở hà nội"
          over={3}
          color="info"
          label="Hà Nội"
        />
        <Region x={[0.5, 2.5]} y={[10, 32]} color="info" label="mùa đông" labelDir="c" at="cue:mùa đông" />
        <Point x={7} y={28.9} at="cue:đạt đỉnh" label="$28{,}9\,°C$" labelDir="u" color="info" />
        <Scatter
          points={[[1, 25.8], [2, 26.7], [3, 27.9], [4, 28.9], [5, 28.3], [6, 27.5], [7, 27.1], [8, 27.1], [9, 26.8], [10, 26.7], [11, 26.4], [12, 25.7]]}
          connect
          at="cue:thành phố"
          over={2}
          color="accent"
          label="TP.HCM"
        />
      </Axes>
    </TitleWithVisual>
  );
}
