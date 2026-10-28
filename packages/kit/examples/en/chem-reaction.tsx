import { Formula, Molecule, Stack, TitleWithVisual } from "@kit";

export const narration =
  "Two hydrogen molecules meet one oxygen molecule. The old bonds break apart. The atoms rearrange, and new bonds form. The result is two molecules of water.";

// Bonds break, atoms move to their new places, new bonds form: the equation happens on screen.
export default function Scene() {
  return (
    <TitleWithVisual title="Hydrogen burns into water">
      <Stack gap={24}>
        <Molecule
          at="cue:two hydrogen"
          scale={110}
          atoms={[
            { id: "H1", el: "H", x: -4, y: 1 },
            { id: "H2", el: "H", x: -3, y: 1 },
            { id: "H3", el: "H", x: -4, y: -1 },
            { id: "H4", el: "H", x: -3, y: -1 },
            { id: "O1", el: "O", x: 0.4, y: 0 },
            { id: "O2", el: "O", x: 1.6, y: 0 },
          ]}
          bonds={[{ a: "H1", b: "H2" }, { a: "H3", b: "H4" }, { a: "O1", b: "O2", order: 2 }]}
          steps={[
            { at: "cue:break apart", break: ["H1-H2", "H3-H4", "O1-O2"], note: "old bonds break" },
            {
              at: "cue:the atoms rearrange",
              move: { O1: [-1.5, 0], O2: [2.5, 0], H1: [-2.3, 0.6], H2: [-0.7, 0.6], H3: [1.7, 0.6], H4: [3.3, 0.6] },
              note: "",
            },
            { at: "cue:new bonds", form: [{ a: "O1", b: "H1" }, { a: "O1", b: "H2" }, { a: "O2", b: "H3" }, { a: "O2", b: "H4" }], highlight: ["O1", "O2"], note: "O–H bonds form" },
          ]}
        />
        <Formula tex="\ce{2H2 + O2 -> 2H2O}" at="cue:the result" reveal="write" size={64} />
      </Stack>
    </TitleWithVisual>
  );
}
