import { Cycle, TitleWithVisual } from "@kit";

export const narration =
  "Nắng làm nước biển bốc hơi. Hơi nước bay lên cao, gặp lạnh thì ngưng tụ thành mây. Mây nặng hạt rơi xuống thành mưa. Nước chảy theo sông trở về biển, và vòng tuần hoàn lại bắt đầu.";

// One stage per sentence; `active` follows the narration around the ring.
export default function Scene() {
  return (
    <TitleWithVisual title="Vòng tuần hoàn của nước">
      <Cycle
        center="Vòng tuần hoàn nước"
        stages={[
          { label: "Bốc hơi", icon: "sun", at: "cue:bốc hơi", tone: "warn" },
          { label: "Ngưng tụ", icon: "cloud", at: "cue:ngưng tụ", tone: "info" },
          { label: "Mưa", icon: "rain", at: "cue:thành mưa", tone: "info" },
          { label: "Dòng chảy", icon: "waves", at: "cue:chảy theo sông", tone: "ok" },
        ]}
        active={[
          { at: "cue:bốc hơi", index: 0 },
          { at: "cue:ngưng tụ", index: 1 },
          { at: "cue:thành mưa", index: 2 },
          { at: "cue:chảy theo sông", index: 3 },
          { at: "cue:lại bắt đầu", index: null },
        ]}
        size={780}
      />
    </TitleWithVisual>
  );
}
