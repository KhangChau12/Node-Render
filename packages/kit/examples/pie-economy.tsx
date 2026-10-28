import { PieChart, TitleWithVisual } from "@kit";

export const narration =
  "Không khí khô gồm chủ yếu là nitơ, chiếm khoảng 78 phần trăm. Oxi chiếm 21 phần trăm. Phần còn lại, chưa tới một phần trăm, là argon và các khí khác.";

// Slices sweep in; `focus` pulls out the slice the narrator is talking about.
export default function Scene() {
  return (
    <TitleWithVisual title="Thành phần của không khí">
      <PieChart
        at="cue:không khí"
        center="Không khí khô"
        slices={[
          { label: "Nitơ $\\ce{N2}$", value: 78, color: "info" },
          { label: "Oxi $\\ce{O2}$", value: 21, color: "ok" },
          { label: "Argon và khí khác", value: 1, color: "warn" },
        ]}
        focus={[
          { at: "cue:chủ yếu", index: 0 },
          { at: "cue:oxi chiếm", index: 1 },
          { at: "cue:phần còn lại", index: 2 },
        ]}
      />
    </TitleWithVisual>
  );
}
