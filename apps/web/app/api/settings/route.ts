import { handle } from "@/lib/http";
import { isLocale } from "@/lib/i18n";
import { getSettings, saveSettings } from "@/lib/storage";

export const dynamic = "force-dynamic";

export function GET() {
  return handle(() => getSettings());
}

export async function POST(req: Request) {
  const b = (await req.json()) as { syllablesPerSecond?: number; visualReview?: boolean; locale?: string };
  return handle(() => {
    const sps = Number(b.syllablesPerSecond);
    return saveSettings({
      ...(Number.isFinite(sps) && sps >= 2 && sps <= 8 ? { syllablesPerSecond: sps } : {}),
      ...(typeof b.visualReview === "boolean" ? { visualReview: b.visualReview } : {}),
      ...(isLocale(b.locale) ? { locale: b.locale } : {}),
    });
  });
}
