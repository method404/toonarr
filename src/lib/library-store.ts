import { access, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  extractEpisodeImageUrlsFromDetailHtml,
  fetchNaverSeriesSnapshot,
  type NaverRelatedTitle,
  type NaverSeriesEpisode,
  type NaverSeriesMetadata,
  type NaverSeriesSnapshot,
} from "@/lib/naver-series";
import { fetchNaver } from "@/lib/naver-request";
import type { ActivityTask, JobRun, MonitorMode, SeriesRecord } from "@/lib/types";

type LibrarySeriesEntry = {
  id: string;
  titleId: number;
  sourceName: string;
  title: string;
  authors: string;
  status: "monitoring" | "paused";
  monitored: boolean;
  monitorMode: MonitorMode;
  checkIntervalHours: number;
  tags: string[];
  episodes: number;
  downloadedEpisodes: number;
  storagePath: string;
  rootFolder: string;
  posterThumbnailUrl: string;
  nextCheck: string;
  lastSeen: string;
  sizeOnDisk: string;
  isFinished: boolean;
  isOnBreak: boolean;
  isDailyPass: boolean;
  isAdult: boolean;
  publishDescription: string;
  addedAt: string;
  updatedAt: string;
};

type LibraryIndex = {
  items: LibrarySeriesEntry[];
};

type AddSeriesInput = {
  titleId: number;
  rootFolder: string;
  monitorMode: MonitorMode;
};

export type StoredSeriesSummary = {
  id: string;
  titleId: number;
  slug: string;
  title: string;
  authors: string;
  posterThumbnailUrl: string;
  sourceName: string;
  monitored: boolean;
  monitorMode: MonitorMode;
  checkIntervalHours: number;
  totalEpisodes: number;
  availableEpisodes: number;
  downloadedEpisodes: number;
  missingEpisodes: number;
  hasActiveDownload: boolean;
  storagePath: string;
  nextCheck: string;
  lastSeen: string;
  sizeOnDisk: string;
  tags: string[];
  isFinished: boolean;
  isOnBreak: boolean;
  isDailyPass: boolean;
  isAdult: boolean;
  publishDescription: string;
  addedAt: string;
  updatedAt: string;
};

export type StoredSeriesDetail = {
  summary: StoredSeriesSummary;
  metadata: NaverSeriesMetadata | null;
  episodes: NaverSeriesEpisode[];
  paidEpisodes: NaverSeriesEpisode[];
  relatedTitles: NaverRelatedTitle[];
  episodeArchives: Record<number, StoredEpisodeArchiveManifest | null>;
};

export type StoredEpisodeArchiveManifest = {
  titleId: number;
  no: number;
  subtitle: string;
  volumeNo: number | null;
  availability: {
    serviceDateDescription: string;
    airDate: string | null;
    isPaid: boolean;
    thumbnailClock: boolean;
    thumbnailLock: boolean;
  };
  stats: {
    starScore: number | null;
    hasBgm: boolean;
    hasReadLog: boolean;
    isUp: boolean;
  };
  network: {
    detailUrl: string;
    activityCountUrl: string;
    userActionUrl: string;
    commentPageId: string;
    imageReferer: string;
    detailImageSelector: string;
    imageDownloadHeaders: {
      referer: string;
    };
  };
  assets: {
    thumbnailUrl: string;
    thumbnailCachePath: string;
    imagesDir: string;
    imageFilePattern: string;
  };
  storage: {
    seriesPath: string;
    episodePath: string;
    manifestPath: string;
    thumbnailPath: string;
    imagesDir: string;
    detailHtmlPath: string;
    activityPath: string;
    userActionPath: string;
  };
  raw: {
    detailHtmlPath: string;
    activityPath: string;
    userActionPath: string;
  };
  crawl: {
    status: "pending" | "downloading" | "preview" | "downloaded" | "failed";
    reason: string;
    imageCount: number;
    downloadedImageCount: number;
    downloadedAt: string | null;
    errorMessage: string | null;
  };
  updatedAt: string;
};

type UpdateSeriesSettingsInput = {
  titleId: number;
  checkIntervalHours: number;
};

type SeriesStorageSyncTask = {
  snapshot: NaverSeriesSnapshot;
  rootFolder: string;
  monitorMode: MonitorMode;
  enqueuedAt: string;
  trigger: "series-add" | "series-refresh";
};

type SeriesStorageSyncActiveRun = {
  task: SeriesStorageSyncTask;
  startedAt: string;
};

const DEFAULT_LIBRARY_ROOT_FOLDER = "./storage/webtoons";

declare global {
  var __naverrrStorageSyncQueue: SeriesStorageSyncTask[] | undefined;
  var __naverrrStorageSyncRunning: boolean | undefined;
  var __naverrrStorageSyncCurrentRun: SeriesStorageSyncActiveRun | undefined;
  var __naverrrStorageSyncRecentJobs: JobRun[] | undefined;
}

function getDataRoot() {
  return path.join(process.cwd(), "data");
}

function getLibraryRoot() {
  return path.join(getDataRoot(), "library");
}

function getNaverSeriesDir(titleId: number) {
  return path.join(getDataRoot(), "sources", "naver", "series", String(titleId));
}

function getLibraryIndexPath() {
  return path.join(getLibraryRoot(), "series.json");
}

function getSeriesMetadataPath(titleId: number) {
  return path.join(getNaverSeriesDir(titleId), "series.json");
}

function getSeriesEpisodesPath(titleId: number) {
  return path.join(getNaverSeriesDir(titleId), "episodes.json");
}

function getSeriesPaidEpisodesPath(titleId: number) {
  return path.join(getNaverSeriesDir(titleId), "paid-episodes.json");
}

function getSeriesRelatedTitlesPath(titleId: number) {
  return path.join(getNaverSeriesDir(titleId), "related-titles.json");
}

function getSeriesEpisodeArchiveDir(titleId: number, no: number) {
  return path.join(getNaverSeriesDir(titleId), "episodes", String(no));
}

function getSeriesEpisodeManifestPath(titleId: number, no: number) {
  return path.join(getSeriesEpisodeArchiveDir(titleId, no), "episode.json");
}

function getStorageSeriesMetadataPath(storagePath: string) {
  return path.join(storagePath, "series.json");
}

function getStoragePosterPath(storagePath: string) {
  return path.join(storagePath, "poster.jpg");
}

function getStorageTitleThumbnailPath(storagePath: string) {
  return path.join(storagePath, "title.jpg");
}

function getStorageSharedThumbnailPath(storagePath: string) {
  return path.join(storagePath, "shared.jpg");
}

function getStorageRelatedTitlesPath(storagePath: string) {
  return path.join(storagePath, "related-titles.json");
}

function getStorageEpisodesRoot(storagePath: string) {
  return path.join(storagePath, "episodes");
}

function getStorageEpisodeDir(storagePath: string, no: number) {
  return path.join(getStorageEpisodesRoot(storagePath), String(no));
}

function getStorageEpisodeManifestPath(storagePath: string, no: number) {
  return path.join(getStorageEpisodeDir(storagePath, no), "episode.json");
}

function getStorageEpisodeThumbnailPath(storagePath: string, no: number) {
  return path.join(getStorageEpisodeDir(storagePath, no), "thumbnail.jpg");
}

function getStorageEpisodeImagesDir(storagePath: string, no: number) {
  return path.join(getStorageEpisodeDir(storagePath, no), "images");
}

function getStorageEpisodeDetailPath(storagePath: string, no: number) {
  return path.join(getStorageEpisodeDir(storagePath, no), "detail.html");
}

function getStorageEpisodeActivityPath(storagePath: string, no: number) {
  return path.join(getStorageEpisodeDir(storagePath, no), "activity.json");
}

function getStorageEpisodeUserActionPath(storagePath: string, no: number) {
  return path.join(getStorageEpisodeDir(storagePath, no), "user-action.json");
}

function buildStoragePath(rootFolder: string, title: string, titleId: number) {
  const folderName = `${title} (${titleId})`;
  return path.posix.join(rootFolder, folderName);
}

async function resolveRootFolder(rootFolder: string) {
  try {
    await ensureDir(rootFolder);
    return rootFolder;
  } catch (error) {
    if (rootFolder.startsWith("/data/") || rootFolder === "/data") {
      const relativeRoot = path.relative("/data", rootFolder);
      const fallbackRoot = path.join(process.cwd(), "storage", relativeRoot);
      await ensureDir(fallbackRoot);
      return fallbackRoot;
    }

    throw error;
  }
}

function clampCheckIntervalHours(value: number) {
  const allowed = [1, 6, 12, 24];
  return allowed.includes(value) ? value : 6;
}

export function getSeriesRefreshIntervalMinutes() {
  const rawValue = Number(process.env.NAVERRR_REFRESH_INTERVAL_MINUTES ?? 1440);

  if (!Number.isFinite(rawValue) || rawValue <= 0) {
    return 1440;
  }

  return Math.max(1, Math.floor(rawValue));
}

function getSeriesCheckHourLocal() {
  const rawValue = Number(process.env.NAVERRR_CHECK_HOUR_LOCAL ?? 23);

  if (!Number.isFinite(rawValue)) {
    return 23;
  }

  return Math.min(23, Math.max(0, Math.floor(rawValue)));
}

function getSeriesCheckMinuteLocal() {
  const rawValue = Number(process.env.NAVERRR_CHECK_MINUTE_LOCAL ?? 50);

  if (!Number.isFinite(rawValue)) {
    return 50;
  }

  return Math.min(59, Math.max(0, Math.floor(rawValue)));
}

function mapPublishDayToWeekday(day: string) {
  const weekdayMap: Record<string, number> = {
    SUNDAY: 0,
    MONDAY: 1,
    TUESDAY: 2,
    WEDNESDAY: 3,
    THURSDAY: 4,
    FRIDAY: 5,
    SATURDAY: 6,
  };

  return weekdayMap[day] ?? null;
}

function buildScheduledCheckDate(baseDate: Date) {
  const next = new Date(baseDate);
  next.setHours(getSeriesCheckHourLocal(), getSeriesCheckMinuteLocal(), 0, 0);
  return next;
}

function getNextPreviewAirDate(snapshot: NaverSeriesSnapshot, now: Date = new Date()) {
  return snapshot.paidEpisodes
    .map((episode) => episode.serviceDate)
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(`${value}T12:00:00`))
    .filter((value) => !Number.isNaN(value.getTime()) && value.getTime() > now.getTime())
    .sort((left, right) => left.getTime() - right.getTime())[0] ?? null;
}

function computeNextCheck(
  checkIntervalHours: number,
  publishDays?: string[],
  isFinished?: boolean,
  nextPreviewAirDate?: Date | null,
  now: Date = new Date(),
) {
  if (isFinished) {
    return "-";
  }

  if (nextPreviewAirDate) {
    const previewCheckDate = buildScheduledCheckDate(nextPreviewAirDate);

    if (previewCheckDate.getTime() > now.getTime()) {
      return previewCheckDate.toISOString();
    }
  }

  const targetWeekdays = (publishDays ?? [])
    .map((day) => mapPublishDayToWeekday(day))
    .filter((value): value is number => value !== null);

  if (targetWeekdays.length > 0) {
    for (let offset = 0; offset <= 7; offset += 1) {
      const candidateBase = new Date(now);
      candidateBase.setDate(now.getDate() + offset);
      const publishDate = new Date(candidateBase);
      publishDate.setHours(12, 0, 0, 0);

      if (targetWeekdays.includes(publishDate.getDay())) {
        const candidate = buildScheduledCheckDate(publishDate);
        candidate.setDate(candidate.getDate() - 1);

        if (candidate.getTime() > now.getTime()) {
          return candidate.toISOString();
        }
      }
    }
  }

  const fallback = buildScheduledCheckDate(now);

  if (fallback.getTime() <= now.getTime()) {
    fallback.setDate(fallback.getDate() + Math.max(1, Math.ceil(checkIntervalHours / 24)));
  }

  return fallback.toISOString();
}

function isRefreshDue(nextCheck: string, now: Date = new Date()) {
  if (!nextCheck || nextCheck === "-") {
    return false;
  }

  const parsed = new Date(nextCheck);

  if (Number.isNaN(parsed.getTime())) {
    return true;
  }

  return parsed.getTime() <= now.getTime();
}

function mergeUniqueEpisodes(
  episodes: NaverSeriesEpisode[],
  paidEpisodes: NaverSeriesEpisode[],
) {
  const byNo = new Map<number, NaverSeriesEpisode>();

  for (const episode of [...episodes, ...paidEpisodes]) {
    byNo.set(episode.no, episode);
  }

  return [...byNo.values()].sort((left, right) => right.no - left.no);
}

function buildEpisodeArchiveManifest(
  storagePath: string,
  titleId: number,
  episode: NaverSeriesEpisode,
  overrides?: Partial<StoredEpisodeArchiveManifest["crawl"]> & {
    imageCount?: number;
    downloadedImageCount?: number;
  },
): StoredEpisodeArchiveManifest {
  const episodeRoot = `sources/naver/series/${titleId}/episodes/${episode.no}`;
  const imageRoot = `cache/naver/series/${titleId}/episodes/${episode.no}/images`;
  const storageEpisodePath = getStorageEpisodeDir(storagePath, episode.no);
  const defaultStatus = episode.isPaid ? "preview" : "pending";
  const defaultReason = episode.isPaid ? "paid-preview" : "detail-html-required";

  return {
    titleId,
    no: episode.no,
    subtitle: episode.subtitle,
    volumeNo: episode.volumeNo,
    availability: {
      serviceDateDescription: episode.serviceDateDescription,
      airDate: episode.serviceDate,
      isPaid: episode.isPaid,
      thumbnailClock: episode.thumbnailClock,
      thumbnailLock: episode.thumbnailLock,
    },
    stats: {
      starScore: episode.starScore,
      hasBgm: episode.hasBgm,
      hasReadLog: episode.hasReadLog,
      isUp: episode.isUp,
    },
    network: {
      detailUrl: episode.detailUrl,
      activityCountUrl: episode.activityCountUrl,
      userActionUrl: episode.userActionUrl,
      commentPageId: episode.commentPageId,
      imageReferer: episode.imageReferer,
      detailImageSelector: "img[id^='content_image_']",
      imageDownloadHeaders: {
        referer: episode.imageReferer,
      },
    },
    assets: {
      thumbnailUrl: episode.thumbnailUrl,
      thumbnailCachePath: episode.thumbnailCachePath,
      imagesDir: imageRoot,
      imageFilePattern: `${imageRoot}/{index}.jpg`,
    },
    storage: {
      seriesPath: storagePath,
      episodePath: storageEpisodePath,
      manifestPath: getStorageEpisodeManifestPath(storagePath, episode.no),
      thumbnailPath: getStorageEpisodeThumbnailPath(storagePath, episode.no),
      imagesDir: getStorageEpisodeImagesDir(storagePath, episode.no),
      detailHtmlPath: getStorageEpisodeDetailPath(storagePath, episode.no),
      activityPath: getStorageEpisodeActivityPath(storagePath, episode.no),
      userActionPath: getStorageEpisodeUserActionPath(storagePath, episode.no),
    },
    raw: {
      detailHtmlPath: `${episodeRoot}/detail.html`,
      activityPath: `${episodeRoot}/activity.json`,
      userActionPath: `${episodeRoot}/user-action.json`,
    },
    crawl: {
      status: overrides?.status ?? defaultStatus,
      reason: overrides?.reason ?? defaultReason,
      imageCount: overrides?.imageCount ?? 0,
      downloadedImageCount: overrides?.downloadedImageCount ?? 0,
      downloadedAt: overrides?.downloadedAt ?? null,
      errorMessage: overrides?.errorMessage ?? null,
    },
    updatedAt: new Date().toISOString(),
  };
}

function slugifyTitle(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "series";
}

export function buildSeriesSlug(title: string, titleId: number) {
  return `${slugifyTitle(title)}-${titleId}`;
}

export function extractTitleIdFromSlug(slug: string) {
  const match = slug.match(/-(\d+)$/);
  if (!match) {
    return null;
  }

  const titleId = Number(match[1]);
  return Number.isInteger(titleId) ? titleId : null;
}

async function ensureDir(dirPath: string) {
  await mkdir(dirPath, { recursive: true });
}

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJsonFile(filePath: string, value: unknown) {
  await ensureDir(path.dirname(filePath));
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function writeTextFile(filePath: string, value: string) {
  await ensureDir(path.dirname(filePath));
  await writeFile(filePath, value, "utf8");
}

async function pathExists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function listFilesSafe(dirPath: string) {
  try {
    return await readdir(dirPath, { withFileTypes: true });
  } catch {
    return [];
  }
}

function getNetworkRetryAttempts() {
  const rawValue = Number(process.env.NAVERRR_NETWORK_RETRY_ATTEMPTS ?? 3);

  if (!Number.isFinite(rawValue) || rawValue < 1) {
    return 3;
  }

  return Math.min(5, Math.floor(rawValue));
}

function getNetworkRetryDelayMs() {
  const rawValue = Number(process.env.NAVERRR_NETWORK_RETRY_DELAY_MS ?? 800);

  if (!Number.isFinite(rawValue) || rawValue < 0) {
    return 800;
  }

  return Math.min(5_000, Math.floor(rawValue));
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableNetworkError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();

  if (
    message.includes("fetch failed") ||
    message.includes("econnreset") ||
    message.includes("etimedout") ||
    message.includes("socket hang up") ||
    message.includes("network") ||
    message.includes("timeout")
  ) {
    return true;
  }

  const statusMatch = message.match(/\b(408|409|425|429|500|502|503|504)\b/);
  return Boolean(statusMatch);
}

async function withNetworkRetry<T>(
  label: string,
  run: () => Promise<T>,
) {
  const maxAttempts = getNetworkRetryAttempts();
  const baseDelayMs = getNetworkRetryDelayMs();
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await run();
    } catch (error) {
      lastError = error;

      if (attempt >= maxAttempts || !isRetryableNetworkError(error)) {
        throw error;
      }

      const delayMs = baseDelayMs * attempt;
      console.warn(
        `[naverrr] retrying ${label} (${attempt}/${maxAttempts - 1}) in ${delayMs}ms`,
        error,
      );
      await sleep(delayMs);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`Retry failed: ${label}`);
}

async function fetchJsonValue(url: string) {
  return withNetworkRetry(`json ${url}`, async () => {
    const response = await fetchNaver(url, {
      headers: {
        accept: "application/json",
      },
    });

    return response.json() as Promise<unknown>;
  });
}

async function fetchTextValue(url: string) {
  return withNetworkRetry(`html ${url}`, async () => {
    const response = await fetchNaver(url, {
      headers: {
        accept: "text/html,application/xhtml+xml",
      },
    });

    return response.text();
  });
}

async function downloadBinaryFile(
  url: string,
  filePath: string,
  headers?: Record<string, string>,
) {
  if (await pathExists(filePath)) {
    return;
  }

  await withNetworkRetry(`asset ${url}`, async () => {
    const response = await fetchNaver(url, {
      headers,
    });

    const buffer = Buffer.from(await response.arrayBuffer());
    await ensureDir(path.dirname(filePath));
    await writeFile(filePath, buffer);
  });
}

function getImageExtension(url: string) {
  const match = url.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  return match ? match[1].toLowerCase() : "jpg";
}

async function getStoredEpisodeImageCount(storagePath: string, no: number) {
  const files = await listFilesSafe(getStorageEpisodeImagesDir(storagePath, no));
  return files.filter((entry) => entry.isFile()).length;
}

async function buildDownloadedManifestFromDisk(
  titleId: number,
  storagePath: string,
  episode: NaverSeriesEpisode,
  existingManifest: StoredEpisodeArchiveManifest | null,
) {
  const imageCount = await getStoredEpisodeImageCount(storagePath, episode.no);

  return buildEpisodeArchiveManifest(storagePath, titleId, episode, {
    status: "downloaded",
    reason: "stored",
    imageCount,
    downloadedImageCount: imageCount,
    downloadedAt: existingManifest?.crawl.downloadedAt ?? new Date().toISOString(),
    errorMessage: null,
  });
}

async function calculateDirectorySize(targetPath: string): Promise<number> {
  try {
    const entry = await stat(targetPath);

    if (entry.isFile()) {
      return entry.size;
    }

    if (!entry.isDirectory()) {
      return 0;
    }
  } catch {
    return 0;
  }

  const children = await readdir(targetPath, { withFileTypes: true });
  const sizes = await Promise.all(
    children.map((child) =>
      calculateDirectorySize(path.join(targetPath, child.name)),
    ),
  );

  return sizes.reduce((sum, size) => sum + size, 0);
}

function formatBytes(bytes: number) {
  if (bytes <= 0) {
    return "-";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const precision = value >= 100 || unitIndex === 0 ? 0 : 1;
  return `${value.toFixed(precision)} ${units[unitIndex]}`;
}

function normalizeLibraryEntry(entry: Partial<LibrarySeriesEntry>) {
  const titleId = typeof entry.titleId === "number" ? entry.titleId : 0;
  const title = entry.title ?? "";
  const isFinished = entry.isFinished ?? false;
  const monitorMode = isFinished ? "none" : entry.monitorMode ?? "all";
  const checkIntervalHours = clampCheckIntervalHours(entry.checkIntervalHours ?? 6);

  return {
    id: entry.id ?? `naver-${titleId}`,
    titleId,
    sourceName: entry.sourceName ?? "Naver Webtoon",
    title,
    authors: entry.authors ?? "",
    status:
      monitorMode === "none"
        ? "paused"
        : entry.status ?? "monitoring",
    monitored: monitorMode !== "none" ? entry.monitored ?? true : false,
    monitorMode,
    checkIntervalHours,
    tags: entry.tags ?? [],
    episodes: entry.episodes ?? 0,
    downloadedEpisodes: entry.downloadedEpisodes ?? 0,
    storagePath:
      entry.storagePath ??
      buildStoragePath(DEFAULT_LIBRARY_ROOT_FOLDER, title, titleId),
    rootFolder: entry.rootFolder ?? DEFAULT_LIBRARY_ROOT_FOLDER,
    posterThumbnailUrl: entry.posterThumbnailUrl ?? "",
    nextCheck: monitorMode === "none"
      ? "-"
      : entry.nextCheck ?? computeNextCheck(checkIntervalHours),
    lastSeen: entry.lastSeen ?? "-",
    sizeOnDisk: entry.sizeOnDisk ?? "-",
    isFinished,
    isOnBreak: entry.isOnBreak ?? false,
    isDailyPass: entry.isDailyPass ?? false,
    isAdult: entry.isAdult ?? false,
    publishDescription: entry.publishDescription ?? "",
    addedAt: entry.addedAt ?? new Date(0).toISOString(),
    updatedAt: entry.updatedAt ?? new Date(0).toISOString(),
  } satisfies LibrarySeriesEntry;
}

async function readLibraryIndex() {
  const index = await readJsonFile<LibraryIndex>(getLibraryIndexPath(), { items: [] });

  return {
    items: (index.items ?? []).map((entry) => normalizeLibraryEntry(entry)),
  } satisfies LibraryIndex;
}

async function writeLibraryIndex(index: LibraryIndex) {
  await writeJsonFile(getLibraryIndexPath(), index);
}

function toSeriesRecord(entry: LibrarySeriesEntry): SeriesRecord {
  return {
    id: entry.id,
    title: entry.title,
    sourceName: entry.sourceName,
    status: entry.status,
    monitored: entry.monitored,
    tags: entry.tags,
    episodes: entry.episodes,
    qualityProfile: "Naver Webtoon",
    pollCadence: entry.monitorMode,
    storagePath: entry.storagePath,
    lastSeen: entry.lastSeen,
    nextCheck: entry.nextCheck,
    sizeOnDisk: entry.sizeOnDisk,
  };
}

function toStoredSeriesSummary(entry: LibrarySeriesEntry): StoredSeriesSummary {
  return {
    id: entry.id,
    titleId: entry.titleId,
    slug: buildSeriesSlug(entry.title, entry.titleId),
    title: entry.title,
    authors: entry.authors,
    posterThumbnailUrl: entry.posterThumbnailUrl,
    sourceName: entry.sourceName,
    monitored: entry.monitored,
    monitorMode: entry.monitorMode,
    checkIntervalHours: entry.checkIntervalHours,
    totalEpisodes: entry.episodes,
    availableEpisodes: entry.episodes,
    downloadedEpisodes: entry.downloadedEpisodes,
    missingEpisodes: Math.max(entry.episodes - entry.downloadedEpisodes, 0),
    hasActiveDownload: false,
    storagePath: entry.storagePath,
    nextCheck: entry.nextCheck,
    lastSeen: entry.lastSeen,
    sizeOnDisk: entry.sizeOnDisk,
    tags: entry.tags,
    isFinished: entry.isFinished,
    isOnBreak: entry.isOnBreak,
    isDailyPass: entry.isDailyPass,
    isAdult: entry.isAdult,
    publishDescription: entry.publishDescription,
    addedAt: entry.addedAt,
    updatedAt: entry.updatedAt,
  };
}

async function readEpisodeArchiveManifest(
  titleId: number,
  no: number,
): Promise<StoredEpisodeArchiveManifest | null> {
  const filePath = getSeriesEpisodeManifestPath(titleId, no);

  if (!(await pathExists(filePath))) {
    return null;
  }

  const manifest = await readJsonFile<StoredEpisodeArchiveManifest | null>(filePath, null);

  if (!manifest) {
    return null;
  }

  if (
    manifest.crawl.status === "downloaded" ||
    manifest.crawl.status === "preview"
  ) {
    return manifest;
  }

  const imageFiles = await listFilesSafe(manifest.storage.imagesDir);
  const imageCount = imageFiles.filter((entry) => entry.isFile()).length;
  const hasCompletedStorage =
    imageCount > 0 &&
    (await pathExists(manifest.storage.detailHtmlPath)) &&
    (await pathExists(manifest.storage.activityPath)) &&
    (await pathExists(manifest.storage.userActionPath)) &&
    (await pathExists(manifest.storage.thumbnailPath));

  if (!hasCompletedStorage) {
    return manifest;
  }

  const repairedManifest: StoredEpisodeArchiveManifest = {
    ...manifest,
    crawl: {
      ...manifest.crawl,
      status: "downloaded",
      reason: "stored",
      imageCount,
      downloadedImageCount: imageCount,
      downloadedAt: manifest.crawl.downloadedAt ?? new Date().toISOString(),
      errorMessage: null,
    },
    updatedAt: new Date().toISOString(),
  };

  await Promise.all([
    writeJsonFile(filePath, repairedManifest),
    writeJsonFile(manifest.storage.manifestPath, repairedManifest),
  ]);

  return repairedManifest;
}

function mergeSummaryWithMetadata(
  summary: StoredSeriesSummary,
  metadata: NaverSeriesMetadata | null,
) {
  if (!metadata) {
    return summary;
  }

  return {
    ...summary,
    title: metadata.title || summary.title,
    authors: metadata.authors || summary.authors,
    posterThumbnailUrl:
      metadata.posterThumbnailUrl ||
      metadata.titleThumbnailUrl ||
      summary.posterThumbnailUrl,
    tags: metadata.tags.length ? metadata.tags : summary.tags,
    isFinished: metadata.isFinished,
    isOnBreak: metadata.isOnBreak,
    isDailyPass: metadata.isDailyPass,
    isAdult: metadata.isAdult,
    publishDescription: metadata.publishDescription || summary.publishDescription,
    updatedAt: metadata.updatedAt || summary.updatedAt,
  } satisfies StoredSeriesSummary;
}

async function writeSeriesCatalogSnapshot(
  snapshot: NaverSeriesSnapshot,
) {
  const seriesDir = getNaverSeriesDir(snapshot.metadata.titleId);
  await ensureDir(seriesDir);

  await Promise.all([
    writeJsonFile(getSeriesMetadataPath(snapshot.metadata.titleId), snapshot.metadata),
    writeJsonFile(getSeriesEpisodesPath(snapshot.metadata.titleId), snapshot.episodes),
    writeJsonFile(
      getSeriesPaidEpisodesPath(snapshot.metadata.titleId),
      snapshot.paidEpisodes,
    ),
    writeJsonFile(
      getSeriesRelatedTitlesPath(snapshot.metadata.titleId),
      snapshot.relatedTitles,
    ),
  ]);
}

async function writeSeriesSnapshot(
  snapshot: NaverSeriesSnapshot,
  storagePath: string,
) {
  const episodes = mergeUniqueEpisodes(snapshot.episodes, snapshot.paidEpisodes);
  const manifests = await Promise.all(
    episodes.map(async (episode) => {
      const existingManifest = await readEpisodeArchiveManifest(
        snapshot.metadata.titleId,
        episode.no,
      );
      const preserveDownloadedState =
        existingManifest?.crawl.status === "downloaded";
      const preservePaidPreviewState =
        existingManifest?.crawl.status === "preview" && episode.isPaid;

      return buildEpisodeArchiveManifest(
        storagePath,
        snapshot.metadata.titleId,
        episode,
        preserveDownloadedState || preservePaidPreviewState
          ? existingManifest.crawl
          : undefined,
      );
    }),
  );

  await Promise.all([
    writeSeriesCatalogSnapshot(snapshot),
    ...manifests.map((manifest) =>
      writeJsonFile(
        getSeriesEpisodeManifestPath(snapshot.metadata.titleId, manifest.no),
        manifest,
      ),
    ),
  ]);
}

async function writeStorageSeriesMetadata(
  snapshot: NaverSeriesSnapshot,
  storagePath: string,
) {
  const titleReferer = `https://comic.naver.com/webtoon/list?titleId=${snapshot.metadata.titleId}`;

  await Promise.all([
    writeJsonFile(getStorageSeriesMetadataPath(storagePath), snapshot.metadata),
    writeJsonFile(getStorageRelatedTitlesPath(storagePath), snapshot.relatedTitles),
  ]);

  const artworkJobs: Array<Promise<void>> = [];

  if (snapshot.metadata.posterThumbnailUrl) {
    artworkJobs.push(
      downloadBinaryFile(
        snapshot.metadata.posterThumbnailUrl,
        getStoragePosterPath(storagePath),
        { referer: titleReferer },
      ),
    );
  }

  if (snapshot.metadata.titleThumbnailUrl) {
    artworkJobs.push(
      downloadBinaryFile(
        snapshot.metadata.titleThumbnailUrl,
        getStorageTitleThumbnailPath(storagePath),
        { referer: titleReferer },
      ),
    );
  }

  if (snapshot.metadata.sharedThumbnailUrl) {
    artworkJobs.push(
      downloadBinaryFile(
        snapshot.metadata.sharedThumbnailUrl,
        getStorageSharedThumbnailPath(storagePath),
        { referer: titleReferer },
      ),
    );
  }

  await Promise.all(artworkJobs);
}

async function syncEpisodeStorage(
  titleId: number,
  storagePath: string,
  episode: NaverSeriesEpisode,
) {
  const existingManifest = await readEpisodeArchiveManifest(titleId, episode.no);
  const storedImageCount = await getStoredEpisodeImageCount(storagePath, episode.no);
  const hasCompletedStorage =
    storedImageCount > 0 &&
    (await pathExists(getStorageEpisodeDetailPath(storagePath, episode.no))) &&
    (await pathExists(getStorageEpisodeActivityPath(storagePath, episode.no))) &&
    (await pathExists(getStorageEpisodeUserActionPath(storagePath, episode.no))) &&
    (await pathExists(getStorageEpisodeThumbnailPath(storagePath, episode.no)));

  if (episode.isPaid) {
    const previewManifest = buildEpisodeArchiveManifest(storagePath, titleId, episode, {
      status: "preview",
      reason: "paid-preview",
      imageCount: 0,
      downloadedImageCount: 0,
      downloadedAt: existingManifest?.crawl.downloadedAt ?? null,
      errorMessage: null,
    });

    await Promise.all([
      writeJsonFile(getSeriesEpisodeManifestPath(titleId, episode.no), previewManifest),
      writeJsonFile(getStorageEpisodeManifestPath(storagePath, episode.no), previewManifest),
    ]);

    return previewManifest;
  }

  if (hasCompletedStorage) {
    const reusedManifest = await buildDownloadedManifestFromDisk(
      titleId,
      storagePath,
      episode,
      existingManifest,
    );

    await Promise.all([
      writeJsonFile(getSeriesEpisodeManifestPath(titleId, episode.no), reusedManifest),
      writeJsonFile(getStorageEpisodeManifestPath(storagePath, episode.no), reusedManifest),
    ]);

    return reusedManifest;
  }

  try {
    const downloadingManifest = buildEpisodeArchiveManifest(storagePath, titleId, episode, {
      status: "downloading",
      reason: "downloading-assets",
      imageCount: existingManifest?.crawl.imageCount ?? 0,
      downloadedImageCount: existingManifest?.crawl.downloadedImageCount ?? 0,
      downloadedAt: existingManifest?.crawl.downloadedAt ?? null,
      errorMessage: null,
    });

    await Promise.all([
      writeJsonFile(getSeriesEpisodeManifestPath(titleId, episode.no), downloadingManifest),
      writeJsonFile(
        getStorageEpisodeManifestPath(storagePath, episode.no),
        downloadingManifest,
      ),
    ]);

    const [detailHtml, activity, userAction] = await Promise.all([
      fetchTextValue(episode.detailUrl),
      fetchJsonValue(episode.activityCountUrl),
      fetchJsonValue(episode.userActionUrl),
    ]);
    const imageUrls = extractEpisodeImageUrlsFromDetailHtml(
      titleId,
      episode.no,
      detailHtml,
    );

    if (!imageUrls.length) {
      throw new Error("No detail images found.");
    }

    await Promise.all([
      writeTextFile(getStorageEpisodeDetailPath(storagePath, episode.no), detailHtml),
      writeJsonFile(getStorageEpisodeActivityPath(storagePath, episode.no), activity),
      writeJsonFile(getStorageEpisodeUserActionPath(storagePath, episode.no), userAction),
      episode.thumbnailUrl
        ? downloadBinaryFile(
            episode.thumbnailUrl,
            getStorageEpisodeThumbnailPath(storagePath, episode.no),
            { referer: episode.imageReferer },
          )
        : Promise.resolve(),
    ]);

    let downloadedImageCount = 0;

    for (const [index, imageUrl] of imageUrls.entries()) {
      const fileName = `${String(index + 1).padStart(3, "0")}.${getImageExtension(imageUrl)}`;
      await downloadBinaryFile(
        imageUrl,
        path.join(getStorageEpisodeImagesDir(storagePath, episode.no), fileName),
        { referer: episode.imageReferer },
      );
      downloadedImageCount += 1;
    }

    const downloadedManifest = buildEpisodeArchiveManifest(
      storagePath,
      titleId,
      episode,
      {
        status: "downloaded",
        reason: "stored",
        imageCount: imageUrls.length,
        downloadedImageCount,
        downloadedAt: new Date().toISOString(),
        errorMessage: null,
      },
    );

    await Promise.all([
      writeJsonFile(getSeriesEpisodeManifestPath(titleId, episode.no), downloadedManifest),
      writeJsonFile(
        getStorageEpisodeManifestPath(storagePath, episode.no),
        downloadedManifest,
      ),
    ]);

    return downloadedManifest;
  } catch (error) {
    const recoveredImageCount = await getStoredEpisodeImageCount(storagePath, episode.no);
    const canRecoverFromDisk =
      recoveredImageCount > 0 &&
      (await pathExists(getStorageEpisodeDetailPath(storagePath, episode.no))) &&
      (await pathExists(getStorageEpisodeActivityPath(storagePath, episode.no))) &&
      (await pathExists(getStorageEpisodeUserActionPath(storagePath, episode.no))) &&
      (await pathExists(getStorageEpisodeThumbnailPath(storagePath, episode.no)));

    if (canRecoverFromDisk) {
      const recoveredManifest = await buildDownloadedManifestFromDisk(
        titleId,
        storagePath,
        episode,
        existingManifest,
      );

      await Promise.all([
        writeJsonFile(getSeriesEpisodeManifestPath(titleId, episode.no), recoveredManifest),
        writeJsonFile(
          getStorageEpisodeManifestPath(storagePath, episode.no),
          recoveredManifest,
        ),
      ]);

      return recoveredManifest;
    }

    const failedManifest = buildEpisodeArchiveManifest(storagePath, titleId, episode, {
      status: "failed",
      reason: "download-error",
      imageCount: 0,
      downloadedImageCount: 0,
      downloadedAt: null,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });

    await Promise.all([
      writeJsonFile(getSeriesEpisodeManifestPath(titleId, episode.no), failedManifest),
      writeJsonFile(getStorageEpisodeManifestPath(storagePath, episode.no), failedManifest),
    ]);

    return failedManifest;
  }
}

async function syncSeriesStorage(
  snapshot: NaverSeriesSnapshot,
  storagePath: string,
) {
  await ensureDir(storagePath);
  await writeStorageSeriesMetadata(snapshot, storagePath);

  const manifests: StoredEpisodeArchiveManifest[] = [];
  const mergedEpisodes = mergeUniqueEpisodes(snapshot.episodes, snapshot.paidEpisodes)
    .sort((left, right) => left.no - right.no);

  for (const episode of mergedEpisodes) {
    const manifest = await syncEpisodeStorage(
      snapshot.metadata.titleId,
      storagePath,
      episode,
    );
    manifests.push(manifest);
  }

  const downloadedEpisodes = manifests.filter(
    (manifest) => manifest.crawl.status === "downloaded",
  ).length;
  const sizeOnDisk = formatBytes(await calculateDirectorySize(storagePath));

  return {
    downloadedEpisodes,
    sizeOnDisk,
  };
}

function getStorageSyncQueue() {
  if (!globalThis.__naverrrStorageSyncQueue) {
    globalThis.__naverrrStorageSyncQueue = [];
  }

  return globalThis.__naverrrStorageSyncQueue;
}

function getStorageSyncRecentJobsState() {
  if (!globalThis.__naverrrStorageSyncRecentJobs) {
    globalThis.__naverrrStorageSyncRecentJobs = [];
  }

  return globalThis.__naverrrStorageSyncRecentJobs;
}

function getStorageSyncQueueLabel(trigger: SeriesStorageSyncTask["trigger"]) {
  return trigger === "series-add" ? "series-add" : "series-refresh";
}

function appendStorageSyncRecentJob(job: JobRun) {
  const jobs = getStorageSyncRecentJobsState();
  jobs.unshift(job);
  globalThis.__naverrrStorageSyncRecentJobs = jobs.slice(0, 12);
}

export function getSeriesStorageSyncActivityTasks(): ActivityTask[] {
  const tasks: ActivityTask[] = [];
  const activeRun = globalThis.__naverrrStorageSyncCurrentRun;

  if (activeRun) {
    tasks.push({
      id: `storage-running-${activeRun.task.snapshot.metadata.titleId}`,
      name: activeRun.task.snapshot.metadata.title,
      sourceName: "Naver Webtoon",
      status: "running",
      queue: getStorageSyncQueueLabel(activeRun.task.trigger),
      startedAt: activeRun.startedAt,
      eta: "-",
    });
  }

  for (const task of getStorageSyncQueue()) {
    tasks.push({
      id: `storage-queued-${task.snapshot.metadata.titleId}`,
      name: task.snapshot.metadata.title,
      sourceName: "Naver Webtoon",
      status: "queued",
      queue: getStorageSyncQueueLabel(task.trigger),
      startedAt: task.enqueuedAt,
      eta: "-",
    });
  }

  return tasks;
}

export function getSeriesStorageSyncRecentJobs() {
  return [...getStorageSyncRecentJobsState()];
}

function enqueueSeriesStorageSync(task: SeriesStorageSyncTask) {
  const queue = getStorageSyncQueue();
  const existingIndex = queue.findIndex(
    (item) => item.snapshot.metadata.titleId === task.snapshot.metadata.titleId,
  );

  if (existingIndex >= 0) {
    queue[existingIndex] = task;
  } else {
    queue.push(task);
  }

  void runSeriesStorageSyncQueue();
}

function removeSeriesStorageSyncTask(titleId: number) {
  const queue = getStorageSyncQueue();
  globalThis.__naverrrStorageSyncQueue = queue.filter(
    (item) => item.snapshot.metadata.titleId !== titleId,
  );
}

async function runSeriesStorageSyncQueue() {
  if (globalThis.__naverrrStorageSyncRunning) {
    return;
  }

  const queue = getStorageSyncQueue();
  const nextTask = queue.shift();

  if (!nextTask) {
    return;
  }

  globalThis.__naverrrStorageSyncRunning = true;
  globalThis.__naverrrStorageSyncCurrentRun = {
    task: nextTask,
    startedAt: new Date().toISOString(),
  };

  try {
    const index = await readLibraryIndex();
    const existing = index.items.find(
      (item) => item.titleId === nextTask.snapshot.metadata.titleId,
    );
    const storagePath = buildStoragePath(
      nextTask.rootFolder,
      nextTask.snapshot.metadata.title,
      nextTask.snapshot.metadata.titleId,
    );
    const storageSync = await syncSeriesStorage(nextTask.snapshot, storagePath);
    const entry = buildLibraryEntry(nextTask.snapshot, {
      rootFolder: nextTask.rootFolder,
      monitorMode: nextTask.monitorMode,
      existing,
      downloadedEpisodes: storageSync.downloadedEpisodes,
      sizeOnDisk: storageSync.sizeOnDisk,
    });

    await writeLibraryEntry(entry);
    appendStorageSyncRecentJob({
      id: `storage-job-${nextTask.snapshot.metadata.titleId}-${Date.now()}`,
      name: nextTask.snapshot.metadata.title,
      trigger: nextTask.trigger,
      status: "success",
      itemsProcessed: 1,
      startedAt: globalThis.__naverrrStorageSyncCurrentRun.startedAt,
      finishedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[naverrr] series storage sync failed", error);
    appendStorageSyncRecentJob({
      id: `storage-job-${nextTask.snapshot.metadata.titleId}-${Date.now()}`,
      name: nextTask.snapshot.metadata.title,
      trigger: nextTask.trigger,
      status: "failed",
      itemsProcessed: 1,
      startedAt: globalThis.__naverrrStorageSyncCurrentRun.startedAt,
      finishedAt: new Date().toISOString(),
    });
  } finally {
    globalThis.__naverrrStorageSyncRunning = false;
    globalThis.__naverrrStorageSyncCurrentRun = undefined;

    if (queue.length > 0) {
      void runSeriesStorageSyncQueue();
    }
  }
}

function buildLibraryEntry(
  snapshot: NaverSeriesSnapshot,
  config: {
    rootFolder: string;
    monitorMode: MonitorMode;
    checkIntervalHours?: number;
    existing?: LibrarySeriesEntry;
    downloadedEpisodes?: number;
    sizeOnDisk?: string;
  },
) {
  const now = new Date().toISOString();
  const existing = config.existing;
  const checkIntervalHours = clampCheckIntervalHours(
    config.checkIntervalHours ?? existing?.checkIntervalHours ?? 6,
  );
  const downloadedEpisodes =
    config.downloadedEpisodes ?? existing?.downloadedEpisodes ?? 0;
  const shouldAutoPauseFinished = snapshot.metadata.isFinished;
  const effectiveMonitorMode = shouldAutoPauseFinished ? "none" : config.monitorMode;
  const nextPreviewAirDate = getNextPreviewAirDate(snapshot);

  return {
    id: `naver-${snapshot.metadata.titleId}`,
    titleId: snapshot.metadata.titleId,
    sourceName: "Naver Webtoon",
    title: snapshot.metadata.title,
    authors: snapshot.metadata.authors,
    status: effectiveMonitorMode === "none" ? "paused" : "monitoring",
    monitored: effectiveMonitorMode !== "none",
    monitorMode: effectiveMonitorMode,
    checkIntervalHours,
    tags: snapshot.metadata.tags,
    episodes: snapshot.episodes.length,
    downloadedEpisodes,
    storagePath: buildStoragePath(
      config.rootFolder,
      snapshot.metadata.title,
      snapshot.metadata.titleId,
    ),
    rootFolder: config.rootFolder,
    posterThumbnailUrl:
      snapshot.metadata.posterThumbnailUrl || snapshot.metadata.titleThumbnailUrl,
    nextCheck:
      effectiveMonitorMode === "none"
        ? "-"
        : computeNextCheck(
            checkIntervalHours,
            snapshot.metadata.publishDays,
            snapshot.metadata.isFinished,
            nextPreviewAirDate,
          ),
    lastSeen: snapshot.episodes[0]?.serviceDateDescription || "-",
    sizeOnDisk: config.sizeOnDisk ?? existing?.sizeOnDisk ?? "-",
    isFinished: snapshot.metadata.isFinished,
    isOnBreak: snapshot.metadata.isOnBreak,
    isDailyPass: snapshot.metadata.isDailyPass,
    isAdult: snapshot.metadata.isAdult,
    publishDescription: snapshot.metadata.publishDescription,
    addedAt: existing?.addedAt ?? now,
    updatedAt: now,
  } satisfies LibrarySeriesEntry;
}

async function writeLibraryEntry(entry: LibrarySeriesEntry) {
  const libraryPath = getLibraryIndexPath();
  const index = await readLibraryIndex();
  const existingIndex = index.items.findIndex((item) => item.titleId === entry.titleId);

  if (existingIndex >= 0) {
    index.items[existingIndex] = entry;
  } else {
    index.items.push(entry);
  }

  await writeJsonFile(libraryPath, index);
}

export async function getStoredSeries(): Promise<SeriesRecord[]> {
  const index = await readLibraryIndex();

  return index.items
    .slice()
    .sort((left, right) => left.title.localeCompare(right.title, "ko"))
    .map(toSeriesRecord);
}

export async function getStoredSeriesSummaries(): Promise<StoredSeriesSummary[]> {
  const index = await readLibraryIndex();
  const summaries = index.items
    .slice()
    .sort((left, right) => left.title.localeCompare(right.title, "ko"))
    .map(toStoredSeriesSummary);

  const metadataList = await Promise.all(
    summaries.map((summary) =>
      readJsonFile<NaverSeriesMetadata | null>(
        getSeriesMetadataPath(summary.titleId),
        null,
      ),
    ),
  );

  const counts = await Promise.all(
    summaries.map(async (summary) => {
      const [episodes, paidEpisodes] = await Promise.all([
        readJsonFile<NaverSeriesEpisode[]>(getSeriesEpisodesPath(summary.titleId), []),
        readJsonFile<NaverSeriesEpisode[]>(
          getSeriesPaidEpisodesPath(summary.titleId),
          [],
        ),
      ]);

      return mergeUniqueEpisodes(episodes, paidEpisodes).length;
    }),
  );

  const downloadCounts = await Promise.all(
    summaries.map(async (summary) => {
      const [episodes, paidEpisodes] = await Promise.all([
        readJsonFile<NaverSeriesEpisode[]>(getSeriesEpisodesPath(summary.titleId), []),
        readJsonFile<NaverSeriesEpisode[]>(
          getSeriesPaidEpisodesPath(summary.titleId),
          [],
        ),
      ]);
      const manifests = await Promise.all(
        mergeUniqueEpisodes(episodes, paidEpisodes).map((episode) =>
          readEpisodeArchiveManifest(summary.titleId, episode.no),
        ),
      );

      return manifests.filter(
        (manifest) => manifest?.crawl.status === "downloaded",
      ).length;
    }),
  );

  const availableCounts = await Promise.all(
    summaries.map(async (summary) => {
      const [episodes, paidEpisodes] = await Promise.all([
        readJsonFile<NaverSeriesEpisode[]>(getSeriesEpisodesPath(summary.titleId), []),
        readJsonFile<NaverSeriesEpisode[]>(
          getSeriesPaidEpisodesPath(summary.titleId),
          [],
        ),
      ]);
      const manifests = await Promise.all(
        mergeUniqueEpisodes(episodes, paidEpisodes).map((episode) =>
          readEpisodeArchiveManifest(summary.titleId, episode.no),
        ),
      );

      return manifests.filter((manifest) => manifest?.crawl.status !== "preview").length;
    }),
  );

  const activeDownloadFlags = await Promise.all(
    summaries.map(async (summary) => {
      const [episodes, paidEpisodes] = await Promise.all([
        readJsonFile<NaverSeriesEpisode[]>(getSeriesEpisodesPath(summary.titleId), []),
        readJsonFile<NaverSeriesEpisode[]>(
          getSeriesPaidEpisodesPath(summary.titleId),
          [],
        ),
      ]);
      const manifests = await Promise.all(
        mergeUniqueEpisodes(episodes, paidEpisodes).map((episode) =>
          readEpisodeArchiveManifest(summary.titleId, episode.no),
        ),
      );

      return manifests.some(
        (manifest) =>
          manifest?.crawl.status === "pending" ||
          manifest?.crawl.status === "downloading",
      );
    }),
  );

  return summaries.map((summary, index) => ({
    ...mergeSummaryWithMetadata(summary, metadataList[index]),
    totalEpisodes: counts[index],
    availableEpisodes: availableCounts[index],
    downloadedEpisodes: downloadCounts[index],
    missingEpisodes: Math.max(availableCounts[index] - downloadCounts[index], 0),
    hasActiveDownload: activeDownloadFlags[index],
  }));
}

export async function getStoredSeriesDetail(
  slug: string,
): Promise<StoredSeriesDetail | null> {
  const titleId = extractTitleIdFromSlug(slug);

  if (titleId === null) {
    return null;
  }

  const index = await readLibraryIndex();
  const entry = index.items.find((item) => item.titleId === titleId);

  if (!entry) {
    return null;
  }

  const [metadata, episodes, paidEpisodes, relatedTitles] = await Promise.all([
    readJsonFile<NaverSeriesMetadata | null>(getSeriesMetadataPath(titleId), null),
    readJsonFile<NaverSeriesEpisode[]>(getSeriesEpisodesPath(titleId), []),
    readJsonFile<NaverSeriesEpisode[]>(getSeriesPaidEpisodesPath(titleId), []),
    readJsonFile<NaverRelatedTitle[]>(getSeriesRelatedTitlesPath(titleId), []),
  ]);

  const mergedEpisodes = mergeUniqueEpisodes(episodes, paidEpisodes);
  const manifests = await Promise.all(
    mergedEpisodes.map((episode) => readEpisodeArchiveManifest(titleId, episode.no)),
  );
  const episodeArchives = Object.fromEntries(
    mergedEpisodes.map((episode, index) => [episode.no, manifests[index] ?? null]),
  ) as Record<number, StoredEpisodeArchiveManifest | null>;
  const downloadedEpisodes = manifests.filter(
    (manifest) => manifest?.crawl.status === "downloaded",
  ).length;
  const availableEpisodes = manifests.filter(
    (manifest) => manifest?.crawl.status !== "preview",
  ).length;
  const hasActiveDownload = manifests.some(
    (manifest) =>
      manifest?.crawl.status === "pending" ||
      manifest?.crawl.status === "downloading",
  );

  return {
    summary: {
      ...toStoredSeriesSummary(entry),
      totalEpisodes: mergedEpisodes.length,
      availableEpisodes,
      downloadedEpisodes,
      missingEpisodes: Math.max(availableEpisodes - downloadedEpisodes, 0),
      hasActiveDownload,
    },
    metadata,
    episodes,
    paidEpisodes,
    relatedTitles,
    episodeArchives,
  };
}

export async function addSeriesToLibrary(input: AddSeriesInput) {
  const snapshot = await fetchNaverSeriesSnapshot(input.titleId);

  if (snapshot.metadata.isDailyPass) {
    throw new Error("유료 웹툰은 지원하지 않습니다.");
  }

  const resolvedRootFolder = await resolveRootFolder(input.rootFolder);
  const index = await readLibraryIndex();
  const existing = index.items.find((item) => item.titleId === snapshot.metadata.titleId);
  const entry = buildLibraryEntry(snapshot, {
    rootFolder: resolvedRootFolder,
    monitorMode: input.monitorMode,
    existing,
  });
  await writeSeriesSnapshot(snapshot, entry.storagePath);
  await writeLibraryEntry(entry);
  enqueueSeriesStorageSync({
    snapshot,
    rootFolder: resolvedRootFolder,
    monitorMode: input.monitorMode,
    enqueuedAt: new Date().toISOString(),
    trigger: "series-add",
  });
  return entry;
}

export async function refreshSeriesInLibrary(titleId: number) {
  const index = await readLibraryIndex();
  const existing = index.items.find((item) => item.titleId === titleId);

  if (!existing) {
    throw new Error(`Series ${titleId} is not in the library.`);
  }

  const snapshot = await fetchNaverSeriesSnapshot(titleId);
  const resolvedRootFolder = await resolveRootFolder(existing.rootFolder);
  const entry = buildLibraryEntry(snapshot, {
    rootFolder: resolvedRootFolder,
    monitorMode: existing.monitorMode,
    existing,
  });
  await writeSeriesSnapshot(snapshot, entry.storagePath);
  await writeLibraryEntry(entry);
  enqueueSeriesStorageSync({
    snapshot,
    rootFolder: resolvedRootFolder,
    monitorMode: existing.monitorMode,
    enqueuedAt: new Date().toISOString(),
    trigger: "series-refresh",
  });
  return entry;
}

export async function retrySeriesEpisodeInLibrary(titleId: number, no: number) {
  const index = await readLibraryIndex();
  const existing = index.items.find((item) => item.titleId === titleId);

  if (!existing) {
    throw new Error(`Series ${titleId} is not in the library.`);
  }

  const snapshot = await fetchNaverSeriesSnapshot(titleId);
  const resolvedRootFolder = await resolveRootFolder(existing.rootFolder);
  const storagePath = buildStoragePath(
    resolvedRootFolder,
    snapshot.metadata.title,
    snapshot.metadata.titleId,
  );

  await writeSeriesCatalogSnapshot(snapshot);

  const mergedEpisodes = mergeUniqueEpisodes(snapshot.episodes, snapshot.paidEpisodes);
  const targetEpisode = mergedEpisodes.find((episode) => episode.no === no);

  if (!targetEpisode) {
    throw new Error(`Episode ${no} is not available in series ${titleId}.`);
  }

  await syncEpisodeStorage(titleId, storagePath, targetEpisode);

  const manifests = await Promise.all(
    mergedEpisodes.map((episode) => readEpisodeArchiveManifest(titleId, episode.no)),
  );
  const downloadedEpisodes = manifests.filter(
    (manifest) => manifest?.crawl.status === "downloaded",
  ).length;
  const entry = buildLibraryEntry(snapshot, {
    rootFolder: resolvedRootFolder,
    monitorMode: existing.monitorMode,
    existing,
    downloadedEpisodes,
    sizeOnDisk: formatBytes(await calculateDirectorySize(storagePath)),
  });

  await writeLibraryEntry(entry);
  return entry;
}

export async function deleteSeriesEpisodeInLibrary(titleId: number, no: number) {
  const index = await readLibraryIndex();
  const existing = index.items.find((item) => item.titleId === titleId);

  if (!existing) {
    throw new Error(`Series ${titleId} is not in the library.`);
  }

  const snapshot = await fetchNaverSeriesSnapshot(titleId);
  const resolvedRootFolder = await resolveRootFolder(existing.rootFolder);
  const storagePath = buildStoragePath(
    resolvedRootFolder,
    snapshot.metadata.title,
    snapshot.metadata.titleId,
  );

  const mergedEpisodes = mergeUniqueEpisodes(snapshot.episodes, snapshot.paidEpisodes);
  const targetEpisode = mergedEpisodes.find((episode) => episode.no === no);

  if (!targetEpisode) {
    throw new Error(`Episode ${no} is not available in series ${titleId}.`);
  }

  await Promise.all([
    rm(getSeriesEpisodeArchiveDir(titleId, no), { recursive: true, force: true }),
    rm(getStorageEpisodeDir(storagePath, no), { recursive: true, force: true }),
  ]);

  const manifests = await Promise.all(
    mergedEpisodes.map((episode) => readEpisodeArchiveManifest(titleId, episode.no)),
  );
  const downloadedEpisodes = manifests.filter(
    (manifest) => manifest?.crawl.status === "downloaded",
  ).length;
  const entry = buildLibraryEntry(snapshot, {
    rootFolder: resolvedRootFolder,
    monitorMode: existing.monitorMode,
    existing,
    downloadedEpisodes,
    sizeOnDisk: formatBytes(await calculateDirectorySize(storagePath)),
  });

  await writeLibraryEntry(entry);
  return entry;
}

export async function refreshAllStoredSeries() {
  const index = await readLibraryIndex();
  const refreshed: LibrarySeriesEntry[] = [];
  const now = new Date();
  let hasIndexUpdates = false;

  for (const [indexPosition, item] of index.items.entries()) {
    if (item.monitorMode === "none" || item.status === "paused") {
      continue;
    }

    if (item.isFinished && item.downloadedEpisodes >= item.episodes) {
      index.items[indexPosition] = {
        ...item,
        status: "paused",
        monitored: false,
        monitorMode: "none",
        nextCheck: "-",
        updatedAt: new Date().toISOString(),
      };
      hasIndexUpdates = true;
      continue;
    }

    if (!isRefreshDue(item.nextCheck, now)) {
      continue;
    }

    const entry = await refreshSeriesInLibrary(item.titleId);
    refreshed.push(entry);
  }

  if (hasIndexUpdates) {
    await writeLibraryIndex(index);
  }

  return refreshed;
}

export async function forceRefreshAllStoredSeries() {
  const index = await readLibraryIndex();
  const refreshed: LibrarySeriesEntry[] = [];

  for (const item of index.items) {
    const entry = await refreshSeriesInLibrary(item.titleId);
    refreshed.push(entry);
  }

  return refreshed;
}

export async function unmonitorSeriesInLibrary(titleId: number) {
  const index = await readLibraryIndex();
  const existingIndex = index.items.findIndex((item) => item.titleId === titleId);

  if (existingIndex < 0) {
    throw new Error(`Series ${titleId} is not in the library.`);
  }

  const existing = index.items[existingIndex];
  const updatedEntry: LibrarySeriesEntry = {
    ...existing,
    status: "paused",
    monitored: false,
    monitorMode: "none",
    nextCheck: "-",
    updatedAt: new Date().toISOString(),
  };

  index.items[existingIndex] = updatedEntry;
  await writeLibraryIndex(index);
  removeSeriesStorageSyncTask(titleId);

  return updatedEntry;
}

export async function deleteSeriesFromLibrary(titleId: number) {
  const index = await readLibraryIndex();
  const existingIndex = index.items.findIndex((item) => item.titleId === titleId);

  if (existingIndex < 0) {
    throw new Error(`Series ${titleId} is not in the library.`);
  }

  const existing = index.items[existingIndex];
  index.items.splice(existingIndex, 1);
  await writeLibraryIndex(index);
  removeSeriesStorageSyncTask(titleId);

  await Promise.all([
    rm(getNaverSeriesDir(titleId), { recursive: true, force: true }),
    rm(existing.storagePath, { recursive: true, force: true }),
  ]);

  return existing;
}

export async function updateSeriesSettings(input: UpdateSeriesSettingsInput) {
  const index = await readLibraryIndex();
  const existing = index.items.find((item) => item.titleId === input.titleId);

  if (!existing) {
    throw new Error(`Series ${input.titleId} is not in the library.`);
  }

  const checkIntervalHours = clampCheckIntervalHours(input.checkIntervalHours);
  const metadata = await readJsonFile<NaverSeriesMetadata | null>(
    getSeriesMetadataPath(input.titleId),
    null,
  );
  const paidEpisodes = await readJsonFile<NaverSeriesEpisode[]>(
    getSeriesPaidEpisodesPath(input.titleId),
    [],
  );
  const nextPreviewAirDate =
    paidEpisodes
      .map((episode) => episode.serviceDate)
      .filter((value): value is string => Boolean(value))
      .map((value) => new Date(`${value}T12:00:00`))
      .filter((value) => !Number.isNaN(value.getTime()) && value.getTime() > Date.now())
      .sort((left, right) => left.getTime() - right.getTime())[0] ?? null;
  const updatedEntry: LibrarySeriesEntry = {
    ...existing,
    checkIntervalHours,
    nextCheck:
      existing.monitored && !existing.isFinished
        ? computeNextCheck(
            checkIntervalHours,
            metadata?.publishDays,
            existing.isFinished,
            nextPreviewAirDate,
          )
        : "-",
    updatedAt: new Date().toISOString(),
  };

  await writeLibraryEntry(updatedEntry);
  return updatedEntry;
}
