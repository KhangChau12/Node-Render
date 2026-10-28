import { ArrayViz, Camera, TitleWithVisual } from "@kit";

export const narration =
  "Merge sort splits the array in half. Then it splits each half again. Take a close look at the left part: three and eight. Then we pull back to see every chunk.";

export default function Scene() {
  return (
    <TitleWithVisual title="Divide and conquer">
      <Camera
        keys={[
          { at: "cue:close look", zoom: 1.8, x: 0.14, y: 0.3 },
          { at: "cue:pull back", zoom: 1, x: 0.5, y: 0.5 },
        ]}
      >
        <ArrayViz
          values={[8, 3, 5, 1, 9, 2, 7, 4]}
          showIndices={false}
          steps={[
            { at: "cue:in half", split: [3], note: "2 halves" },
            { at: "cue:each half", split: [1, 3, 5], note: "4 chunks" },
            { at: "cue:three and", compare: [0, 1] },
            { at: "cue:pull back", note: "2 elements per chunk" },
          ]}
        />
      </Camera>
    </TitleWithVisual>
  );
}
