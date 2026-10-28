import { Derivation, Stack, Surround, TitleWithVisual } from "@kit";

export const narration =
  "An object falls freely from a height of 45 metres. The distance fallen is one half g t squared. Plugging in, 45 equals 5 t squared. So t squared equals 9. The object hits the ground after 3 seconds.";

// Lines align on "&="; each line is written when the narration reaches it, with its reason on the right.
export default function Scene() {
  return (
    <TitleWithVisual title="How long until it lands?">
      <Stack gap={40}>
        <Derivation
          lines={[
            { tex: "h &= \\tfrac{1}{2} g t^2", at: "cue:distance fallen", note: "free fall" },
            { tex: "45 &= 5\\,t^2", at: "cue:plugging in", note: "$h = 45$, $g = 10$" },
            { tex: "t^2 &= 9", at: "cue:so t", note: "divide both sides by 5" },
            { tex: "t &= 3\\ \\text{s}", at: "cue:hits the", result: true },
          ]}
        />
        <Surround at="cue:3 seconds" shape="underline" color="ok">
          <div style={{ fontSize: 34 }}>It lands after 3 seconds</div>
        </Surround>
      </Stack>
    </TitleWithVisual>
  );
}
