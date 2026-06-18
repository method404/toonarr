import { AdminShell } from "@/app/_components/admin-shell";
import { FinishedFreeBrowser } from "@/app/series/_components/finished-free-browser";
import { getAppSettings } from "@/lib/app-settings";
import { getStoredSeriesSummaries } from "@/lib/library-store";
import { getLocale } from "@/lib/locale";
import { getNaverCurationPage, type CurationOrder } from "@/lib/naver-curation";
import { notFound } from "next/navigation";

type SeriesCurationPageProps = {
  searchParams: Promise<{
    type?: string;
    id?: string;
    label?: string;
    order?: string;
  }>;
};

function isCurationOrder(value: string | undefined): value is CurationOrder {
  return value === "USER" || value === "UPDATE" || value === "STARSCORE";
}

export default async function SeriesCurationPage(
  props: SeriesCurationPageProps,
) {
  const locale = await getLocale();
  const searchParams = await props.searchParams;
  const type = searchParams.type?.trim() ?? "";
  const id = Number(searchParams.id ?? "0");
  const label = searchParams.label?.trim() ?? "";
  const order = isCurationOrder(searchParams.order) ? searchParams.order : "USER";

  if (!type || !Number.isInteger(id) || id <= 0) {
    notFound();
  }

  const [initialPage, storedSeries, settings] = await Promise.all([
    getNaverCurationPage(locale, {
      type,
      id,
      order,
      page: 1,
      pageSize: 25,
      fallbackTitle: label || undefined,
    }),
    getStoredSeriesSummaries(),
    getAppSettings(),
  ]);

  const storedSeriesByTitleId = Object.fromEntries(
    storedSeries.map((item) => [String(item.titleId), item.slug]),
  );

  const labels = {
    filters: locale === "ko" ? "정렬" : "Sort",
    user: locale === "ko" ? "인기순" : "Popular",
    update: locale === "ko" ? "업데이트순" : "Updated",
    starScore: locale === "ko" ? "별점순" : "Rating",
    episodes: locale === "ko" ? "회차" : "Episodes",
    updated: locale === "ko" ? "업데이트" : "Updated",
    empty: locale === "ko" ? "표시할 작품이 없습니다." : "No titles found.",
    emptyDescription:
      locale === "ko" ? "작품 설명이 없습니다." : "No description available.",
    loading: locale === "ko" ? "불러오는 중..." : "Loading...",
    end:
      locale === "ko"
        ? "마지막 항목까지 불러왔습니다."
        : "You've reached the end.",
  };

  const filterItems: Array<{ key: CurationOrder; label: string }> = [
    { key: "USER", label: labels.user },
    { key: "UPDATE", label: labels.update },
    { key: "STARSCORE", label: labels.starScore },
  ];

  const queryBase = `type=${encodeURIComponent(type)}&id=${id}&label=${encodeURIComponent(label)}`;

  return (
    <AdminShell
      locale={locale}
      activePath="/series/curation"
      title={initialPage.title}
      hideHeader
      mainClassName="compact-shell"
    >
      <FinishedFreeBrowser
        key={`${type}:${id}:${order}`}
        apiPath={`/api/series/curation?${queryBase}`}
        basePath={`/series/curation?${queryBase}`}
        filterItems={filterItems}
        initialItems={initialPage.items}
        initialHasMore={initialPage.hasMore}
        initialPage={initialPage.page}
        labels={{
          filters: labels.filters,
          episodes: labels.episodes,
          updated: labels.updated,
          empty: labels.empty,
          emptyDescription: labels.emptyDescription,
          loading: labels.loading,
          end: labels.end,
        }}
        locale={locale}
        order={order}
        storedSeriesByTitleId={storedSeriesByTitleId}
        defaultRootFolder={settings.library.defaultRootFolder}
        defaultMonitorMode={settings.library.defaultMonitorMode}
      />
    </AdminShell>
  );
}
