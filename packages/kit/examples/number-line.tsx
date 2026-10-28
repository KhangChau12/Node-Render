import { NumberLine, TitleWithVisual } from "@kit";

export const narration =
  "Bắt đầu tại âm hai. Cộng thêm năm, ta nhảy năm bước sang phải và dừng ở ba. Tập các số lớn hơn ba là một tia mở về bên phải.";

// An interval whose `to` lies past the range is drawn as a ray (no end dot).
export default function Scene() {
  return (
    <TitleWithVisual title="Cộng là nhảy sang phải">
      <NumberLine
        range={[-5, 8]}
        step={1}
        points={[{ x: [{ at: 0, value: -2 }, { at: "cue:nhảy năm", value: 3, duration: 0.8 }], label: "$x$", at: "cue:bắt đầu" }]}
        jumps={[{ from: -2, to: 3, at: "cue:nhảy năm", label: "$+5$" }]}
        intervals={[{ from: 3, to: 99, at: "cue:tập các", closed: [false, false], label: "$x > 3$" }]}
      />
    </TitleWithVisual>
  );
}
