import { Circle, Label, Path, Stage, TitleWithVisual } from "@kit";

export const narration =
  "This is a plant cell. Around it is a rigid cell wall. In the middle sits the nucleus, which holds the genetic information. Chloroplasts are scattered around, and that is where photosynthesis happens.";

// A schematic built from shapes placed in coordinates: closed Paths with fill, a Circle, Labels.
export default function Scene() {
  return (
    <TitleWithVisual title="Inside a plant cell">
      <Stage x={[-8, 8]} y={[-4, 4]} width={1500} height={760}>
        <Path points={[[-5.3, -2.5], [5.3, -2.5], [5.6, 0], [5.3, 2.5], [-5.3, 2.5], [-5.6, 0]]} closed smooth={false} color="ok" fill="ok" fillOpacity={0.08} width={3} at="cue:plant cell" />
        <Path points={[[-6, -3], [6, -3], [6.4, 0], [6, 3], [-6, 3], [-6.4, 0]]} closed smooth={false} color="ok" width={10} at="cue:cell wall" label="cell wall" labelAt={0.42} labelDir="r" />
        <Circle center={[0, 0.2]} r={1.3} color="warn" fill="warn" at="cue:the nucleus" />
        <Label x={0} y={0.2} text="nucleus" at="cue:the nucleus+0.4" size={34} />
        <Path points={[[-4.4, 1.2], [-3.6, 1.6], [-2.9, 1.2], [-3.6, 0.8]]} closed color="ok" fill="ok" fillOpacity={0.5} at="cue:chloroplasts" duration={0.6} />
        <Path points={[[2.8, -1.2], [3.6, -0.8], [4.3, -1.2], [3.6, -1.6]]} closed color="ok" fill="ok" fillOpacity={0.5} at="cue:scattered" duration={0.6} />
        <Path points={[[2.6, 1.6], [3.4, 2.0], [4.1, 1.6], [3.4, 1.2]]} closed color="ok" fill="ok" fillOpacity={0.5} at="cue:scattered+0.3" duration={0.6} />
        <Label x={-3.6} y={2.0} text="chloroplast" at="cue:chloroplasts+0.4" color="ok" size={30} />
      </Stage>
    </TitleWithVisual>
  );
}
