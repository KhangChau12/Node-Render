import { AppSidebar } from "@/components/AppSidebar";
import { KitLoader } from "@/components/KitLoader";
import { kitDocsInfo, kitItems } from "@/lib/kitInfo";

export const dynamic = "force-dynamic";

export default function KitPage() {
  return (
    <div className="app">
      <AppSidebar active="kit" />
      <KitLoader items={kitItems()} docs={kitDocsInfo()} />
    </div>
  );
}
