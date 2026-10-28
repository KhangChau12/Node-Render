import { DotGrid, Formula, Stack, TitleWithVisual } from "@kit";

export const narration =
  "Picture a hundred people. Only one of them is really sick. But the test also flags nine healthy people by mistake. So among ten positive results, only one person is sick.";

export default function Scene() {
  return (
    <TitleWithVisual title="Positive does not mean sick">
      <Stack gap={40}>
        <DotGrid
          count={100}
          cols={20}
          at="cue:a hundred people"
          groups={[
            { count: 1, color: "err", at: "cue:really sick", label: "Sick" },
            { count: 9, color: "warn", at: "cue:by mistake", label: "False positive" },
          ]}
        />
        <Formula tex="P(\text{sick} \mid +) = \frac{\err{1}}{\err{1} + \warn{9}} = 10\%" at="cue:so among" reveal="write" size={60} />
      </Stack>
    </TitleWithVisual>
  );
}
