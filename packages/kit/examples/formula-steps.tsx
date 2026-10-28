import { FormulaSteps, TitleWithVisual } from "@kit";

export const narration =
  "Thử với f của x bằng x bình phương. Ta khai triển tử số, rút gọn cho h, rồi cho h tiến về không. Kết quả là hai x.";

// In JS strings LaTeX backslashes must be doubled; String.raw avoids that.
export default function Scene() {
  return (
    <TitleWithVisual title="Ví dụ: $f(x) = x^2$">
      <FormulaSteps
        keepPrevious
        size={64}
        steps={[
          { tex: String.raw`\frac{(x+h)^2 - x^2}{h}`, at: "cue:khai triển" },
          { tex: String.raw`= \frac{2xh + h^2}{h} = 2x + h`, at: "cue:rút gọn" },
          { tex: String.raw`\xrightarrow{h \to 0} 2x`, at: "cue:kết quả" },
        ]}
      />
    </TitleWithVisual>
  );
}
