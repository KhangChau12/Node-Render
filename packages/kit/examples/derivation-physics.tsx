import { Derivation, Stack, Surround, TitleWithVisual } from "@kit";

export const narration =
  "Một vật rơi tự do từ độ cao 45 mét. Quãng đường rơi bằng một phần hai g t bình phương. Thay số, ta có 45 bằng 5 t bình phương. Suy ra t bình phương bằng 9. Vậy vật chạm đất sau 3 giây.";

// Lines align on "&="; each line is written when the narration reaches it, with its reason on the right.
export default function Scene() {
  return (
    <TitleWithVisual title="Bao lâu thì chạm đất?">
      <Stack gap={40}>
        <Derivation
          lines={[
            { tex: "h &= \\tfrac{1}{2} g t^2", at: "cue:quãng đường rơi", note: "rơi tự do" },
            { tex: "45 &= 5\\,t^2", at: "cue:thay số", note: "$h = 45$, $g = 10$" },
            { tex: "t^2 &= 9", at: "cue:suy ra", note: "chia hai vế cho 5" },
            { tex: "t &= 3\\ \\text{s}", at: "cue:vậy vật", result: true },
          ]}
        />
        <Surround at="cue:3 giây" shape="underline" color="ok">
          <div style={{ fontSize: 34 }}>Chạm đất sau 3 giây</div>
        </Surround>
      </Stack>
    </TitleWithVisual>
  );
}
