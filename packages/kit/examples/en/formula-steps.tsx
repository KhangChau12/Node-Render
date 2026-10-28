import { FormulaSteps, TitleWithVisual } from "@kit";

export const narration =
  "Try it with f of x equals x squared. We expand the numerator, cancel the h, then let h go to zero. The result is two x.";

// In JS strings LaTeX backslashes must be doubled; String.raw avoids that.
export default function Scene() {
  return (
    <TitleWithVisual title="Example: $f(x) = x^2$">
      <FormulaSteps
        keepPrevious
        size={64}
        steps={[
          { tex: String.raw`\frac{(x+h)^2 - x^2}{h}`, at: "cue:expand the" },
          { tex: String.raw`= \frac{2xh + h^2}{h} = 2x + h`, at: "cue:cancel the" },
          { tex: String.raw`\xrightarrow{h \to 0} 2x`, at: "cue:the result" },
        ]}
      />
    </TitleWithVisual>
  );
}
