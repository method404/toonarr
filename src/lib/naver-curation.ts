import type { Locale } from "@/lib/locale";
import { fetchNaverJson } from "@/lib/naver-request";

type RawCurationAuthor = {
  name?: string;
};

type RawCurationGenre = {
  description?: string;
};

type RawCurationItem = {
  titleId?: number;
  titleName?: string;
  thumbnailUrl?: string;
  displayAuthor?: string;
  writers?: RawCurationAuthor[];
  painters?: RawCurationAuthor[];
  synopsis?: string;
  chargeYn?: string;
  averageStarScore?: number;
  finished?: boolean;
  adult?: boolean;
  bm?: boolean;
  up?: boolean;
  rest?: boolean;
  articleTotalCount?: number;
  lastArticleServiceDate?: string;
  genreList?: RawCurationGenre[];
  new?: boolean;
};

type RawCurationPageInfo = {
  page?: number;
  totalPages?: number;
  totalRows?: number;
  pageSize?: number;
};

type RawCurationMetaResponse = {
  curationTitle?: string;
  pageInfo?: RawCurationPageInfo;
};

type RawCurationListResponse = {
  curationViewList?: RawCurationItem[];
  pageInfo?: RawCurationPageInfo;
};

export type CurationOrder = "USER" | "UPDATE" | "STARSCORE";

export type CurationItem = {
  id: string;
  titleId: number | null;
  title: string;
  thumbnailUrl: string;
  authors: string;
  synopsis: string;
  episodes: number;
  lastUpdated: string;
  genres: string[];
  flags: string[];
  rating: string;
  isAdult: boolean;
  isPaid: boolean;
};

export type CurationPage = {
  title: string;
  items: CurationItem[];
  page: number;
  pageSize: number;
  totalPages: number;
  totalRows: number;
  hasMore: boolean;
};

function t(locale: Locale, ko: string, en: string) {
  return locale === "ko" ? ko : en;
}

function normalizeAuthors(item: RawCurationItem) {
  if (item.displayAuthor) {
    return item.displayAuthor;
  }

  const names = [
    ...(item.writers ?? []).map((artist) => artist.name ?? ""),
    ...(item.painters ?? []).map((artist) => artist.name ?? ""),
  ].filter(Boolean);

  return [...new Set(names)].join(" / ");
}

function normalizeFlags(item: RawCurationItem, locale: Locale) {
  const flags: string[] = [];

  if (item.bm || item.chargeYn === "Y") {
    flags.push(t(locale, "유료", "Paid"));
  }
  if (item.finished) {
    flags.push(t(locale, "완결", "Finished"));
  }
  if (item.rest) {
    flags.push(t(locale, "휴재", "On Break"));
  }
  if (item.up) {
    flags.push("UP");
  }
  if (item.new) {
    flags.push(t(locale, "신작", "New"));
  }

  return flags;
}

export async function getNaverCurationPage(
  locale: Locale,
  config: {
    type: string;
    id: number;
    order?: CurationOrder;
    page?: number;
    pageSize?: number;
    fallbackTitle?: string;
  },
): Promise<CurationPage> {
  const order = config.order ?? "USER";
  const page = config.page ?? 1;
  const pageSize = config.pageSize ?? 25;

  const [meta, data] = await Promise.all([
    fetchNaverJson<RawCurationMetaResponse>(
      `https://comic.naver.com/api/curation/meta?type=${config.type}&id=${config.id}`,
    ),
    fetchNaverJson<RawCurationListResponse>(
      `https://comic.naver.com/api/curation/list?type=${config.type}&id=${config.id}&page=${page}&pageSize=${pageSize}&order=${order}`,
    ),
  ]);

  const pageInfo = data.pageInfo ?? meta.pageInfo ?? {};
  const currentPage = pageInfo.page ?? page;
  const totalPages = pageInfo.totalPages ?? currentPage;
  const totalRows = pageInfo.totalRows ?? 0;
  const resolvedPageSize = pageInfo.pageSize ?? pageSize;

  return {
    title: meta.curationTitle ?? config.fallbackTitle ?? t(locale, "큐레이션", "Curation"),
    items: (data.curationViewList ?? []).map((item) => ({
      id: String(item.titleId ?? item.titleName ?? Math.random()),
      titleId: typeof item.titleId === "number" ? item.titleId : null,
      title: item.titleName ?? "",
      thumbnailUrl: item.thumbnailUrl ?? "",
      authors: normalizeAuthors(item),
      synopsis: item.synopsis ?? "",
      episodes: item.articleTotalCount ?? 0,
      lastUpdated: item.lastArticleServiceDate ?? "",
      genres: (item.genreList ?? [])
        .map((genre) => genre.description ?? "")
        .filter(Boolean),
      flags: normalizeFlags(item, locale),
      rating:
        typeof item.averageStarScore === "number"
          ? item.averageStarScore.toFixed(2)
          : "-",
      isAdult: Boolean(item.adult),
      isPaid: Boolean(item.bm || item.chargeYn === "Y"),
    })),
    page: currentPage,
    pageSize: resolvedPageSize,
    totalPages,
    totalRows,
    hasMore: currentPage < totalPages,
  };
}
