import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Locale } from "@/lib/locale";
import { fetchNaverJson } from "@/lib/naver-request";

type RawWeekdayItem = {
  titleId?: number;
  titleName?: string;
  author?: string;
  thumbnailUrl?: string;
  starScore?: number;
  up?: boolean;
  rest?: boolean;
  bm?: boolean;
  adult?: boolean;
  finish?: boolean;
  new?: boolean;
};

type RawWeekdayResponse = {
  titleListMap?: Partial<Record<WeekdayKey, RawWeekdayItem[]>>;
};

export type WeekdayKey =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

export type WeekdayOrder = "user" | "view" | "star";

export type WeekdaySeriesItem = {
  id: string;
  titleId: number | null;
  title: string;
  author: string;
  thumbnailUrl: string;
  starScore: string;
  flags: string[];
  isAdult: boolean;
};

export type WeekdaySection = {
  key: WeekdayKey;
  label: string;
  items: WeekdaySeriesItem[];
};

const weekdayOrder: WeekdayKey[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

const weekdayCachePromises = new Map<WeekdayOrder, Promise<RawWeekdayResponse>>();

function getDataRoot() {
  return path.join(process.cwd(), "data");
}

function getWeekdayCachePath(order: WeekdayOrder) {
  return path.join(getDataRoot(), "cache", "naver", `weekday-${order}.json`);
}

function getLocalDayKey(now: Date = new Date()) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function readWeekdayCache(order: WeekdayOrder) {
  try {
    const raw = await readFile(getWeekdayCachePath(order), "utf8");
    const parsed = JSON.parse(raw) as {
      dayKey?: string;
      data?: RawWeekdayResponse;
    };

    if (parsed.dayKey === getLocalDayKey() && parsed.data) {
      return parsed.data;
    }
  } catch {
    // ignore cache miss
  }

  return null;
}

async function writeWeekdayCache(order: WeekdayOrder, data: RawWeekdayResponse) {
  const cachePath = getWeekdayCachePath(order);
  await mkdir(path.dirname(cachePath), { recursive: true });
  await writeFile(
    cachePath,
    `${JSON.stringify({ dayKey: getLocalDayKey(), data }, null, 2)}\n`,
    "utf8",
  );
}

async function fetchWeekdayResponse(order: WeekdayOrder) {
  const cached = await readWeekdayCache(order);

  if (cached) {
    return cached;
  }

  const inFlight = weekdayCachePromises.get(order);

  if (inFlight) {
    return inFlight;
  }

  const request = (async () => {
    const data = await fetchNaverJson<RawWeekdayResponse>(
      `https://comic.naver.com/api/webtoon/titlelist/weekday?order=${order}`,
    );
    await writeWeekdayCache(order, data);
    return data;
  })();

  weekdayCachePromises.set(order, request);

  try {
    return await request;
  } finally {
    weekdayCachePromises.delete(order);
  }
}

function t(locale: Locale, ko: string, en: string) {
  return locale === "ko" ? ko : en;
}

function getWeekdayLabel(day: WeekdayKey, locale: Locale) {
  const labels: Record<WeekdayKey, string> = {
    MONDAY: t(locale, "월요일", "Monday"),
    TUESDAY: t(locale, "화요일", "Tuesday"),
    WEDNESDAY: t(locale, "수요일", "Wednesday"),
    THURSDAY: t(locale, "목요일", "Thursday"),
    FRIDAY: t(locale, "금요일", "Friday"),
    SATURDAY: t(locale, "토요일", "Saturday"),
    SUNDAY: t(locale, "일요일", "Sunday"),
  };

  return labels[day];
}

function normalizeFlags(item: RawWeekdayItem, locale: Locale) {
  const flags: string[] = [];

  if (item.finish) {
    flags.push(t(locale, "완결", "Finished"));
  }
  if (item.bm) {
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
  if (item.adult) {
    flags.push(t(locale, "성인", "Adult"));
  }

  return flags;
}

export async function getNaverWeekdaySections(
  locale: Locale,
  order: WeekdayOrder = "user",
): Promise<WeekdaySection[]> {
  const data = await fetchWeekdayResponse(order);

  return weekdayOrder.map((day) => ({
    key: day,
    label: getWeekdayLabel(day, locale),
    items: (data.titleListMap?.[day] ?? []).map((item) => ({
      id: String(item.titleId ?? item.titleName ?? Math.random()),
      titleId: typeof item.titleId === "number" ? item.titleId : null,
      title: item.titleName ?? "",
      author: item.author ?? "",
      thumbnailUrl: item.thumbnailUrl ?? "",
      starScore:
        typeof item.starScore === "number" ? item.starScore.toFixed(2) : "-",
      flags: normalizeFlags(item, locale),
      isAdult: Boolean(item.adult),
    })),
  }));
}
