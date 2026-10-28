import { Callout, FullVisual } from "@kit";

export const narration = "Lưu ý: hàm số liên tục tại một điểm chưa chắc đã có đạo hàm tại điểm đó.";

export default function Scene() {
  return (
    <FullVisual>
      <Callout tone="warn" title="Lỗi hay gặp" text="Liên tục tại $x_0$ chưa chắc có đạo hàm tại $x_0$. Ví dụ: $y = |x|$ tại $x = 0$." at="cue:lưu ý" width={1300} />
    </FullVisual>
  );
}
