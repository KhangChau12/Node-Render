import "katex/dist/katex.min.css";
import "./globals.css";
import type { Metadata } from "next";
import { Be_Vietnam_Pro, JetBrains_Mono } from "next/font/google";
import { I18nProvider } from "@/components/I18n";
import { getI18n } from "@/lib/i18n/server";

const ui = Be_Vietnam_Pro({ subsets: ["latin", "vietnamese"], weight: ["400", "500", "600", "700"], variable: "--f-ui" });
const mono = JetBrains_Mono({ subsets: ["latin", "vietnamese"], weight: ["400", "500", "600"], variable: "--f-mono" });

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: "Node Render", description: t("app.description") };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale } = await getI18n();
  return (
    <html lang={locale} className={`${ui.variable} ${mono.variable}`}>
      <body>
        <I18nProvider locale={locale}>{children}</I18nProvider>
      </body>
    </html>
  );
}
