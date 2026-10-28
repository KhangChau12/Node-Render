import { Arrow, Atom, Formula, Row, Stack, TitleWithVisual } from "@kit";

export const narration =
  "Sodium has one electron in its outer shell, while chlorine has seven. Sodium gives that electron to chlorine. Sodium becomes a positive ion, chlorine a negative ion. The two ions attract each other and form table salt.";

// The outer electron of Na flies out (lose) while Cl gains one (gain), timed to the same sentence.
export default function Scene() {
  return (
    <TitleWithVisual title="Ionic bonding in table salt">
      <Stack gap={30}>
        <Row gap={40}>
          <Atom symbol="Na" shells={[2, 8, 1]} at="cue:sodium has" size={440} highlight={[{ at: "cue:outer shell", shell: -1 }]} lose={{ at: "cue:gives that" }} label="$\ce{Na -> Na+}$" />
          <Arrow at="cue:gives that" length={140} label="$e^-$" color="accent" flow />
          <Atom symbol="Cl" shells={[2, 8, 7]} at="cue:while chlorine" size={440} highlight={[{ at: "cue:has seven", shell: -1 }]} gain={{ at: "cue:gives that+0.6" }} label="$\ce{Cl -> Cl-}$" />
        </Row>
        <Formula tex="\ce{Na+ + Cl- -> NaCl}" at="cue:attract each" reveal="write" size={64} />
      </Stack>
    </TitleWithVisual>
  );
}
