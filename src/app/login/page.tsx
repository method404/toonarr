import { redirect } from "next/navigation";
import Image from "next/image";
import { LocaleSwitcher } from "@/app/_components/locale-switcher";
import { LoginForm } from "@/app/login/_components/login-form";
import { getAppAuthContext, resolveLoginRedirectPath } from "@/lib/app-auth";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";

type LoginPageProps = {
  searchParams: Promise<{
    redirect?: string;
  }>;
};

export default async function LoginPage(props: LoginPageProps) {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const authContext = await getAppAuthContext();
  const searchParams = await props.searchParams;
  const redirectPath = resolveLoginRedirectPath(searchParams.redirect);

  if (!authContext.authConfigured || authContext.bypassed || authContext.authenticated) {
    redirect(redirectPath);
  }

  return (
    <div className="login-page">
      <div className="login-topbar">
        <div className="brand">
          <div className="brand-mark">
            <Image
              src="/branding/toonarr-logo-2.png"
              alt="Toonarr"
              width={27}
              height={26}
              className="brand-logo-image"
              priority
            />
          </div>
        </div>
        <LocaleSwitcher
          currentLocale={locale}
          label={dict.common.language}
          optionKo={dict.common.korean}
          optionEn={dict.common.english}
        />
      </div>

      <LoginForm locale={locale} redirectPath={redirectPath} />
    </div>
  );
}
