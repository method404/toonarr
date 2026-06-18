import { AdminShell } from "@/app/_components/admin-shell";
import { getLocale } from "@/lib/locale";
import { getUpdateFeed } from "@/lib/update-check";

export default async function UpdateSettingsPage() {
  const locale = await getLocale();
  const feed = await getUpdateFeed(locale);

  return (
    <AdminShell
      locale={locale}
      activePath="/settings/update"
      title={locale === "ko" ? "업데이트" : "Updates"}
      hideHeader
    >
      <div className="settings-page">
        <section className="settings-panel">
          <header className="settings-panel-header">
            <h2>{locale === "ko" ? "릴리즈 노트" : "Release Notes"}</h2>
          </header>

          {feed.updateAvailable ? (
            <div className="update-available-banner">
              <span>{locale === "ko" ? "업데이트 가능" : "Update Available"}</span>
              <strong>v{feed.latestVersion}</strong>
            </div>
          ) : null}

          <div className="update-release-list">
            {feed.releases.map((release) => (
              <article key={`${release.version}:${release.dateLabel}`} className="update-release-item">
                <div className="update-release-header">
                  <span className="update-release-version">v{release.version}</span>
                  <span className={`update-release-badge ${release.status}`}>
                    {release.status === "available"
                      ? locale === "ko"
                        ? "새 버전"
                        : "Available"
                      : locale === "ko"
                        ? "현재"
                        : "Current"}
                  </span>
                  <span className="update-release-date">{release.dateLabel}</span>
                </div>
                <p className="update-release-title">{release.title}</p>
                <p className="settings-meta-note">{release.sourceLabel}</p>
                <ul className="update-release-points">
                  {release.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
