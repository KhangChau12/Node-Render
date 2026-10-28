import { Arrow, Atom, Formula, Row, Stack, TitleWithVisual } from "@kit";

export const narration =
  "Natri có một electron ở lớp ngoài cùng, còn clo có bảy. Natri nhường electron đó cho clo. Natri thành ion dương, clo thành ion âm. Hai ion hút nhau tạo thành muối ăn.";

// The outer electron of Na flies out (lose) while Cl gains one (gain), timed to the same sentence.
export default function Scene() {
  return (
    <TitleWithVisual title="Liên kết ion trong muối ăn">
      <Stack gap={30}>
        <Row gap={40}>
          <Atom symbol="Na" shells={[2, 8, 1]} at="cue:natri có" size={440} highlight={[{ at: "cue:lớp ngoài cùng", shell: -1 }]} lose={{ at: "cue:nhường electron" }} label="$\ce{Na -> Na+}$" />
          <Arrow at="cue:nhường electron" length={140} label="$e^-$" color="accent" flow />
          <Atom symbol="Cl" shells={[2, 8, 7]} at="cue:còn clo" size={440} highlight={[{ at: "cue:có bảy", shell: -1 }]} gain={{ at: "cue:nhường electron+0.6" }} label="$\ce{Cl -> Cl-}$" />
        </Row>
        <Formula tex="\ce{Na+ + Cl- -> NaCl}" at="cue:hút nhau" reveal="write" size={64} />
      </Stack>
    </TitleWithVisual>
  );
}
