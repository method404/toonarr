import { AdminShell } from "@/app/_components/admin-shell";
import { WeekdaySeriesBrowser } from "@/app/series/_components/weekday-series-browser";
import { getAppSettings } from "@/lib/app-settings";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import {
  getNaverWeekdaySections,
  type WeekdayOrder,
} from "@/lib/naver-weekday";

type SeriesWeekdayPageProps = {
  searchParams: Promise<{
    order?: string;
  }>;
};

function isWeekdayOrder(value: string | undefined): value is WeekdayOrder {
  return value === "user" || value === "view" || value === "star";
}

export default async function SeriesWeekdayPage(
  props: SeriesWeekdayPageProps,
) {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const searchParams = await props.searchParams;
  const order = isWeekdayOrder(searchParams.order) ? searchParams.order : "user";
  const [weekdaySections, settings] = await Promise.all([
    getNaverWeekdaySections(locale, order),
    getAppSettings(),
  ]);

  const labels = {
    filters: locale === "ko" ? "정렬" : "Sort",
    user: locale === "ko" ? "인기순" : "Popular",
    view: locale === "ko" ? "조회순" : "Views",
    star: locale === "ko" ? "별점순" : "Rating",
  };

  const filterItems: Array<{ key: WeekdayOrder; label: string }> = [
    { key: "user", label: labels.user },
    { key: "view", label: labels.view },
    { key: "star", label: labels.star },
  ];

  return (
    <AdminShell
      locale={locale}
      activePath="/series/weekday"
      title={dict.common.weekday}
      hideHeader
      mainClassName="compact-shell"
    >
      <WeekdaySeriesBrowser
        filterItems={filterItems}
        labels={{ filters: labels.filters }}
        locale={locale}
        order={order}
        sections={weekdaySections}
        defaultRootFolder={settings.library.defaultRootFolder}
        defaultMonitorMode={settings.library.defaultMonitorMode}
      />
    </AdminShell>
  );
}
