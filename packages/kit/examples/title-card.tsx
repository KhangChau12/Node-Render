import { FullVisual, TitleCard } from "@kit";

export const narration = "Chào các em. Hôm nay chúng ta tìm hiểu đạo hàm, bắt đầu từ một câu hỏi rất đời thường.";

export default function Scene() {
  return (
    <FullVisual align="left">
      <TitleCard kicker="Giải tích 11 · Bài 1" title="Đạo hàm, hiểu từ trực giác" subtitle="Vận tốc tức thời được tính như thế nào?" at="cue:đạo hàm" />
    </FullVisual>
  );
}
