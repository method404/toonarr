import { AdminShell } from "@/app/_components/admin-shell";
import { FinishedFreeBrowser } from "@/app/series/_components/finished-free-browser";
import { getAppSettings } from "@/lib/app-settings";
import { getStoredSeriesSummaries } from "@/lib/library-store";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import {
  getNaverFinishedFreePage,
  type FinishedFreeOrder,
} from "@/lib/naver-finished-free";

type SeriesFinishedFreePageProps = {
  searchParams: Promise<{
    order?: string;
  }>;
};

function isFinishedFreeOrder(value: string | undefined): value is FinishedFreeOrder {
  return value === "USER" || value === "UPDATE" || value === "STARSCORE";
}

export default async function SeriesFinishedFreePage(
  props: SeriesFinishedFreePageProps,
) {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const searchParams = await props.searchParams;
  const order = isFinishedFreeOrder(searchParams.order) ? searchParams.order : "USER";

  const [initialPage, storedSeries, settings] = await Promise.all([
    getNaverFinishedFreePage(locale, order, 1, 25),
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
    empty:
      locale === "ko"
        ? "표시할 완결 무료 웹툰이 없습니다."
        : "No finished free webtoons found.",
    emptyDescription:
      locale === "ko" ? "작품 설명이 없습니다." : "No description available.",
    loading: locale === "ko" ? "불러오는 중..." : "Loading...",
    end:
      locale === "ko"
        ? "마지막 항목까지 불러왔습니다."
        : "You've reached the end.",
  };

  const filterItems: Array<{ key: FinishedFreeOrder; label: string }> = [
    { key: "USER", label: labels.user },
    { key: "UPDATE", label: labels.update },
    { key: "STARSCORE", label: labels.starScore },
  ];

  return (
    <AdminShell
      locale={locale}
      activePath="/series/finished-free"
      title={dict.common.finishedFree}
      hideHeader
      mainClassName="compact-shell"
    >
      <FinishedFreeBrowser
        key={order}
        apiPath="/api/series/finished-free"
        basePath="/series/finished-free"
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
