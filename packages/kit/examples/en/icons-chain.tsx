import { Arrow, Icon, Pulse, Row, TitleWithVisual } from "@kit";

export const narration =
  "Forests are cut down. Heavy rain has nothing to hold it, and the soil washes away. Water rushes into the rivers, causing flash floods.";

// A cause → effect chain: icons arrive one per clause, the consequence pulses red.
export default function Scene() {
  return (
    <TitleWithVisual title="Deforestation leads to flash floods">
      <Row gap={36}>
        <Icon name="forest" label="Forests cut down" at="cue:forests are" color="ok" badge size={180} />
        <Arrow at="cue:heavy rain" length={130} />
        <Icon name="rain" label="Soil washes away" at="cue:washes away" color="warn" badge size={180} effect="left" />
        <Arrow at="cue:water rushes" length={130} flow />
        <Pulse at="cue:flash floods+0.3" mode="shake" color="err">
          <Icon name="waves" label="Flash floods" at="cue:flash floods" color="err" badge size={180} />
        </Pulse>
      </Row>
    </TitleWithVisual>
  );
}
