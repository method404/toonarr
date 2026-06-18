import { AdminShell } from "@/app/_components/admin-shell";
import { SystemSettings } from "@/app/settings/_components/system-settings";
import { getAppSettings, summarizeAppSettings } from "@/lib/app-settings";
import { getLocale } from "@/lib/locale";

export default async function SystemSettingsPage() {
  const locale = await getLocale();
  const settings = await getAppSettings();

  return (
    <AdminShell
      locale={locale}
      activePath="/settings/system"
      title={locale === "ko" ? "시스템" : "System"}
      hideHeader
    >
      <SystemSettings
        locale={locale}
        initialSettings={summarizeAppSettings(settings)}
      />
    </AdminShell>
  );
}
