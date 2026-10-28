import { CodeBlock, TitleWithVisual } from "@kit";

export const narration =
  "Đây là đạo hàm số tính bằng sai phân trung tâm. Dòng quan trọng nhất là dòng trả về, nơi ta chia cho hai h.";

export default function Scene() {
  return (
    <TitleWithVisual title="Tính đạo hàm bằng code" align="center">
      <CodeBlock
        title="derivative.py"
        at="cue:đây là"
        highlight={[3]}
        highlightAt="cue:dòng trả về"
        code={`def derivative(f, x, h=1e-5):
    # central difference
    return (f(x + h) - f(x - h)) / (2 * h)

print(derivative(lambda x: x**2, 3))  # 6.0`}
      />
    </TitleWithVisual>
  );
}
