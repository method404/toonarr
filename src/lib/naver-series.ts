import { fetchNaverJson, fetchNaverText } from "@/lib/naver-request";

type RawArticleItem = {
  no?: number;
  subtitle?: string;
  thumbnailUrl?: string;
  starScore?: number;
  bgm?: boolean;
  up?: boolean;
  charge?: boolean;
  serviceDateDescription?: string;
  volumeNo?: number;
  hasReadLog?: boolean;
  recentlyReadLog?: boolean;
  thumbnailClock?: boolean;
  thumbnailLock?: boolean;
};

type RawArticlePageInfo = {
  totalPages?: number;
};

type RawArticleListResponse = {
  titleId?: number;
  totalCount?: number;
  finished?: boolean;
  dailyPass?: boolean;
  articleList?: RawArticleItem[];
  chargeFolderArticleList?: RawArticleItem[];
  pageInfo?: RawArticlePageInfo;
};

type RawArtistInfo = {
  artistId?: number;
  name?: string;
  artistTypeList?: string[];
  curationPageUrl?: string;
};

type RawAgeInfo = {
  type?: string;
  description?: string;
};

type RawTagInfo = {
  id?: number;
  tagName?: string;
  urlPath?: string;
  curationType?: string;
};

type RawBadgeInfo = {
  type?: string;
  name?: string;
};

type RawFirstArticleInfo = {
  no?: number;
  subtitle?: string;
  charge?: boolean;
};

type RawInfoResponse = {
  titleId?: number;
  thumbnailUrl?: string;
  posterThumbnailUrl?: string;
  sharedThumbnailUrl?: string;
  titleName?: string;
  contentsNo?: number;
  webtoonLevelCode?: string;
  rest?: boolean;
  finished?: boolean;
  dailyPass?: boolean;
  publishDayOfWeekList?: string[];
  communityArtists?: RawArtistInfo[];
  synopsis?: string;
  favorite?: boolean;
  favoriteCount?: number;
  age?: RawAgeInfo;
  publishDescription?: string;
  curationTagList?: RawTagInfo[];
  thumbnailBadgeList?: RawBadgeInfo[];
  firstArticle?: RawFirstArticleInfo;
  new?: boolean;
};

type RawOtherTitleAuthor = {
  writers?: string[];
  painters?: string[];
  originAuthors?: string[];
};

type RawOtherTitleResponseItem = {
  rank?: number;
  titleId?: number;
  titleName?: string;
  author?: RawOtherTitleAuthor;
  displayAuthor?: string;
  thumbnailUrl?: string;
  thumbnailBadgeList?: RawBadgeInfo[];
  up?: boolean;
  rest?: boolean;
};

export type NaverSeriesMetadata = {
  titleId: number;
  title: string;
  titleThumbnailUrl: string;
  titleThumbnailCachePath: string;
  posterThumbnailUrl: string;
  posterThumbnailCachePath: string;
  sharedThumbnailUrl: string;
  sharedThumbnailCachePath: string;
  synopsis: string;
  authors: string;
  artists: Array<{
    artistId: number | null;
    name: string;
    roles: string[];
    curationPageUrl: string;
  }>;
  publishDays: string[];
  publishDescription: string;
  tags: string[];
  tagItems: Array<{
    id: number | null;
    tagName: string;
    urlPath: string;
    curationType: string;
  }>;
  badges: string[];
  webtoonLevelCode: string;
  isAdult: boolean;
  ageDescription: string;
  isFinished: boolean;
  isDailyPass: boolean;
  isOnBreak: boolean;
  favoriteCount: number;
  firstEpisodeNo: number | null;
  firstEpisodeTitle: string;
  firstEpisodePaid: boolean;
  updatedAt: string;
};

export type NaverSeriesEpisode = {
  no: number;
  subtitle: string;
  thumbnailUrl: string;
  thumbnailCachePath: string;
  serviceDate: string | null;
  starScore: number | null;
  serviceDateDescription: string;
  volumeNo: number | null;
  isUp: boolean;
  isPaid: boolean;
  hasBgm: boolean;
  hasReadLog: boolean;
  thumbnailClock: boolean;
  thumbnailLock: boolean;
  detailUrl: string;
  commentPageId: string;
  activityCountUrl: string;
  userActionUrl: string;
  imageReferer: string;
};

export type NaverRelatedTitle = {
  titleId: number;
  title: string;
  displayAuthor: string;
  thumbnailUrl: string;
  badges: string[];
  isUp: boolean;
  isOnBreak: boolean;
  rank: number | null;
};

export type NaverSeriesSnapshot = {
  metadata: NaverSeriesMetadata;
  episodes: NaverSeriesEpisode[];
  paidEpisodes: NaverSeriesEpisode[];
  relatedTitles: NaverRelatedTitle[];
};

export type NaverSeriesTagItem = NaverSeriesMetadata["tagItems"][number];

async function fetchJson<T>(url: string): Promise<T> {
  return fetchNaverJson<T>(url);
}

async function fetchText(url: string): Promise<string> {
  return fetchNaverText(url);
}

function normalizeTagItems(items: RawTagInfo[] | undefined): NaverSeriesTagItem[] {
  return (items ?? [])
    .map((tag) => ({
      id: typeof tag.id === "number" ? tag.id : null,
      tagName: tag.tagName ?? "",
      urlPath: tag.urlPath ?? "",
      curationType: tag.curationType ?? "",
    }))
    .filter((tag) => tag.tagName);
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

const SEOUL_TIME_ZONE = "Asia/Seoul";

type CalendarDate = {
  year: number;
  month: number;
  day: number;
};

const seoulDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: SEOUL_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function formatCalendarDate(value: CalendarDate) {
  return `${value.year}-${pad2(value.month)}-${pad2(value.day)}`;
}

function getSeoulCalendarDate(value: Date): CalendarDate {
  const parts = seoulDateFormatter.formatToParts(value);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  return { year, month, day };
}

function addDays(value: CalendarDate, days: number): CalendarDate {
  const parsed = new Date(Date.UTC(value.year, value.month - 1, value.day + days, 12, 0, 0));

  return {
    year: parsed.getUTCFullYear(),
    month: parsed.getUTCMonth() + 1,
    day: parsed.getUTCDate(),
  };
}

export function resolveNaverEpisodeAirDate(
  value: string,
  now: Date = new Date(),
): string | null {
  const normalizedValue = value.replace(/\s+/g, "");
  const absoluteMatch = value.match(/^(\d{2})\.(\d{2})\.(\d{2})$/);

  if (absoluteMatch) {
    const year = Number(`20${absoluteMatch[1]}`);
    const month = Number(absoluteMatch[2]);
    const day = Number(absoluteMatch[3]);

    return Number.isNaN(Date.UTC(year, month - 1, day, 12, 0, 0))
      ? null
      : formatCalendarDate({ year, month, day });
  }

  const seoulToday = getSeoulCalendarDate(now);

  if (normalizedValue === "오늘밤무료" || normalizedValue === "오늘무료") {
    return formatCalendarDate(seoulToday);
  }

  if (normalizedValue === "내일무료") {
    return formatCalendarDate(addDays(seoulToday, 1));
  }

  if (normalizedValue === "모레무료") {
    return formatCalendarDate(addDays(seoulToday, 2));
  }

  const relativeMatch = value.match(/(\d+)\s*일\s*후\s*무료/);

  if (relativeMatch) {
    return formatCalendarDate(addDays(seoulToday, Number(relativeMatch[1])));
  }

  return null;
}

export function buildNaverEpisodeDetailUrl(titleId: number, no: number) {
  return `https://comic.naver.com/webtoon/detail?titleId=${titleId}&no=${no}`;
}

export function buildNaverEpisodeCommentPageId(titleId: number, no: number) {
  return `webtoon_${titleId}_${no}`;
}

export function buildNaverEpisodeActivityCountUrl(titleId: number, no: number) {
  return `https://comic.naver.com/comment/api/community/v1/pages/activity/count?pageIds=${buildNaverEpisodeCommentPageId(titleId, no)}`;
}

export function buildNaverEpisodeUserActionUrl(titleId: number, no: number) {
  return `https://comic.naver.com/api/userAction/info?titleId=${titleId}&no=${no}`;
}

export function extractEpisodeImageUrlsFromDetailHtml(
  titleId: number,
  no: number,
  html: string,
) {
  const pattern = new RegExp(
    `https://image-comic\\.pstatic\\.net/webtoon/${titleId}/${no}/[^"'\\s]+\\.jpg`,
    "g",
  );
  const matches = html.match(pattern) ?? [];

  return [...new Set(matches)].filter((url) => !url.includes("thumbnail_202x120_"));
}

export async function fetchNaverEpisodeImageUrls(titleId: number, no: number) {
  const html = await fetchText(buildNaverEpisodeDetailUrl(titleId, no));

  return extractEpisodeImageUrlsFromDetailHtml(titleId, no, html);
}

export async function fetchNaverSeriesTagItems(titleId: number) {
  const info = await fetchJson<RawInfoResponse>(
    `https://comic.naver.com/api/article/list/info?titleId=${titleId}`,
  );

  return normalizeTagItems(info.curationTagList);
}

function isAdultSeries(info: RawInfoResponse) {
  const ageType = info.age?.type ?? "";
  const ageDescription = info.age?.description ?? "";
  const badgeNames = normalizeBadgeNames(info.thumbnailBadgeList);

  return (
    ageType.includes("18") ||
    ageType.includes("19") ||
    ageDescription.includes("18") ||
    ageDescription.includes("19") ||
    badgeNames.includes("ADULT")
  );
}

function normalizeBadgeNames(items: RawBadgeInfo[] | undefined) {
  return (items ?? [])
    .map((item) => item.name ?? item.type ?? "")
    .filter(Boolean);
}

function normalizeDisplayAuthor(info: RawInfoResponse) {
  const uniqueNames = new Set(
    (info.communityArtists ?? [])
      .map((artist) => artist.name ?? "")
      .filter(Boolean),
  );

  return [...uniqueNames].join(" / ");
}

function normalizeEpisode(
  titleId: number,
  item: RawArticleItem,
): NaverSeriesEpisode | null {
  if (typeof item.no !== "number") {
    return null;
  }

  return {
    no: item.no,
    subtitle: item.subtitle ?? "",
    thumbnailUrl: item.thumbnailUrl ?? "",
    thumbnailCachePath: `cache/naver/series/${titleId}/episodes/${item.no}/thumbnail.jpg`,
    serviceDate: resolveNaverEpisodeAirDate(item.serviceDateDescription ?? ""),
    starScore: typeof item.starScore === "number" ? item.starScore : null,
    serviceDateDescription: item.serviceDateDescription ?? "",
    volumeNo: typeof item.volumeNo === "number" ? item.volumeNo : null,
    isUp: Boolean(item.up),
    isPaid: Boolean(item.charge),
    hasBgm: Boolean(item.bgm),
    hasReadLog: Boolean(item.hasReadLog || item.recentlyReadLog),
    thumbnailClock: Boolean(item.thumbnailClock),
    thumbnailLock: Boolean(item.thumbnailLock),
    detailUrl: buildNaverEpisodeDetailUrl(titleId, item.no),
    commentPageId: buildNaverEpisodeCommentPageId(titleId, item.no),
    activityCountUrl: buildNaverEpisodeActivityCountUrl(titleId, item.no),
    userActionUrl: buildNaverEpisodeUserActionUrl(titleId, item.no),
    imageReferer: buildNaverEpisodeDetailUrl(titleId, item.no),
  };
}

async function fetchArticlePage(titleId: number, page: number) {
  return fetchJson<RawArticleListResponse>(
    `https://comic.naver.com/api/article/list?titleId=${titleId}&page=${page}`,
  );
}

async function fetchAllArticles(titleId: number) {
  const firstPage = await fetchArticlePage(titleId, 1);
  const totalCount = firstPage.totalCount ?? firstPage.articleList?.length ?? 0;
  const totalPages =
    firstPage.pageInfo?.totalPages ??
    Math.max(1, Math.ceil(totalCount / 20));

  const remainingPages =
    totalPages > 1
      ? await Promise.all(
          Array.from({ length: totalPages - 1 }, (_, index) =>
            fetchArticlePage(titleId, index + 2),
          ),
        )
      : [];

  return [firstPage, ...remainingPages];
}

export async function fetchNaverSeriesSnapshot(
  titleId: number,
): Promise<NaverSeriesSnapshot> {
  const [info, relatedTitles, articlePages] = await Promise.all([
    fetchJson<RawInfoResponse>(
      `https://comic.naver.com/api/article/list/info?titleId=${titleId}`,
    ),
    fetchJson<RawOtherTitleResponseItem[]>(
      `https://comic.naver.com/api/artist/otherTitle/list?titleId=${titleId}`,
    ),
    fetchAllArticles(titleId),
  ]);

  const normalizedTitleId = info.titleId ?? titleId;
  const metadata: NaverSeriesMetadata = {
    titleId: normalizedTitleId,
    title: info.titleName ?? "",
    titleThumbnailUrl: info.thumbnailUrl ?? "",
    titleThumbnailCachePath: `cache/naver/series/${normalizedTitleId}/title.jpg`,
    posterThumbnailUrl: info.posterThumbnailUrl ?? "",
    posterThumbnailCachePath: `cache/naver/series/${normalizedTitleId}/poster.jpg`,
    sharedThumbnailUrl: info.sharedThumbnailUrl ?? "",
    sharedThumbnailCachePath: `cache/naver/series/${normalizedTitleId}/shared.jpg`,
    synopsis: info.synopsis ?? "",
    authors: normalizeDisplayAuthor(info),
    artists: (info.communityArtists ?? []).map((artist) => ({
      artistId:
        typeof artist.artistId === "number" ? artist.artistId : null,
      name: artist.name ?? "",
      roles: artist.artistTypeList ?? [],
      curationPageUrl: artist.curationPageUrl ?? "",
    })),
    publishDays: info.publishDayOfWeekList ?? [],
    publishDescription: info.publishDescription ?? "",
    tags: (info.curationTagList ?? [])
      .map((tag) => tag.tagName ?? "")
      .filter(Boolean),
    tagItems: normalizeTagItems(info.curationTagList),
    badges: normalizeBadgeNames(info.thumbnailBadgeList),
    webtoonLevelCode: info.webtoonLevelCode ?? "",
    isAdult: isAdultSeries(info),
    ageDescription: info.age?.description ?? "",
    isFinished: Boolean(info.finished),
    isDailyPass: Boolean(info.dailyPass),
    isOnBreak: Boolean(info.rest),
    favoriteCount: info.favoriteCount ?? 0,
    firstEpisodeNo:
      typeof info.firstArticle?.no === "number" ? info.firstArticle.no : null,
    firstEpisodeTitle: info.firstArticle?.subtitle ?? "",
    firstEpisodePaid: Boolean(info.firstArticle?.charge),
    updatedAt: new Date().toISOString(),
  };

  const episodes = articlePages
    .flatMap((page) => page.articleList ?? [])
    .map((item) => normalizeEpisode(normalizedTitleId, item))
    .filter((item): item is NaverSeriesEpisode => item !== null)
    .sort((left, right) => right.no - left.no);

  const paidEpisodes = articlePages
    .flatMap((page) => page.chargeFolderArticleList ?? [])
    .map((item) => normalizeEpisode(normalizedTitleId, item))
    .filter((item): item is NaverSeriesEpisode => item !== null)
    .sort((left, right) => right.no - left.no);

  return {
    metadata,
    episodes,
    paidEpisodes,
    relatedTitles: relatedTitles
      .filter((item) => typeof item.titleId === "number")
      .map((item) => ({
        titleId: item.titleId as number,
        title: item.titleName ?? "",
        displayAuthor: item.displayAuthor ?? "",
        thumbnailUrl: item.thumbnailUrl ?? "",
        badges: normalizeBadgeNames(item.thumbnailBadgeList),
        isUp: Boolean(item.up),
        isOnBreak: Boolean(item.rest),
        rank: typeof item.rank === "number" ? item.rank : null,
      })),
  };
}
