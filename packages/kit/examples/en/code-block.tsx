import { CodeBlock, TitleWithVisual } from "@kit";

export const narration =
  "Here is a numerical derivative using a central difference. The key line is the return line, where we divide by two h.";

export default function Scene() {
  return (
    <TitleWithVisual title="A derivative in code" align="center">
      <CodeBlock
        title="derivative.py"
        at="cue:here is"
        highlight={[3]}
        highlightAt="cue:the return"
        code={`def derivative(f, x, h=1e-5):
    # central difference
    return (f(x + h) - f(x - h)) / (2 * h)

print(derivative(lambda x: x**2, 3))  # 6.0`}
      />
    </TitleWithVisual>
  );
}
