import { Graph, TitleWithVisual } from "@kit";

export const narration =
  "Hãy vẽ quãng đường theo thời gian. Lấy hai điểm, nối bằng một đường thẳng: đó là vận tốc trung bình. Giờ kéo hai điểm lại gần nhau hơn, và gần hơn nữa.";

// The second point slides toward the first while the narrator says "gần nhau hơn".
export default function Scene() {
  return (
    <TitleWithVisual title="Từ vận tốc trung bình đến tức thời">
      <Graph
        fn="0.3x^2 + 0.5x"
        domain={[0, 6]}
        axisLabels={["t", "s"]}
        draw="cue:quãng đường"
        secant={{ x1: 2, x2: 5, at: "cue:hai điểm", shrinkAt: "cue:gần nhau hơn", shrinkDuration: 3.5 }}
        showSlope
        slopeLabel="Vận tốc trung bình"
      />
    </TitleWithVisual>
  );
}
