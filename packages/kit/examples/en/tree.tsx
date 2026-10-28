import { TitleWithVisual, Tree } from "@kit";

export const narration =
  "The array is first split around pivot five. The left half is three, four, two. The right half is nine, seven, six, eight. Each half is split again, until only one element is left. The recursion goes down the left branch first, then the right branch.";

export default function Scene() {
  return (
    <TitleWithVisual title="The recursion tree of quick sort">
      <Tree
        height={600}
        nodes={[
          { id: "r", label: "[8,3,7,4,9,2,6,5]", parent: null, at: "cue:the array" },
          { id: "p", label: "5", parent: "r", tone: "accent", at: "cue:pivot five" },
          { id: "L", label: "[3,4,2]", parent: "r", at: "cue:the left half" },
          { id: "R", label: "[9,7,6,8]", parent: "r", at: "cue:the right half" },
          { id: "L1", label: "[2]", parent: "L", tone: "ok", at: "cue:split again" },
          { id: "L2", label: "[4,3]", parent: "L", at: "cue:split again+0.3" },
          { id: "R1", label: "[7,6]", parent: "R", at: "cue:split again+0.6" },
          { id: "R2", label: "[9]", parent: "R", tone: "ok", at: "cue:split again+0.9" },
          { id: "L3", label: "[3]", parent: "L2", tone: "ok", at: "cue:one element" },
          { id: "R3", label: "[6]", parent: "R1", tone: "ok", at: "cue:one element+0.3" },
        ]}
        visit={[
          { id: "r", at: "cue:the recursion" },
          { id: "L", at: "cue:left branch" },
          { id: "L2", at: "cue:left branch+0.6" },
          { id: "R", at: "cue:right branch", tone: "info" },
        ]}
      />
    </TitleWithVisual>
  );
}
