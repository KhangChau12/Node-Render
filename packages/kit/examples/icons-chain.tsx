import { Arrow, Icon, Pulse, Row, TitleWithVisual } from "@kit";

export const narration =
  "Rừng bị chặt phá. Mưa lớn không còn gì giữ lại, đất bị xói mòn. Nước dồn xuống sông rất nhanh, gây lũ quét.";

// A cause → effect chain: icons arrive one per clause, the consequence pulses red.
export default function Scene() {
  return (
    <TitleWithVisual title="Mất rừng dẫn tới lũ quét">
      <Row gap={36}>
        <Icon name="forest" label="Chặt phá rừng" at="cue:rừng bị" color="ok" badge size={180} />
        <Arrow at="cue:mưa lớn" length={130} />
        <Icon name="rain" label="Đất xói mòn" at="cue:xói mòn" color="warn" badge size={180} effect="left" />
        <Arrow at="cue:nước dồn" length={130} flow />
        <Pulse at="cue:lũ quét+0.3" mode="shake" color="err">
          <Icon name="waves" label="Lũ quét" at="cue:lũ quét" color="err" badge size={180} />
        </Pulse>
      </Row>
    </TitleWithVisual>
  );
}
