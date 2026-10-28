import { Axes, Formula, Plot, Riemann, Stack, Switch, TitleWithVisual } from "@kit";

export const narration =
  "Muốn tính diện tích dưới đường cong, ta chia nó thành bốn hình chữ nhật. Tổng diện tích còn thiếu một chút. Chia thành mười sáu hình, rồi sáu mươi tư hình, phần thiếu gần như biến mất. Giới hạn ấy chính là tích phân.";

// One Riemann sum whose n steps up with the narration: 4 → 16 → 64.
export default function Scene() {
  return (
    <TitleWithVisual title="Từ hình chữ nhật đến tích phân">
      <Stack gap={24}>
        <Axes x={[0, 4]} y={[0, 5]} width={1300} height={600}>
          <Plot fn="0.25x^2 + 1" at="cue:đường cong" />
          <Riemann
            fn="0.25x^2 + 1"
            from={0.5}
            to={3.5}
            at="cue:bốn hình"
            n={[{ at: 0, value: 4 }, { at: "cue:mười sáu", value: 16 }, { at: "cue:sáu mươi tư", value: 64 }]}
          />
        </Axes>
        <Switch at={["cue:bốn hình", "cue:giới hạn ấy"]} effect="flip">
          <Formula tex="\sum_{i} f(x_i)\,\Delta x" size={64} />
          <Formula tex="\int_{0.5}^{3.5} f(x)\,dx" size={64} color="accent" />
        </Switch>
      </Stack>
    </TitleWithVisual>
  );
}
