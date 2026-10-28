import { ArrayViz, Camera, TitleWithVisual } from "@kit";

export const narration =
  "Merge sort chia mảng làm đôi. Rồi chia tiếp mỗi nửa. Hãy nhìn kỹ nửa trái: ba và tám. Sau đó ta lùi lại để thấy toàn bộ các khúc.";

export default function Scene() {
  return (
    <TitleWithVisual title="Chia để trị">
      <Camera
        keys={[
          { at: "cue:nhìn kỹ", zoom: 1.8, x: 0.14, y: 0.3 },
          { at: "cue:lùi lại", zoom: 1, x: 0.5, y: 0.5 },
        ]}
      >
        <ArrayViz
          values={[8, 3, 5, 1, 9, 2, 7, 4]}
          showIndices={false}
          steps={[
            { at: "cue:làm đôi", split: [3], note: "2 nửa" },
            { at: "cue:chia tiếp", split: [1, 3, 5], note: "4 khúc" },
            { at: "cue:ba và", compare: [0, 1] },
            { at: "cue:lùi lại", note: "mỗi khúc 2 phần tử" },
          ]}
        />
      </Camera>
    </TitleWithVisual>
  );
}
