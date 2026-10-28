import { Timeline, TitleWithVisual } from "@kit";

export const narration =
  "In 1903 the Wright brothers flew for twelve seconds. In 1927 Lindbergh crossed the Atlantic alone. In 1969 Apollo 11 landed on the Moon. Sixty six years, from the first flight to the Moon.";

// Dates as numbers + proportional spacing: the gaps between events are real.
export default function Scene() {
  return (
    <TitleWithVisual title="From the first flight to the Moon">
      <Timeline
        at="cue:in 1903"
        proportional
        events={[
          { date: "1903", label: "Wright brothers, first flight", at: "cue:in 1903", icon: "plane" },
          { date: "1927", label: "Lindbergh crosses the Atlantic", at: "cue:in 1927", icon: "compass" },
          { date: "1969", label: "Apollo 11 lands on the Moon", at: "cue:in 1969", icon: "rocket" },
        ]}
        focus={[{ at: "cue:crossed the", index: 1 }, { at: "cue:sixty six", index: null }]}
      />
    </TitleWithVisual>
  );
}
