import { Formula, Highlight, FadeIn, TitleWithVisual, fonts, sizes, color } from "@kit";

export const narration = "As the gap h shrinks to zero, that slope gets a name: the derivative.";

export default function Scene() {
  return (
    <TitleWithVisual title="Definition of the derivative">
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 48 }}>
        <Formula tex="f'(x) = \lim_{h \to 0} \frac{f(x+h) - f(x)}{h}" size={88} at="cue:the gap" />
        <FadeIn at="cue:the derivative">
          <div style={{ fontSize: sizes.body, color: color("muted"), fontFamily: fonts.sans }}>
            This limit is called <Highlight at="cue:the derivative">the derivative of f at x</Highlight>
          </div>
        </FadeIn>
      </div>
    </TitleWithVisual>
  );
}
