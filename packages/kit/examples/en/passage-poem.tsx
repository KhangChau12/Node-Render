import { Passage, TitleWithVisual } from "@kit";

export const narration =
  "Read the opening of Sonnet eighteen. Shall I compare thee to a summer's day is a question the poet answers himself. More lovely and more temperate makes the beloved better than summer. Rough winds shows that even summer has flaws.";

// Each phrase is marked when the narration reaches it; its note appears in the right column.
export default function Scene() {
  return (
    <TitleWithVisual title="Shakespeare, Sonnet 18">
      <Passage
        at="cue:read the"
        text={"Shall I compare thee to a summer's day?\nThou art more lovely and more temperate:\nRough winds do shake the darling buds of May."}
        source="William Shakespeare, Sonnet 18"
        width={1000}
        size={46}
        marks={[
          { phrase: "Shall I compare thee to a summer's day?", at: "cue:a question", note: "Rhetorical question" },
          { phrase: "more lovely and more temperate", at: "cue:better than", mode: "underline", color: "info", note: "The beloved beats summer" },
          { phrase: "Rough winds", at: "cue:shows that", mode: "circle", color: "err", note: "Summer's flaws" },
        ]}
      />
    </TitleWithVisual>
  );
}
