import { Brace, FullVisual, MathMorph } from "@kit";

export const narration =
  "Solve two x plus three equals seven. Move the three to the right side, and it changes sign. Seven minus three is four. Divide both sides by two, and we get x equals two.";

// Pieces with the same TeX (or the same key) slide to their new place; "+3" becomes "-3" through its key.
export default function Scene() {
  return (
    <FullVisual>
      <Brace label="solution" at="cue:we get" color="ok" size={40}>
        <MathMorph
          size={110}
          steps={[
            { at: "cue:solve two", tokens: ["2x", "+3", "=", "7"] },
            { at: "cue:move the", tokens: ["2x", "=", "7", { tex: "-3", key: "+3", color: "accent" }] },
            { at: "cue:seven minus", tokens: ["2x", "=", "4"] },
            { at: "cue:divide both", tokens: [{ tex: "x", key: "2x" }, "=", { tex: "2", color: "ok" }] },
          ]}
        />
      </Brace>
    </FullVisual>
  );
}
