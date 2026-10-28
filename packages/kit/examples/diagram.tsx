import { Diagram, TitleWithVisual } from "@kit";

export const narration =
  "Thuật toán bắt đầu từ đỉnh A. Từ A ta đi tới B với chi phí hai, và tới C với chi phí năm. Tín hiệu lan từ A sang B rồi sang D. Đường qua B rồi tới D là ngắn nhất.";

export default function Scene() {
  return (
    <TitleWithVisual title="Đường đi ngắn nhất">
      <Diagram
        width={1400}
        height={640}
        nodes={[
          { id: "A", label: "A", x: 0.08, y: 0.5, shape: "circle", tone: "accent", at: "cue:đỉnh a" },
          { id: "B", label: "B", x: 0.4, y: 0.15, shape: "circle", at: "cue:tới b" },
          { id: "C", label: "C", x: 0.4, y: 0.85, shape: "circle", at: "cue:tới c" },
          { id: "D", label: "D", x: 0.85, y: 0.5, shape: "circle", at: "cue:tín hiệu" },
        ]}
        edges={[
          { from: "A", to: "B", label: "2", at: "cue:tới b" },
          { from: "A", to: "C", label: "5", at: "cue:tới c" },
          { from: "B", to: "D", label: "3", at: "cue:tín hiệu" },
          { from: "C", to: "D", label: "4", at: "cue:tín hiệu" },
        ]}
        pulses={[
          { from: "A", to: "B", at: "cue:lan từ" },
          { from: "B", to: "D", at: "cue:sang d" },
        ]}
        highlights={[
          { id: "B", at: "cue:sang b", tone: "info" },
          { id: "D", at: "cue:ngắn nhất", tone: "ok" },
        ]}
      />
    </TitleWithVisual>
  );
}
