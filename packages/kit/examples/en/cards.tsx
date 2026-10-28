import { Cards, TitleWithVisual } from "@kit";

export const narration =
  "There are three ways to pick a pivot. Taking the last element is simple. A random choice avoids bad inputs. The median of three is the most practical choice.";

export default function Scene() {
  return (
    <TitleWithVisual title="How to pick the pivot?">
      <Cards
        at="cue:three ways"
        cards={[
          { title: "Last element", points: ["Simple", "Bad on sorted arrays"], tone: "warn" },
          { title: "Random", points: ["Avoids bad inputs", "Needs random numbers"], tone: "info" },
          { title: "Median of three", points: ["First, middle, last", "Reliable in practice"], tone: "ok" },
        ]}
        focus={[
          { index: 0, at: "cue:the last" },
          { index: 1, at: "cue:a random" },
          { index: 2, at: "cue:the median" },
        ]}
      />
    </TitleWithVisual>
  );
}
