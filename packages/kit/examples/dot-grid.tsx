import { DotGrid, Formula, Stack, TitleWithVisual } from "@kit";

export const narration =
  "Hình dung một trăm người. Chỉ một người thật sự mắc bệnh. Nhưng xét nghiệm báo nhầm thêm chín người khỏe mạnh. Vậy trong mười người dương tính, chỉ một người bị bệnh.";

export default function Scene() {
  return (
    <TitleWithVisual title="Dương tính chưa chắc đã mắc bệnh">
      <Stack gap={40}>
        <DotGrid
          count={100}
          cols={20}
          at="cue:một trăm người"
          groups={[
            { count: 1, color: "err", at: "cue:thật sự", label: "Mắc bệnh" },
            { count: 9, color: "warn", at: "cue:báo nhầm", label: "Dương tính giả" },
          ]}
        />
        <Formula tex="P(\text{bệnh} \mid +) = \frac{\err{1}}{\err{1} + \warn{9}} = 10\%" at="cue:vậy trong" reveal="write" size={60} />
      </Stack>
    </TitleWithVisual>
  );
}
