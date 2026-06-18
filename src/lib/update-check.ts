import packageJson from "../../package.json";
import type { Locale } from "@/lib/locale";
import { TOONARR_REPO } from "@/lib/project-links";

type UpdateReleaseEntry = {
  version: string;
  dateLabel: string;
  status: "available" | "current";
  title: string;
  points: string[];
  sourceLabel: string;
};

type GitHubRelease = {
  tag_name: string;
  name: string | null;
  body: string | null;
  published_at: string | null;
  html_url: string;
};

function normalizeVersionTag(value: string) {
  return value.trim().replace(/^v/i, "");
}

function isVersionNewer(candidate: string, current: string) {
  const left = normalizeVersionTag(candidate).split(/[.\-_]/);
  const right = normalizeVersionTag(current).split(/[.\-_]/);
  const length = Math.max(left.length, right.length);

  for (let index = 0; index < length; index += 1) {
    const leftPart = left[index] ?? "0";
    const rightPart = right[index] ?? "0";
    const leftNumber = Number(leftPart);
    const rightNumber = Number(rightPart);
    const bothNumeric = Number.isFinite(leftNumber) && Number.isFinite(rightNumber);

    if (bothNumeric) {
      if (leftNumber !== rightNumber) {
        return leftNumber > rightNumber;
      }
      continue;
    }

    if (leftPart !== rightPart) {
      return leftPart > rightPart;
    }
  }

  return false;
}

function formatDate(value: string | null | undefined, locale: Locale) {
  if (!value) {
    return locale === "ko" ? "날짜 미상" : "Unknown date";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(parsed);
}

function parseReleaseBody(body: string | null | undefined, locale: Locale) {
  const lines = (body ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[-*]\s*/, "").replace(/^#+\s*/, ""))
    .filter((line) => line.length > 0)
    .slice(0, 8);

  if (lines.length) {
    return lines;
  }

  return [
    locale === "ko"
      ? "릴리즈 노트가 아직 작성되지 않았습니다."
      : "Release notes have not been written yet.",
  ];
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, "\"");
}

function stripHtml(value: string) {
  return decodeHtmlEntities(value)
    .replace(/<li>/g, "\n- ")
    .replace(/<\/li>/g, "")
    .replace(/<br\s*\/?>/g, "\n")
    .replace(/<\/?(ul|ol|p)>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .trim();
}

async function fetchGitHubReleasesFeed(repo: string) {
  const response = await fetch(`https://github.com/${repo}/releases.atom`, {
    cache: "no-store",
  });

  if (!response.ok) {
    return [];
  }

  const xml = await response.text();
  const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)];

  return entries
    .map((match) => {
      const block = match[1];
      const tag = block.match(/<id>[\s\S]*?\/([^/<]+)<\/id>/)?.[1] ?? "";
      const title = block.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? null;
      const updated = block.match(/<updated>([\s\S]*?)<\/updated>/)?.[1] ?? null;
      const url = block.match(/<link[^>]*href="([^"]+)"/)?.[1] ?? "";
      const content = block.match(/<content[^>]*>([\s\S]*?)<\/content>/)?.[1] ?? null;

      if (!tag || !url) {
        return null;
      }

      const release: GitHubRelease = {
        tag_name: tag,
        name: decodeHtmlEntities(title ?? ""),
        body: stripHtml(content ?? ""),
        published_at: updated,
        html_url: url,
      };

      return release;
    })
    .filter((entry): entry is GitHubRelease => entry !== null);
}

function getLocalCurrentEntry(locale: Locale): UpdateReleaseEntry {
  return {
    version: packageJson.version,
    dateLabel: "2026-06-18",
    status: "current",
    title:
      locale === "ko"
        ? "현재 로컬 빌드에 포함된 주요 변경"
        : "Main changes included in the current local build",
    points:
      locale === "ko"
        ? [
            "라이브러리 카드 우측 하단에 갱신/삭제 관리 메뉴를 추가했습니다.",
            "시리즈 상세에서 저장경로를 바로 열 수 있습니다.",
            "설정 화면을 계정 정보, 시스템, 업데이트로 분리했습니다.",
          ]
        : [
            "Added refresh/delete management menus to library cards.",
            "Series detail can open the storage path directly.",
            "Split settings into account, system, and update sections.",
          ],
    sourceLabel: locale === "ko" ? "로컬 빌드" : "Local build",
  };
}

async function buildGitHubFeed(
  repo: string,
  locale: Locale,
  currentVersion: string,
) {
  const currentEntryFallback = getLocalCurrentEntry(locale);
  const releasesFeed = await fetchGitHubReleasesFeed(repo);
  const latestRelease = releasesFeed[0] ?? null;
  const currentRelease =
    releasesFeed.find(
      (entry) =>
        entry !== null &&
        normalizeVersionTag(entry.tag_name) === normalizeVersionTag(currentVersion),
    ) ?? null;

  const releases: UpdateReleaseEntry[] = [];

  if (latestRelease) {
    const latestVersion = normalizeVersionTag(latestRelease.tag_name);
    if (
      latestVersion !== normalizeVersionTag(currentVersion) &&
      isVersionNewer(latestVersion, currentVersion)
    ) {
      releases.push({
        version: latestVersion,
        dateLabel: formatDate(latestRelease.published_at, locale),
        status: "available",
        title:
          latestRelease.name ||
          (locale === "ko" ? "새 버전이 배포되었습니다." : "A new version is available."),
        points: parseReleaseBody(latestRelease.body, locale),
        sourceLabel: `GitHub · ${repo}`,
      });
    }
  }

  if (currentRelease) {
    releases.push({
      version: normalizeVersionTag(currentRelease.tag_name),
      dateLabel: formatDate(currentRelease.published_at, locale),
      status: "current",
      title:
        currentRelease.name ||
        (locale === "ko" ? "현재 설치 버전" : "Current installed version"),
      points: parseReleaseBody(currentRelease.body, locale),
      sourceLabel: `GitHub · ${repo}`,
    });
  } else {
    releases.push(currentEntryFallback);
  }

  return {
    updateAvailable: releases.some((entry) => entry.status === "available"),
    latestVersion:
      releases.find((entry) => entry.status === "available")?.version ?? currentVersion,
    releases,
  };
}

export async function getUpdateFeed(locale: Locale) {
  const currentVersion = packageJson.version;

  return {
    currentVersion,
    ...await buildGitHubFeed(TOONARR_REPO, locale, currentVersion),
  };
}
