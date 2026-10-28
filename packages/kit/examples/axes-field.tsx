import { Axes, Formula, Stack, TitleWithVisual, VectorField } from "@kit";

export const narration =
  "Mỗi điểm trong mặt phẳng có một mũi tên chỉ hướng chuyển động. Thả các hạt vào, chúng trôi theo dòng và xoáy dần vào tâm.";

export default function Scene() {
  return (
    <TitleWithVisual title="Trường vector và dòng chảy">
      <Stack gap={20}>
        <Formula tex="\dot x = -y - 0.2x, \quad \dot y = x - 0.2y" at="cue:mỗi điểm" size={52} color="muted" />
        <Axes x={[-4, 4]} grid="none" ticks={false} width={1300} height={640}>
          <VectorField fx="-y - 0.2x" fy="x - 0.2y" at="cue:mũi tên" particles="cue:thả các hạt" />
        </Axes>
      </Stack>
    </TitleWithVisual>
  );
}
