import type { Locale } from "@/lib/locale";
import { fetchNaverJson } from "@/lib/naver-request";

type RawArtist = {
  name?: string;
};

type RawTag = {
  tagName?: string;
};

type RawGenre = {
  description?: string;
};

type RawSearchItem = {
  titleId?: number;
  contentId?: number;
  titleName?: string;
  displayAuthor?: string;
  communityArtists?: RawArtist[];
  synopsis?: string;
  finished?: boolean;
  adult?: boolean;
  nineteen?: boolean;
  bm?: boolean;
  up?: boolean;
  rest?: boolean;
  articleTotalCount?: number;
  lastArticleServiceDate?: string;
  publishDescription?: string;
  thumbnailUrl?: string;
  tagList?: RawTag[];
  genreList?: RawGenre[];
  webtoonLevelCode?: string;
  new?: boolean;
};

type RawSearchBucket = {
  totalCount?: number;
  searchViewList?: RawSearchItem[];
};

type RawSearchResponse = {
  searchBestChallengeResult?: RawSearchBucket;
  searchChallengeResult?: RawSearchBucket;
  searchNbooksComicResult?: RawSearchBucket;
  searchNbooksNovelResult?: RawSearchBucket;
  searchWebtoonResult?: RawSearchBucket;
};

export type NaverSearchSource =
  | "all"
  | "webtoon"
  | "challenge"
  | "bestChallenge";

export type NaverSearchCategory = {
  key: Exclude<NaverSearchSource, "all">;
  label: string;
  totalCount: number;
};

export type NaverSearchResult = {
  id: string;
  titleId: number | null;
  source: Exclude<NaverSearchSource, "all">;
  sourceLabel: string;
  title: string;
  thumbnailUrl: string;
  authors: string;
  synopsis: string;
  publish: string;
  episodes: number;
  lastUpdated: string;
  genres: string[];
  tags: string[];
  flags: string[];
  isAdult: boolean;
};

export type NaverSearchPayload = {
  categories: NaverSearchCategory[];
  results: NaverSearchResult[];
  totalCount: number;
};

function t(locale: Locale, ko: string, en: string) {
  return locale === "ko" ? ko : en;
}

function sourceLabelMap(locale: Locale) {
  return {
    webtoon: t(locale, "웹툰", "Webtoon"),
    challenge: t(locale, "도전만화", "Challenge"),
    bestChallenge: t(locale, "베스트도전", "Best Challenge"),
  } as const;
}

function normalizeAuthors(item: RawSearchItem): string {
  if (item.displayAuthor) {
    return item.displayAuthor;
  }

  return (item.communityArtists ?? [])
    .map((artist) => artist.name)
    .filter((name): name is string => Boolean(name))
    .join(" / ");
}

function normalizeFlags(item: RawSearchItem, locale: Locale): string[] {
  const flags: string[] = [];

  if (item.finished) {
    flags.push(t(locale, "완결", "Finished"));
  }
  if (item.rest) {
    flags.push(t(locale, "휴재", "On Break"));
  }
  if (item.up) {
    flags.push(t(locale, "UP", "Up"));
  }
  if (item.new) {
    flags.push(t(locale, "신작", "New"));
  }
  if (item.bm) {
    flags.push(t(locale, "유료", "Paid"));
  }

  return flags;
}

function normalizePublish(item: RawSearchItem, locale: Locale): string {
  if (item.publishDescription) {
    return item.publishDescription;
  }

  if (item.finished) {
    return t(locale, "완결", "Finished");
  }

  return t(locale, "미지정", "Unspecified");
}

function normalizeBucket(
  bucket: RawSearchBucket | undefined,
  source: Exclude<NaverSearchSource, "all">,
  locale: Locale,
): { category: NaverSearchCategory; results: NaverSearchResult[] } {
  const labels = sourceLabelMap(locale);
  const items = bucket?.searchViewList ?? [];

  return {
    category: {
      key: source,
      label: labels[source],
      totalCount: bucket?.totalCount ?? items.length,
    },
    results: items.map((item) => ({
      id: String(item.titleId ?? item.contentId ?? item.titleName ?? Math.random()),
      titleId: typeof item.titleId === "number" ? item.titleId : null,
      source,
      sourceLabel: labels[source],
      title: item.titleName ?? "",
      thumbnailUrl: item.thumbnailUrl ?? "",
      authors: normalizeAuthors(item),
      synopsis: item.synopsis ?? "",
      publish: normalizePublish(item, locale),
      episodes: item.articleTotalCount ?? 0,
      lastUpdated: item.lastArticleServiceDate ?? "",
      genres: [
        ...new Set(
          (item.genreList ?? [])
            .map((genre) => genre.description)
            .filter((value): value is string => Boolean(value)),
        ),
      ],
      tags: [
        ...new Set(
          (item.tagList ?? [])
            .map((tag) => tag.tagName)
            .filter((value): value is string => Boolean(value)),
        ),
      ],
      flags: normalizeFlags(item, locale),
      isAdult: Boolean(item.adult || item.nineteen),
    })),
  };
}

export async function searchNaverWebtoons(
  query: string,
  locale: Locale,
  source: NaverSearchSource = "all",
): Promise<NaverSearchPayload> {
  const trimmed = query.trim();

  if (!trimmed) {
    return {
      categories: [],
      results: [],
      totalCount: 0,
    };
  }

  const data = await fetchNaverJson<RawSearchResponse>(
    `https://comic.naver.com/api/search/all?keyword=${encodeURIComponent(trimmed)}`,
  );
  const buckets = [normalizeBucket(data.searchWebtoonResult, "webtoon", locale)];

  const visibleBuckets =
    source === "all"
      ? buckets
      : buckets.filter((bucket) => bucket.category.key === source);

  return {
    categories: buckets.map((bucket) => bucket.category),
    results: visibleBuckets.flatMap((bucket) => bucket.results),
    totalCount: visibleBuckets.reduce(
      (count, bucket) => count + bucket.category.totalCount,
      0,
    ),
  };
}
