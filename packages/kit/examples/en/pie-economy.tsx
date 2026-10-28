import { PieChart, TitleWithVisual } from "@kit";

export const narration =
  "Dry air is mostly nitrogen, about 78 percent. Oxygen makes up 21 percent. The rest, less than one percent, is argon and other gases.";

// Slices sweep in; `focus` pulls out the slice the narrator is talking about.
export default function Scene() {
  return (
    <TitleWithVisual title="What air is made of">
      <PieChart
        at="cue:dry air"
        center="Dry air"
        slices={[
          { label: "Nitrogen $\\ce{N2}$", value: 78, color: "info" },
          { label: "Oxygen $\\ce{O2}$", value: 21, color: "ok" },
          { label: "Argon and other gases", value: 1, color: "warn" },
        ]}
        focus={[
          { at: "cue:mostly nitrogen", index: 0 },
          { at: "cue:oxygen makes", index: 1 },
          { at: "cue:the rest", index: 2 },
        ]}
      />
    </TitleWithVisual>
  );
}
