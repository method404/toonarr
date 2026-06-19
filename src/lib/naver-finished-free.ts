import type { Locale } from "@/lib/locale";
import { fetchNaverJson } from "@/lib/naver-request";

type RawFinishedFreeAuthor = {
  name?: string;
};

type RawFinishedFreeGenre = {
  description?: string;
};

type RawFinishedFreeItem = {
  titleId?: number;
  titleName?: string;
  thumbnailUrl?: string;
  displayAuthor?: string;
  writers?: RawFinishedFreeAuthor[];
  painters?: RawFinishedFreeAuthor[];
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
  genreList?: RawFinishedFreeGenre[];
  new?: boolean;
};

type RawFinishedFreePageInfo = {
  page?: number;
  nextPage?: number;
  totalPages?: number;
  totalRows?: number;
  pageSize?: number;
};

type RawFinishedFreeMetaResponse = {
  curationTitle?: string;
  pageInfo?: RawFinishedFreePageInfo;
};

type RawFinishedFreeListResponse = {
  curationViewList?: RawFinishedFreeItem[];
  pageInfo?: RawFinishedFreePageInfo;
};

export type FinishedFreeOrder = "USER" | "UPDATE" | "STARSCORE";

export type FinishedFreeItem = {
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

export type FinishedFreePage = {
  title: string;
  items: FinishedFreeItem[];
  page: number;
  pageSize: number;
  totalPages: number;
  totalRows: number;
  hasMore: boolean;
};

function t(locale: Locale, ko: string, en: string) {
  return locale === "ko" ? ko : en;
}

function normalizeAuthors(item: RawFinishedFreeItem) {
  if (item.displayAuthor) {
    return item.displayAuthor;
  }

  const names = [
    ...(item.writers ?? []).map((artist) => artist.name ?? ""),
    ...(item.painters ?? []).map((artist) => artist.name ?? ""),
  ].filter(Boolean);

  return [...new Set(names)].join(" / ");
}

function normalizeFlags(item: RawFinishedFreeItem, locale: Locale) {
  const flags: string[] = [];

  if (item.bm || item.chargeYn === "Y") {
    flags.push(t(locale, "유료", "Paid"));
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

export async function getNaverFinishedFreePage(
  locale: Locale,
  order: FinishedFreeOrder = "USER",
  page: number = 1,
  pageSize: number = 25,
): Promise<FinishedFreePage> {
  const [meta, data] = await Promise.all([
    fetchNaverJson<RawFinishedFreeMetaResponse>(
      "https://comic.naver.com/api/curation/meta?type=FINISH_FREE&id=0",
    ),
    fetchNaverJson<RawFinishedFreeListResponse>(
      `https://comic.naver.com/api/curation/list?type=FINISH_FREE&id=0&page=${page}&pageSize=${pageSize}&order=${order}`,
    ),
  ]);

  const pageInfo = data.pageInfo ?? meta.pageInfo ?? {};
  const currentPage = pageInfo.page ?? page;
  const totalPages = pageInfo.totalPages ?? currentPage;
  const totalRows = pageInfo.totalRows ?? 0;
  const resolvedPageSize = pageInfo.pageSize ?? pageSize;

  return {
    title: meta.curationTitle ?? t(locale, "완결 무료 웹툰", "Finished Free Webtoons"),
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
