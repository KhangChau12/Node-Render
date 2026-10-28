import { Timeline, TitleWithVisual } from "@kit";

export const narration =
  "Năm 938, Ngô Quyền đánh tan quân Nam Hán trên sông Bạch Đằng. Năm 1288, Trần Hưng Đạo lại dùng cọc gỗ trên chính dòng sông ấy. Năm 1789, Quang Trung đại phá quân Thanh. Ba chiến thắng, cùng một tinh thần.";

// Dates as numbers + proportional spacing: the gaps between events are real.
export default function Scene() {
  return (
    <TitleWithVisual title="Ba chiến thắng lừng lẫy">
      <Timeline
        at="cue:năm 938"
        proportional
        events={[
          { date: "938", label: "Ngô Quyền, Bạch Đằng", at: "cue:năm 938", icon: "anchor" },
          { date: "1288", label: "Trần Hưng Đạo, Bạch Đằng", at: "cue:năm 1288", icon: "swords" },
          { date: "1789", label: "Quang Trung đại phá quân Thanh", at: "cue:năm 1789", icon: "flag" },
        ]}
        focus={[{ at: "cue:cọc gỗ", index: 1 }, { at: "cue:ba chiến thắng", index: null }]}
      />
    </TitleWithVisual>
  );
}
