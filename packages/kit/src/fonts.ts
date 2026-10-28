import { loadFont as loadBeVietnamPro } from "@remotion/google-fonts/BeVietnamPro";
import { loadFont as loadPlexMono } from "@remotion/google-fonts/IBMPlexMono";
import { loadFont as loadLiterata } from "@remotion/google-fonts/Literata";
import { loadFont as loadSourceSerif } from "@remotion/google-fonts/SourceSerif4";

let loaded = false;

/** Load the kit's fonts once (browser only; no-op during SSR). */
export function ensureFonts() {
  if (loaded || typeof document === "undefined") return;
  loaded = true;
  loadBeVietnamPro("normal", { weights: ["400", "600", "700"], subsets: ["latin", "vietnamese"] });
  loadPlexMono("normal", { weights: ["400", "500"], subsets: ["latin", "vietnamese"] });
  loadSourceSerif("italic", { weights: ["400"], subsets: ["latin", "vietnamese"] });
  loadSourceSerif("normal", { weights: ["400", "600"], subsets: ["latin", "vietnamese"] });
  // Source Serif 4 has no Vietnamese glyphs on Google Fonts: Literata sets serif prose (poems, quotes).
  loadLiterata("normal", { weights: ["400", "600"], subsets: ["latin", "vietnamese"] });
  loadLiterata("italic", { weights: ["400"], subsets: ["latin", "vietnamese"] });
}
