import { Cycle, TitleWithVisual } from "@kit";

export const narration =
  "Sunlight makes sea water evaporate. The vapour rises, cools down and condenses into clouds. Heavy clouds fall back as rain. Water flows down rivers to the sea, and the cycle starts again.";

// One stage per sentence; `active` follows the narration around the ring.
export default function Scene() {
  return (
    <TitleWithVisual title="The water cycle">
      <Cycle
        center="The water cycle"
        stages={[
          { label: "Evaporation", icon: "sun", at: "cue:evaporate", tone: "warn" },
          { label: "Condensation", icon: "cloud", at: "cue:condenses", tone: "info" },
          { label: "Rain", icon: "rain", at: "cue:as rain", tone: "info" },
          { label: "Runoff", icon: "waves", at: "cue:flows down", tone: "ok" },
        ]}
        active={[
          { at: "cue:evaporate", index: 0 },
          { at: "cue:condenses", index: 1 },
          { at: "cue:as rain", index: 2 },
          { at: "cue:flows down", index: 3 },
          { at: "cue:starts again", index: null },
        ]}
        size={780}
      />
    </TitleWithVisual>
  );
}
