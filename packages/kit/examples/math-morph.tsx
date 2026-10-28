import { Brace, FullVisual, MathMorph } from "@kit";

export const narration =
  "Giải phương trình hai x cộng ba bằng bảy. Chuyển ba sang vế phải, nó đổi dấu. Bảy trừ ba bằng bốn. Chia hai vế cho hai, ta được x bằng hai.";

// Pieces with the same TeX (or the same key) slide to their new place; "+3" becomes "-3" through its key.
export default function Scene() {
  return (
    <FullVisual>
      <Brace label="nghiệm" at="cue:ta được" color="ok" size={40}>
        <MathMorph
          size={110}
          steps={[
            { at: "cue:giải phương trình", tokens: ["2x", "+3", "=", "7"] },
            { at: "cue:chuyển ba", tokens: ["2x", "=", "7", { tex: "-3", key: "+3", color: "accent" }] },
            { at: "cue:bảy trừ", tokens: ["2x", "=", "4"] },
            { at: "cue:chia hai", tokens: [{ tex: "x", key: "2x" }, "=", { tex: "2", color: "ok" }] },
          ]}
        />
      </Brace>
    </FullVisual>
  );
}
