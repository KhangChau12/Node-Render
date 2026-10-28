import { MindMap, TitleWithVisual } from "@kit";

export const narration =
  "Romeo and Juliet can be read from four sides. Its themes are love and fate. Its characters are two young people caught in a family feud. Its craft lies in Shakespeare's verse and dramatic irony. And its legacy reaches every love story since.";

// Branches arrive with their sentence; `focus` stays on the branch being discussed.
export default function Scene() {
  return (
    <TitleWithVisual title="Romeo and Juliet, four ways in">
      <MindMap
        center="Romeo and Juliet"
        at="cue:romeo and"
        branches={[
          { label: "Themes", items: ["Love", "Fate"], at: "cue:its themes", icon: "heart" },
          { label: "Characters", items: ["Two young lovers", "A family feud"], at: "cue:its characters", icon: "people" },
          { label: "Craft", items: ["Verse and sonnets", "Dramatic irony"], at: "cue:its craft", icon: "feather" },
          { label: "Legacy", items: ["Retold everywhere", "The tragic romance"], at: "cue:its legacy", icon: "book" },
        ]}
        focus={[
          { at: "cue:its themes", index: 0 },
          { at: "cue:its characters", index: 1 },
          { at: "cue:its craft", index: 2 },
          { at: "cue:its legacy", index: 3 },
        ]}
      />
    </TitleWithVisual>
  );
}
