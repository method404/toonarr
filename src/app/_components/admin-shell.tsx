import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { AppAuthControls } from "@/app/_components/app-auth-controls";
import { LocaleSwitcher } from "@/app/_components/locale-switcher";
import { TopSeriesSearch } from "@/app/_components/top-series-search";
import { getAppAuthContext } from "@/lib/app-auth";
import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/locale";
import { DONATE_URL } from "@/lib/project-links";

type AdminShellProps = {
  locale: Locale;
  activePath: string;
  title: string;
  description?: string;
  eyebrow?: string;
  hideHeader?: boolean;
  mainClassName?: string;
  actions?: ReactNode;
  children: ReactNode;
};

type NavChild = {
  href: string;
  label: string;
};

type NavItem = {
  href: string;
  label: string;
  children?: NavChild[];
};

export async function AdminShell({
  locale,
  activePath,
  title,
  description,
  eyebrow,
  hideHeader,
  mainClassName,
  actions,
  children,
}: AdminShellProps) {
  const authContext = await getAppAuthContext();

  if (authContext.authConfigured && !authContext.bypassed && !authContext.authenticated) {
    redirect(`/login?redirect=${encodeURIComponent(activePath)}`);
  }

  const dict = getDictionary(locale);
  const donateLabel = "Donate";
  const navItems: NavItem[] = [
    {
      href: "/series",
      label: dict.common.library,
      children: [
        {
          href: "/series/add",
          label: dict.common.addNew,
        },
        {
          href: "/series/weekday",
          label: dict.common.weekday,
        },
        {
          href: "/series/finished-free",
          label: dict.common.finishedFree,
        },
      ],
    },
    {
      href: "/activity",
      label: dict.common.activity,
    },
    {
      href: "/settings",
      label: dict.common.settings,
      children: [
        {
          href: "/settings/account",
          label: dict.common.naver,
        },
        {
          href: "/settings/system",
          label: dict.common.system,
        },
        {
          href: "/settings/update",
          label: dict.common.update,
        },
      ],
    },
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/series" className="brand brand-link" aria-label="Toonarr">
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
        </Link>

        <nav className="nav-list" aria-label="Primary">
          {navItems.map((item) => {
            const isDirectlyActive = activePath === item.href;
            const isExpanded = Boolean(
              item.children &&
                (isDirectlyActive || activePath.startsWith(`${item.href}/`)),
            );
            const children = item.children ?? [];

            return (
              <div
                key={item.href}
                className={`nav-group${isExpanded ? " expanded" : ""}`}
              >
                <Link
                  href={item.href}
                  className={`nav-link${isDirectlyActive ? " active" : ""}`}
                >
                  <span>{item.label}</span>
                </Link>
                {isExpanded ? (
                  <div className="nav-sublist">
                    {children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`nav-sublink${activePath === child.href ? " active" : ""}`}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>
      </aside>

      <main className={`page-shell${mainClassName ? ` ${mainClassName}` : ""}`}>
        <div className="top-nav">
          <TopSeriesSearch
            key={`${activePath}:${locale}`}
            locale={locale}
            placeholder={dict.common.search}
          />
          <div className="top-nav-actions">
            {authContext.authConfigured && !authContext.bypassed ? (
              <AppAuthControls locale={locale} />
            ) : null}
            <LocaleSwitcher
              currentLocale={locale}
              label={dict.common.language}
              optionKo={dict.common.korean}
              optionEn={dict.common.english}
              hideLabel
            />
            <Link
              href={DONATE_URL}
              target="_blank"
              rel="noreferrer"
              className="button top-nav-button top-nav-support-button"
            >
              <span className="top-nav-support-icon" aria-hidden="true">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 20.117c-.295 0-.59-.108-.821-.323l-6.57-6.11A4.685 4.685 0 0 1 3 10.246c0-2.63 2.135-4.766 4.767-4.766 1.571 0 3.05.765 3.983 2.021a4.748 4.748 0 0 1 3.983-2.02c2.632 0 4.767 2.135 4.767 4.765 0 1.315-.546 2.57-1.609 3.438l-6.07 6.11a1.2 1.2 0 0 1-.821.323Z"
                    fill="currentColor"
                  />
                </svg>
              </span>
              {donateLabel}
            </Link>
          </div>
        </div>

        {hideHeader ? null : (
          <header className="page-header">
            <div>
              {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
              <h1 className="page-title">{title}</h1>
              {description ? <p>{description}</p> : null}
            </div>
            {actions ? <div className="page-actions">{actions}</div> : null}
          </header>
        )}

        {children}
      </main>
    </div>
  );
}
