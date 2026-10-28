import { Arrow, Counter, FadeIn, Formula, Pulse, Row, Stack, Switch, TitleWithVisual } from "@kit";

export const narration =
  "Take n equals one thousand. If the algorithm runs in n log n, we need about ten thousand comparisons. But if it is n squared, the number shoots up to a million. A hundred times more!";

export default function Scene() {
  return (
    <TitleWithVisual title="A thousand elements, two fates">
      <Stack gap={56}>
        <Row gap={40}>
          <FadeIn at="cue:take n" effect="pop">
            <Formula tex="n = 1000" size={84} />
          </FadeIn>
          <Arrow at="cue:the algorithm" length={200} flow />
          <Switch at={["cue:the algorithm", "cue:n squared"]} effect="flip">
            <Formula tex="n\log n" size={84} color="ok" />
            <Formula tex="n^2" size={84} color="err" />
          </Switch>
          <Arrow at="cue:we need" length={200} />
          <Pulse at="cue:a hundred" mode="ring" color="err" strength={1.4}>
            <Counter value={10000} at="cue:ten thousand" steps={[{ at: "cue:shoots up", value: 1000000 }]} duration={1.6} size={100} />
          </Pulse>
        </Row>
        <FadeIn at="cue:a hundred" effect="blur">
          <Formula tex="\times\,100" size={72} color="accent" />
        </FadeIn>
      </Stack>
    </TitleWithVisual>
  );
}
