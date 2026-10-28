import { TitleWithVisual, Venn } from "@kit";

export const narration =
  "A class has 30 students. 18 like math, 15 like literature. 8 like both subjects. So the number who like at least one subject is 18 plus 15 minus 8, which is 25.";

// Shade the intersection first, then the union; counts sit in the zones they describe.
export default function Scene() {
  return (
    <TitleWithVisual title="Counting with a Venn diagram">
      <Venn
        at="cue:a class"
        universe="Class: 30 students"
        sets={[{ label: "Math" }, { label: "Literature" }]}
        steps={[
          { at: "cue:like both", shade: "A&B", color: "accent" },
          { at: "cue:at least", shade: "A|B", color: "ok" },
        ]}
        values={[
          { in: "A-B", text: "10", at: "cue:like math" },
          { in: "B-A", text: "7", at: "cue:like literature" },
          { in: "A&B", text: "8", at: "cue:like both" },
          { in: "!A&!B", text: "5", at: "cue:is 25" },
        ]}
      />
    </TitleWithVisual>
  );
}
