/*
 * Language of the video content (not of the app UI): decides how numbers are
 * written on screen ("1,5" and "10 000" in Vietnamese, "1.5" and "10,000" in
 * English) and the few words the kit draws itself. Each scene sets it from its
 * own narration before rendering (see SceneFrame), so scene code never has to.
 */

export type ContentLanguage = "vi" | "en";

let current: ContentLanguage = "vi";

export function setContentLanguage(lang: ContentLanguage) {
  current = lang;
}

export const contentLanguage = (): ContentLanguage => current;

/** Vietnamese when the text carries Vietnamese diacritics, English otherwise. */
export function guessLanguage(text: string): ContentLanguage {
  const marks = (text.match(/[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệịỉĩọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/gi) ?? []).length;
  return marks >= Math.max(3, text.length / 200) ? "vi" : "en";
}

/** A number already formatted with "." as decimal point, in the content language (with a real minus sign). */
export function localizeDecimal(s: string, tex = false): string {
  const out = s.replace("-", "−");
  if (current !== "vi") return out;
  // In TeX a bare comma adds space after it; {,} keeps "1{,}5" tight.
  return out.replace(".", tex ? "{,}" : ",");
}

/** Integer part grouped by thousands: "10 000" (vi) or "10,000" (en). */
export function groupThousands(int: string): string {
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, current === "vi" ? " " : ",");
}
