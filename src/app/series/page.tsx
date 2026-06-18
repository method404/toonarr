import Image from "next/image";
import Link from "next/link";
import { AdminShell } from "@/app/_components/admin-shell";
import { AdultBadge } from "@/app/_components/adult-badge";
import { FinishedBadge } from "@/app/_components/finished-badge";
import { SeriesCardManageMenu } from "@/app/series/_components/series-card-manage-menu";
import { SeriesLibraryActions } from "@/app/series/_components/series-library-actions";
import { getStoredSeriesSummaries } from "@/lib/library-store";
import { getLocale } from "@/lib/locale";

type SeriesSortKey = "title" | "updated" | "added";
type SeriesStatusFilter = "all" | "continuing" | "ended" | "missing" | "downloading";

type SeriesPageProps = {
  searchParams: Promise<{
    sort?: string;
    status?: string;
  }>;
};

function getSeriesCardState(entry: Awaited<ReturnType<typeof getStoredSeriesSummaries>>[number]) {
  if (entry.hasActiveDownload) {
    return "downloading";
  }

  const allAvailableDownloaded =
    entry.availableEpisodes > 0 && entry.downloadedEpisodes >= entry.availableEpisodes;

  if (allAvailableDownloaded) {
    return entry.isFinished ? "ended-complete" : "continuing-complete";
  }

  return entry.monitored ? "missing-monitored" : "missing-unmonitored";
}

function getSeriesCardProgress(entry: Awaited<ReturnType<typeof getStoredSeriesSummaries>>[number]) {
  if (entry.totalEpisodes <= 0) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(100, (entry.downloadedEpisodes / entry.totalEpisodes) * 100),
  );
}

function normalizeSort(value: string | undefined): SeriesSortKey {
  if (value === "title" || value === "added" || value === "updated") {
    return value;
  }

  return "updated";
}

function normalizeStatus(value: string | undefined): SeriesStatusFilter {
  if (
    value === "all" ||
    value === "continuing" ||
    value === "ended" ||
    value === "missing" ||
    value === "downloading"
  ) {
    return value;
  }

  return "all";
}

function buildSeriesHref(sort: SeriesSortKey, status: SeriesStatusFilter) {
  const params = new URLSearchParams();

  if (sort !== "updated") {
    params.set("sort", sort);
  }

  if (status !== "all") {
    params.set("status", status);
  }

  const query = params.toString();
  return query ? `/series?${query}` : "/series";
}

export default async function SeriesPage(props: SeriesPageProps) {
  const locale = await getLocale();
  const searchParams = await props.searchParams;
  const sort = normalizeSort(searchParams.sort);
  const status = normalizeStatus(searchParams.status);
  const series = await getStoredSeriesSummaries();

  const filteredSeries = series.filter((entry) => {
    const cardState = getSeriesCardState(entry);

    switch (status) {
      case "continuing":
        return !entry.isFinished;
      case "ended":
        return entry.isFinished;
      case "missing":
        return (
          cardState === "missing-monitored" || cardState === "missing-unmonitored"
        );
      case "downloading":
        return cardState === "downloading";
      default:
        return true;
    }
  });

  const sortedSeries = [...filteredSeries].sort((left, right) => {
    if (sort === "title") {
      return left.title.localeCompare(
        right.title,
        locale === "ko" ? "ko-KR" : "en-US",
      );
    }

    const leftTime = Date.parse(sort === "added" ? left.addedAt : left.updatedAt);
    const rightTime = Date.parse(sort === "added" ? right.addedAt : right.updatedAt);

    if (leftTime !== rightTime) {
      return rightTime - leftTime;
    }

    return left.title.localeCompare(
      right.title,
      locale === "ko" ? "ko-KR" : "en-US",
    );
  });

  const labels = {
    watched: locale === "ko" ? "시리즈" : "Series",
    toolbarSort: locale === "ko" ? "정렬" : "Sort",
    toolbarStatus: locale === "ko" ? "상태" : "Status",
    sortTitle: locale === "ko" ? "제목순" : "Title",
    sortUpdated: locale === "ko" ? "업데이트순" : "Updated",
    sortAdded: locale === "ko" ? "추가순" : "Added",
    statusAll: locale === "ko" ? "전체" : "All",
    statusContinuing: locale === "ko" ? "연재중" : "Continuing",
    statusEnded: locale === "ko" ? "완결" : "Ended",
    statusMissing: locale === "ko" ? "누락" : "Missing",
    statusDownloading: locale === "ko" ? "저장중" : "Downloading",
    continuingComplete:
      locale === "ko"
        ? "연재중 (현재 공개 회차 저장 완료)"
        : "Continuing (All available episodes downloaded)",
    endedComplete:
      locale === "ko"
        ? "완결 (현재 공개 회차 저장 완료)"
        : "Ended (All available episodes downloaded)",
    missingMonitored:
      locale === "ko"
        ? "누락 회차 있음 (모니터링 중)"
        : "Missing Episodes (Series monitored)",
    missingUnmonitored:
      locale === "ko"
        ? "누락 회차 있음 (모니터링 중지)"
        : "Missing Episodes (Series not monitored)",
    downloading:
      locale === "ko"
        ? "저장 중 (하나 이상의 회차)"
        : "Downloading (One or more episodes)",
    empty:
      locale === "ko"
        ? "추가된 시리즈가 없습니다."
        : "No series have been added yet.",
  };

  const sortItems: Array<{ key: SeriesSortKey; label: string }> = [
    { key: "title", label: labels.sortTitle },
    { key: "updated", label: labels.sortUpdated },
    { key: "added", label: labels.sortAdded },
  ];

  const statusItems: Array<{ key: SeriesStatusFilter; label: string }> = [
    { key: "all", label: labels.statusAll },
    { key: "continuing", label: labels.statusContinuing },
    { key: "ended", label: labels.statusEnded },
    { key: "missing", label: labels.statusMissing },
    { key: "downloading", label: labels.statusDownloading },
  ];

  return (
    <AdminShell
      locale={locale}
      activePath="/series"
      title={labels.watched}
      hideHeader
    >
      <section className="series-root-section">
        <div className="series-toolbar">
          <div className="series-toolbar-section grow">
            <SeriesLibraryActions locale={locale} />
          </div>

          <div className="series-toolbar-section">
            <span className="series-toolbar-label">{labels.toolbarSort}</span>
            <div className="series-toolbar-button-list">
              {sortItems.map((item) => (
                <Link
                  key={item.key}
                  href={buildSeriesHref(item.key, status)}
                  className={`series-toolbar-button${sort === item.key ? " active" : ""}`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="series-toolbar-separator" aria-hidden="true"></div>

          <div className="series-toolbar-section">
            <span className="series-toolbar-label">{labels.toolbarStatus}</span>
            <div className="series-toolbar-button-list">
              {statusItems.map((item) => (
                <Link
                  key={item.key}
                  href={buildSeriesHref(sort, item.key)}
                  className={`series-toolbar-button${status === item.key ? " active" : ""}`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {sortedSeries.length ? (
          <div className="series-poster-grid">
            {sortedSeries.map((entry) => {
              const cardState = getSeriesCardState(entry);
              const progress = getSeriesCardProgress(entry);

              return (
                <article key={entry.id} className="series-poster-card">
                  <Link href={`/series/${entry.slug}`} className="series-poster-card-link">
                    <div className="series-poster-frame">
                      {entry.isFinished ? (
                        <FinishedBadge size={28} className="series-card-finished-badge" />
                      ) : null}
                      {entry.isAdult ? (
                        <AdultBadge
                          size={28}
                          className={`series-card-adult-badge${
                            entry.isFinished ? " stacked-badge" : ""
                          }`}
                        />
                      ) : null}
                      {entry.posterThumbnailUrl ? (
                        <Image
                          src={entry.posterThumbnailUrl}
                          alt={entry.title}
                          width={480}
                          height={623}
                          unoptimized
                        />
                      ) : (
                        <div className="series-card-fallback" />
                      )}
                    </div>
                    <div className="series-card-status-bar">
                      <div
                        className={`series-card-status-fill is-${cardState}`}
                        style={{ width: `${progress}%` }}
                      ></div>
                      <span className="series-card-status-text">
                        {entry.downloadedEpisodes}/{entry.totalEpisodes}
                      </span>
                    </div>

                    <div className="series-card-copy">
                      <strong>{entry.title}</strong>
                      {entry.authors ? (
                        <span className="series-card-author">{entry.authors}</span>
                      ) : null}
                    </div>
                  </Link>
                  <SeriesCardManageMenu locale={locale} titleId={entry.titleId} />
                </article>
              );
            })}
          </div>
        ) : (
          <div className="series-empty-state">{labels.empty}</div>
        )}

        {sortedSeries.length ? (
          <div className="series-index-legend">
            <div className="series-index-legend-item">
              <div className="series-index-legend-color is-continuing-complete"></div>
              <div>{labels.continuingComplete}</div>
            </div>
            <div className="series-index-legend-item">
              <div className="series-index-legend-color is-ended-complete"></div>
              <div>{labels.endedComplete}</div>
            </div>
            <div className="series-index-legend-item">
              <div className="series-index-legend-color is-missing-monitored"></div>
              <div>{labels.missingMonitored}</div>
            </div>
            <div className="series-index-legend-item">
              <div className="series-index-legend-color is-missing-unmonitored"></div>
              <div>{labels.missingUnmonitored}</div>
            </div>
            <div className="series-index-legend-item">
              <div className="series-index-legend-color is-downloading"></div>
              <div>{labels.downloading}</div>
            </div>
          </div>
        ) : null}
      </section>
    </AdminShell>
  );
}
