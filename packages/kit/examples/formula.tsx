import { Formula, Highlight, FadeIn, TitleWithVisual, fonts, sizes, color } from "@kit";

export const narration = "Khi khoảng cách h tiến về không, độ dốc ấy có một cái tên: đạo hàm.";

export default function Scene() {
  return (
    <TitleWithVisual title="Định nghĩa đạo hàm">
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 48 }}>
        <Formula tex="f'(x) = \lim_{h \to 0} \frac{f(x+h) - f(x)}{h}" size={88} at="cue:khoảng cách" />
        <FadeIn at="cue:đạo hàm">
          <div style={{ fontSize: sizes.body, color: color("muted"), fontFamily: fonts.sans }}>
            Giới hạn này gọi là <Highlight at="cue:đạo hàm">đạo hàm của f tại x</Highlight>
          </div>
        </FadeIn>
      </div>
    </TitleWithVisual>
  );
}
