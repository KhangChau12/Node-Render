import { Diagram, TitleWithVisual } from "@kit";

export const narration =
  "The algorithm starts at node A. From A we reach B at cost two, and C at cost five. A signal spreads from A to B, then on to D. The path through B to D is the shortest.";

export default function Scene() {
  return (
    <TitleWithVisual title="The shortest path">
      <Diagram
        width={1400}
        height={640}
        nodes={[
          { id: "A", label: "A", x: 0.08, y: 0.5, shape: "circle", tone: "accent", at: "cue:node a" },
          { id: "B", label: "B", x: 0.4, y: 0.15, shape: "circle", at: "cue:reach b" },
          { id: "C", label: "C", x: 0.4, y: 0.85, shape: "circle", at: "cue:and c" },
          { id: "D", label: "D", x: 0.85, y: 0.5, shape: "circle", at: "cue:a signal" },
        ]}
        edges={[
          { from: "A", to: "B", label: "2", at: "cue:reach b" },
          { from: "A", to: "C", label: "5", at: "cue:and c" },
          { from: "B", to: "D", label: "3", at: "cue:a signal" },
          { from: "C", to: "D", label: "4", at: "cue:a signal" },
        ]}
        pulses={[
          { from: "A", to: "B", at: "cue:spreads from" },
          { from: "B", to: "D", at: "cue:on to" },
        ]}
        highlights={[
          { id: "B", at: "cue:to b", tone: "info" },
          { id: "D", at: "cue:the shortest", tone: "ok" },
        ]}
      />
    </TitleWithVisual>
  );
}
