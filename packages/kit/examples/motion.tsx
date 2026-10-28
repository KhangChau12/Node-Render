import { Arrow, Counter, FadeIn, Formula, Pulse, Row, Stack, Switch, TitleWithVisual } from "@kit";

export const narration =
  "Lấy n bằng một nghìn. Nếu thuật toán chạy n log n, ta cần khoảng mười nghìn phép so sánh. Nhưng nếu là n bình phương, con số vọt lên một triệu. Gấp một trăm lần!";

export default function Scene() {
  return (
    <TitleWithVisual title="Một nghìn phần tử, hai số phận">
      <Stack gap={56}>
        <Row gap={40}>
          <FadeIn at="cue:lấy n" effect="pop">
            <Formula tex="n = 1000" size={84} />
          </FadeIn>
          <Arrow at="cue:thuật toán chạy" length={200} flow />
          <Switch at={["cue:thuật toán chạy", "cue:n bình phương"]} effect="flip">
            <Formula tex="n\log n" size={84} color="ok" />
            <Formula tex="n^2" size={84} color="err" />
          </Switch>
          <Arrow at="cue:ta cần" length={200} />
          <Pulse at="cue:gấp một trăm" mode="ring" color="err" strength={1.4}>
            <Counter value={10000} at="cue:mười nghìn" steps={[{ at: "cue:vọt lên", value: 1000000 }]} duration={1.6} size={100} />
          </Pulse>
        </Row>
        <FadeIn at="cue:gấp một trăm" effect="blur">
          <Formula tex="\times\,100" size={72} color="accent" />
        </FadeIn>
      </Stack>
    </TitleWithVisual>
  );
}
