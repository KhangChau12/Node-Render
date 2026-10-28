import { Circle, Label, Path, Stage, TitleWithVisual } from "@kit";

export const narration =
  "Đây là một tế bào thực vật. Bao ngoài là thành tế bào cứng. Ở giữa là nhân, nơi chứa thông tin di truyền. Lục lạp nằm rải rác, nơi diễn ra quang hợp.";

// A schematic built from shapes placed in coordinates: closed Paths with fill, a Circle, Labels.
export default function Scene() {
  return (
    <TitleWithVisual title="Cấu tạo tế bào thực vật">
      <Stage x={[-8, 8]} y={[-4, 4]} width={1500} height={760}>
        <Path points={[[-5.3, -2.5], [5.3, -2.5], [5.6, 0], [5.3, 2.5], [-5.3, 2.5], [-5.6, 0]]} closed smooth={false} color="ok" fill="ok" fillOpacity={0.08} width={3} at="cue:tế bào thực vật" />
        <Path points={[[-6, -3], [6, -3], [6.4, 0], [6, 3], [-6, 3], [-6.4, 0]]} closed smooth={false} color="ok" width={10} at="cue:thành tế bào" label="thành tế bào" labelAt={0.42} labelDir="r" />
        <Circle center={[0, 0.2]} r={1.3} color="warn" fill="warn" at="cue:nhân" />
        <Label x={0} y={0.2} text="nhân" at="cue:nhân+0.4" size={34} />
        <Path points={[[-4.4, 1.2], [-3.6, 1.6], [-2.9, 1.2], [-3.6, 0.8]]} closed color="ok" fill="ok" fillOpacity={0.5} at="cue:lục lạp" duration={0.6} />
        <Path points={[[2.8, -1.2], [3.6, -0.8], [4.3, -1.2], [3.6, -1.6]]} closed color="ok" fill="ok" fillOpacity={0.5} at="cue:rải rác" duration={0.6} />
        <Path points={[[2.6, 1.6], [3.4, 2.0], [4.1, 1.6], [3.4, 1.2]]} closed color="ok" fill="ok" fillOpacity={0.5} at="cue:rải rác+0.3" duration={0.6} />
        <Label x={-3.6} y={2.0} text="lục lạp" at="cue:lục lạp+0.4" color="ok" size={30} />
      </Stage>
    </TitleWithVisual>
  );
}
