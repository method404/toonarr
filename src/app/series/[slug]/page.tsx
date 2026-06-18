import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdultBadge } from "@/app/_components/adult-badge";
import { AdminShell } from "@/app/_components/admin-shell";
import { FinishedBadge } from "@/app/_components/finished-badge";
import { SeriesDetailActions } from "@/app/series/_components/series-detail-actions";
import { SeriesDetailAutoRefresh } from "@/app/series/_components/series-detail-auto-refresh";
import { SeriesEpisodeManageMenu } from "@/app/series/_components/series-episode-manage-menu";
import { OpenStoragePathButton } from "@/app/series/_components/open-storage-path-button";
import { SeriesSynopsis } from "@/app/series/_components/series-synopsis";
import { getStoredSeriesDetail } from "@/lib/library-store";
import { getLocale } from "@/lib/locale";
import {
  fetchNaverSeriesTagItems,
  resolveNaverEpisodeAirDate,
} from "@/lib/naver-series";

function formatTimestamp(value: string, locale: "ko" | "en") {
  if (!value || value === "-") {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function formatCalendarDate(value: Date, locale: "ko" | "en") {
  return new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

function formatEpisodeAirDate(
  value: string | null | undefined,
  fallback: string,
  locale: "ko" | "en",
) {
  const resolved = value ?? resolveNaverEpisodeAirDate(fallback);

  if (!resolved) {
    return fallback || "-";
  }

  const parsed = new Date(`${resolved}T12:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return resolved;
  }

  return formatCalendarDate(parsed, locale);
}

function getArtistCreditGroups(
  artists:
    | Array<{
        name: string;
        roles: string[];
      }>
    | undefined,
  fallback: string,
  locale: "ko" | "en",
) {
  const writerNames = new Set<string>();
  const painterNames = new Set<string>();
  const otherNames = new Set<string>();

  for (const artist of artists ?? []) {
    if (!artist.name) {
      continue;
    }

    const roles = artist.roles ?? [];
    const hasWriterRole = roles.includes("ARTIST_WRITER");
    const hasPainterRole = roles.includes("ARTIST_PAINTER");

    if (hasWriterRole) {
      writerNames.add(artist.name);
    }

    if (hasPainterRole) {
      painterNames.add(artist.name);
    }

    if (!hasWriterRole && !hasPainterRole) {
      otherNames.add(artist.name);
    }
  }

  const writerList = [...writerNames];
  const painterList = [...painterNames];
  const sameWriterAndPainter =
    writerList.length > 0 &&
    writerList.length === painterList.length &&
    writerList.every((name) => painterNames.has(name));

  const groups: Array<{ label: string; names: string[] }> = [];

  if (sameWriterAndPainter) {
    groups.push({
      label: locale === "ko" ? "글/그림" : "Writer/Artist",
      names: writerList,
    });
  } else {
    if (writerList.length > 0) {
      groups.push({
        label: locale === "ko" ? "글" : "Writer",
        names: writerList,
      });
    }

    if (painterList.length > 0) {
      groups.push({
        label: locale === "ko" ? "그림" : "Artist",
        names: painterList,
      });
    }
  }

  if (otherNames.size > 0) {
    groups.push({
      label: locale === "ko" ? "작가" : "Author",
      names: [...otherNames],
    });
  }

  if (groups.length > 0) {
    return groups;
  }

  const fallbackNames = fallback
    .split("/")
    .map((value) => value.trim())
    .filter(Boolean);

  return fallbackNames.length > 0
    ? [
        {
          label: locale === "ko" ? "작가" : "Author",
          names: fallbackNames,
        },
      ]
    : [];
}

function renderArtistCreditGroups(
  groups: Array<{ label: string; names: string[] }>,
) {
  if (groups.length === 0) {
    return "-";
  }

  return groups.map((group, groupIndex) => (
    <span key={`${group.label}:${groupIndex}`} className="series-detail-meta-credit">
      <span className="series-detail-meta-credit-label">{group.label}</span>
      <span className="series-detail-meta-credit-names">
        {group.names.map((name, nameIndex) => (
          <span key={`${group.label}:${name}`}>
            <Link
              href={`/series/add?q=${encodeURIComponent(name)}`}
              className="series-detail-meta-link"
            >
              {name}
            </Link>
            {nameIndex < group.names.length - 1 ? ", " : ""}
          </span>
        ))}
      </span>
      {groupIndex < groups.length - 1 ? " / " : ""}
    </span>
  ));
}

function getEpisodeStatus(
  status:
    | "pending"
    | "downloading"
    | "preview"
    | "downloaded"
    | "failed"
    | undefined,
  locale: "ko" | "en",
) {
  switch (status) {
    case "downloading":
      return {
        label: locale === "ko" ? "저장중" : "Downloading",
        className: "is-downloading",
      };
    case "pending":
      return {
        label: locale === "ko" ? "저장 대기" : "Queued",
        className: "is-pending",
      };
    case "downloaded":
      return {
        label: locale === "ko" ? "저장됨" : "Downloaded",
        className: "is-downloaded",
      };
    case "preview":
      return {
        label: locale === "ko" ? "유료 대기" : "Preview",
        className: "is-preview",
      };
    case "failed":
      return {
        label: locale === "ko" ? "실패" : "Failed",
        className: "is-failed",
      };
    default:
      return {
        label: locale === "ko" ? "미저장" : "Missing",
        className: "",
      };
  }
}

function getSeriesTagHref(tag: {
  curationType: string;
  id: number | null;
  tagName: string;
  urlPath: string;
}) {
  if (!tag.urlPath.startsWith("/curation/list?") || tag.id === null) {
    return null;
  }

  return `/series/curation?type=${encodeURIComponent(
    tag.curationType,
  )}&id=${tag.id}&label=${encodeURIComponent(tag.tagName)}`;
}

function getDisplayTagItems(
  metadata:
    | {
        tags?: string[];
        tagItems?: Array<{
          id: number | null;
          tagName: string;
          urlPath: string;
          curationType: string;
        }>;
      }
    | null
    | undefined,
) {
  const byName = new Map<
    string,
    {
      id: number | null;
      tagName: string;
      urlPath: string;
      curationType: string;
    }
  >();

  for (const tag of metadata?.tagItems ?? []) {
    if (!tag.tagName) {
      continue;
    }

    const existing = byName.get(tag.tagName);

    if (!existing) {
      byName.set(tag.tagName, tag);
      continue;
    }

    if (existing.curationType !== "CUSTOM_TAG" && tag.curationType === "CUSTOM_TAG") {
      byName.set(tag.tagName, tag);
    }
  }

  if (byName.size > 0) {
    return [...byName.values()];
  }

  return (metadata?.tags ?? []).map((tagName) => ({
    id: null,
    tagName,
    urlPath: "",
    curationType: "",
  }));
}

type SeriesDetailPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function SeriesDetailPage({
  params,
}: SeriesDetailPageProps) {
  const { slug } = await params;
  const locale = await getLocale();
  const detail = await getStoredSeriesDetail(slug);

  if (!detail) {
    notFound();
  }

  const mergedEpisodes = [...detail.episodes, ...detail.paidEpisodes]
    .reduce<Map<number, (typeof detail.episodes)[number]>>((map, episode) => {
      map.set(episode.no, episode);
      return map;
    }, new Map())
    .values();
  const allEpisodes = [...mergedEpisodes].sort((left, right) => right.no - left.no);
  const { summary, metadata } = detail;
  const artistCreditGroups = getArtistCreditGroups(
    metadata?.artists,
    summary.authors,
    locale,
  );
  const fallbackTagItems =
    metadata && (!metadata.tagItems || metadata.tagItems.length === 0)
      ? await fetchNaverSeriesTagItems(summary.titleId).catch(() => [])
      : [];
  const displayTags = getDisplayTagItems(
    metadata
      ? {
          ...metadata,
          tagItems:
            metadata.tagItems && metadata.tagItems.length > 0
              ? metadata.tagItems
              : fallbackTagItems,
        }
      : null,
  );
  const hasActiveStorageSync = Object.values(detail.episodeArchives).some(
    (archive) =>
      archive?.crawl.status === "pending" ||
      archive?.crawl.status === "downloading",
  );
  const labels = {
    by: locale === "ko" ? "작가" : "By",
    storedEpisodes: locale === "ko" ? "저장" : "Stored",
    nextCheck: locale === "ko" ? "다음 확인" : "Next Check",
    folder: locale === "ko" ? "저장경로" : "Storage Path",
    finished: locale === "ko" ? "완결" : "Finished",
    ongoing: locale === "ko" ? "연재중" : "Ongoing",
    monitoring: locale === "ko" ? "추적중" : "Monitored",
    paused: locale === "ko" ? "보류" : "Paused",
    dailyPass: locale === "ko" ? "유료" : "Daily Pass",
    free: locale === "ko" ? "무료" : "Free",
    onBreak: locale === "ko" ? "휴재" : "On Break",
    episodes: locale === "ko" ? "회차" : "Episodes",
    number: locale === "ko" ? "번호" : "No.",
    title: locale === "ko" ? "제목" : "Title",
    airDate: "Air Date",
    rating: locale === "ko" ? "별점" : "Rating",
    status: locale === "ko" ? "상태" : "Status",
    manage: locale === "ko" ? "관리" : "Manage",
    notStored: locale === "ko" ? "미저장" : "Missing",
    updatedAt: locale === "ko" ? "메타데이터 갱신" : "Metadata Updated",
  };

  return (
    <AdminShell
      locale={locale}
      activePath={`/series/${slug}`}
      title={summary.title}
      hideHeader
    >
      <SeriesDetailAutoRefresh active={hasActiveStorageSync} />
      <section className="series-detail-shell">
        <div className="series-detail-hero">
          <div className="series-detail-poster">
            {summary.isFinished ? (
              <FinishedBadge size={42} className="series-detail-finished-badge" />
            ) : null}
            {summary.isAdult ? (
              <AdultBadge
                size={42}
                className={`series-detail-adult-badge${
                  summary.isFinished ? " stacked-badge" : ""
                }`}
              />
            ) : null}
            {summary.posterThumbnailUrl ? (
              <Image
                src={summary.posterThumbnailUrl}
                alt={summary.title}
                width={480}
                height={623}
                unoptimized
              />
            ) : (
              <div className="series-card-fallback" />
            )}
          </div>

          <div className="series-detail-main">
            <div className="series-detail-heading-row">
              <div className="series-detail-heading-copy">
                <div className="series-detail-title-row">
                  <h1>{summary.title}</h1>
                  <div className="badge-list series-detail-state-badges">
                    <span className="tag-badge">
                      {summary.isFinished ? labels.finished : labels.ongoing}
                    </span>
                    <span className="tag-badge subtle-tag">
                      {summary.monitored ? labels.monitoring : labels.paused}
                    </span>
                    {summary.isDailyPass ? (
                      <span className="tag-badge subtle-tag">{labels.dailyPass}</span>
                    ) : null}
                    {summary.isOnBreak ? (
                      <span className="tag-badge subtle-tag">{labels.onBreak}</span>
                    ) : null}
                  </div>
                </div>

                <div className="series-detail-meta">
                  <span>{renderArtistCreditGroups(artistCreditGroups)}</span>
                  <span>{summary.publishDescription || "-"}</span>
                  <span>{labels.updatedAt} {formatTimestamp(summary.updatedAt, locale)}</span>
                </div>

                {metadata?.synopsis ? (
                  <SeriesSynopsis
                    key={metadata.synopsis}
                    locale={locale}
                    text={metadata.synopsis}
                  />
                ) : null}

                {displayTags.length ? (
                  <div className="badge-list series-detail-tag-list">
                    {displayTags.map((tag) => {
                      const href = getSeriesTagHref(tag);

                      if (href) {
                        return (
                          <Link key={`${tag.curationType}:${tag.id}`} href={href} className="tag-badge">
                            {tag.tagName}
                          </Link>
                        );
                      }

                      return (
                        <span
                          key={`${tag.curationType}:${tag.id}:${tag.tagName}`}
                          className="tag-badge"
                        >
                          {tag.tagName}
                        </span>
                      );
                    })}
                  </div>
                ) : null}
              </div>
              <SeriesDetailActions locale={locale} titleId={summary.titleId} />
            </div>

            <div className="series-detail-stats">
              <article className="series-stat-card">
                <span>{labels.storedEpisodes}</span>
                <strong>
                  {summary.downloadedEpisodes}/{summary.totalEpisodes}
                </strong>
              </article>
              <article className="series-stat-card">
                <span>{labels.nextCheck}</span>
                <strong>{formatTimestamp(summary.nextCheck, locale)}</strong>
              </article>
              <article className="series-stat-card">
                <span>{labels.folder}</span>
                <OpenStoragePathButton locale={locale} path={summary.storagePath} />
              </article>
            </div>
          </div>
        </div>

        <section className="series-episode-panel">
          <div className="series-episode-table-wrap">
            <table className="series-episode-table">
              <thead>
                <tr>
                  <th>{labels.number}</th>
                  <th className="series-episode-thumb-column" aria-label="Thumbnail"></th>
                  <th>{labels.title}</th>
                  <th>{labels.airDate}</th>
                  <th>{labels.rating}</th>
                  <th>{labels.status}</th>
                  <th>{labels.manage}</th>
                </tr>
              </thead>
              <tbody>
                {allEpisodes.map((episode) => {
                  const archive = detail.episodeArchives[episode.no];
                  const episodeStatus = getEpisodeStatus(
                    archive?.crawl.status,
                    locale,
                  );

                  return (
                    <tr key={episode.no}>
                    <td className="series-episode-number-cell mono-text">{episode.no}</td>
                    <td className="series-episode-thumb-cell">
                      <div className="series-episode-thumb">
                        {episode.thumbnailUrl ? (
                          <Image
                            src={episode.thumbnailUrl}
                            alt={episode.subtitle}
                            width={202}
                            height={120}
                            unoptimized
                          />
                        ) : (
                          <div className="series-episode-thumb-fallback" />
                        )}
                      </div>
                    </td>
                    <td className="series-episode-title-cell">
                      <strong>{episode.subtitle}</strong>
                    </td>
                    <td className="series-episode-airdate">
                      {formatEpisodeAirDate(
                        episode.serviceDate,
                        episode.serviceDateDescription,
                        locale,
                      )}
                    </td>
                    <td className="series-episode-rating">
                      {episode.starScore === null
                        ? "-"
                        : episode.starScore.toFixed(2)}
                    </td>
                    <td className="series-episode-status-cell">
                      <div className="series-episode-status-stack">
                        <span
                          className={`series-episode-status ${episodeStatus.className}`.trim()}
                        >
                          {episodeStatus.label}
                        </span>
                      </div>
                    </td>
                    <td className="series-episode-manage-cell">
                      <SeriesEpisodeManageMenu
                        locale={locale}
                        titleId={summary.titleId}
                        no={episode.no}
                      />
                    </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </AdminShell>
  );
}
