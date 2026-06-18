import { AdminShell } from "@/app/_components/admin-shell";
import { NaverSessionSettings } from "@/app/settings/_components/naver-session-settings";
import { getNaverCredentialSummary } from "@/lib/naver-credentials";
import { getLocale } from "@/lib/locale";
import { getNaverSessionSummary } from "@/lib/naver-session";

export default async function AccountSettingsPage() {
  const locale = await getLocale();
  const session = await getNaverSessionSummary();
  const credentials = await getNaverCredentialSummary();

  return (
    <AdminShell
      locale={locale}
      activePath="/settings/account"
      title={locale === "ko" ? "계정 정보" : "Account"}
      hideHeader
    >
      <NaverSessionSettings
        locale={locale}
        initialSession={session}
        initialCredentials={credentials}
      />
    </AdminShell>
  );
}
