import { chmod, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const NAVER_SESSION_PROBE_TITLE_ID = 841624;

type RawWeekdayAdultItem = {
  titleId?: number;
  adult?: boolean;
};

type RawWeekdayAdultResponse = {
  titleListMap?: Record<string, RawWeekdayAdultItem[] | undefined>;
};

type StoredNaverSession = {
  cookieHeader: string;
  updatedAt: string;
  lastValidatedAt: string | null;
  isValid: boolean | null;
  adultAccess: boolean | null;
  lastError: string | null;
};

export type NaverSessionSummary = {
  configured: boolean;
  updatedAt: string | null;
  lastValidatedAt: string | null;
  isValid: boolean | null;
  adultAccess: boolean | null;
  lastError: string | null;
  cookieNames: string[];
  requiredCookies: {
    nidAut: boolean;
    nidSes: boolean;
  };
  maskedCookieHeader: string;
};

type ValidateResult = {
  isValid: boolean;
  adultAccess: boolean;
  lastError: string | null;
};

function getDataRoot() {
  return path.join(process.cwd(), "data");
}

function getSettingsRoot() {
  return path.join(getDataRoot(), "settings");
}

function getNaverSessionPath() {
  return path.join(getSettingsRoot(), "naver-session.json");
}

function extractCookiePairs(rawValue: string) {
  const sanitized = rawValue
    .replace(/^cookie\s*:\s*/i, "")
    .replace(/\r?\n/g, ";")
    .trim();
  const pairs = new Map<string, string>();

  for (const segment of sanitized.split(";")) {
    const trimmed = segment.trim();

    if (!trimmed) {
      continue;
    }

    const delimiterIndex = trimmed.indexOf("=");

    if (delimiterIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, delimiterIndex).trim();
    const value = trimmed.slice(delimiterIndex + 1).trim();

    if (!key || !value) {
      continue;
    }

    pairs.set(key, value);
  }

  return pairs;
}

function normalizeCookieHeader(rawValue: string) {
  const pairs = extractCookiePairs(rawValue);
  return [...pairs.entries()]
    .map(([key, value]) => `${key}=${value}`)
    .join("; ");
}

function maskValue(value: string) {
  if (value.length <= 10) {
    return `${value.slice(0, 2)}***`;
  }

  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function maskCookieHeader(cookieHeader: string) {
  const pairs = extractCookiePairs(cookieHeader);

  return [...pairs.entries()]
    .map(([key, value]) => `${key}=${maskValue(value)}`)
    .join("; ");
}

function summarizeSession(session: StoredNaverSession | null): NaverSessionSummary {
  if (!session) {
    return {
      configured: false,
      updatedAt: null,
      lastValidatedAt: null,
      isValid: null,
      adultAccess: null,
      lastError: null,
      cookieNames: [],
      requiredCookies: {
        nidAut: false,
        nidSes: false,
      },
      maskedCookieHeader: "",
    };
  }

  const cookies = extractCookiePairs(session.cookieHeader);

  return {
    configured: true,
    updatedAt: session.updatedAt,
    lastValidatedAt: session.lastValidatedAt,
    isValid: session.isValid,
    adultAccess: session.adultAccess,
    lastError: session.lastError,
    cookieNames: [...cookies.keys()],
    requiredCookies: {
      nidAut: cookies.has("NID_AUT"),
      nidSes: cookies.has("NID_SES"),
    },
    maskedCookieHeader: maskCookieHeader(session.cookieHeader),
  };
}

async function readStoredSession() {
  try {
    const raw = await readFile(getNaverSessionPath(), "utf8");
    return JSON.parse(raw) as StoredNaverSession;
  } catch {
    return null;
  }
}

async function writeStoredSession(session: StoredNaverSession) {
  await mkdir(getSettingsRoot(), { recursive: true });
  const filePath = getNaverSessionPath();
  await writeFile(filePath, `${JSON.stringify(session, null, 2)}\n`, "utf8");
  await chmod(filePath, 0o600).catch(() => undefined);
}

async function validateCookieHeader(cookieHeader: string): Promise<ValidateResult> {
  const probeTitleId = await resolveAdultProbeTitleId();
  const response = await fetch(
    `https://comic.naver.com/api/article/list?titleId=${probeTitleId}&page=1`,
    {
      cache: "no-store",
      headers: {
        accept: "application/json",
        "accept-language": "ko-KR,ko;q=0.9,en-US;q=0.8",
        cookie: cookieHeader,
        referer: "https://comic.naver.com/",
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
      },
      redirect: "manual",
    },
  );

  const text = await response.text();
  const isLoginBlocked =
    response.status === 401 ||
    response.status === 403 ||
    text.trim() === "\"LOGIN\"" ||
    text.trim() === "LOGIN";

  if (isLoginBlocked) {
    return {
      isValid: false,
      adultAccess: false,
      lastError: "Naver login session is missing or expired.",
    };
  }

  if (!response.ok) {
    return {
      isValid: false,
      adultAccess: false,
      lastError: `Naver validation failed: ${response.status}`,
    };
  }

  return {
    isValid: true,
    adultAccess: true,
    lastError: null,
  };
}

async function resolveAdultProbeTitleId() {
  try {
    const response = await fetch(
      "https://comic.naver.com/api/webtoon/titlelist/weekday?order=user",
      {
        cache: "no-store",
        headers: {
          accept: "application/json",
          "accept-language": "ko-KR,ko;q=0.9,en-US;q=0.8",
          referer: "https://comic.naver.com/",
          "user-agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
        },
      },
    );

    if (!response.ok) {
      return NAVER_SESSION_PROBE_TITLE_ID;
    }

    const data = (await response.json()) as RawWeekdayAdultResponse;

    for (const items of Object.values(data.titleListMap ?? {})) {
      for (const item of items ?? []) {
        if (item.adult && typeof item.titleId === "number") {
          return item.titleId;
        }
      }
    }
  } catch {
    return NAVER_SESSION_PROBE_TITLE_ID;
  }

  return NAVER_SESSION_PROBE_TITLE_ID;
}

export async function getNaverSessionCookieHeader() {
  const session = await readStoredSession();
  return session?.cookieHeader ?? null;
}

export async function getNaverSessionSummary() {
  return summarizeSession(await readStoredSession());
}

export async function saveNaverSession(rawCookieHeader: string) {
  const cookieHeader = normalizeCookieHeader(rawCookieHeader);

  if (!cookieHeader) {
    throw new Error("A valid Naver cookie header is required.");
  }

  const validation = await validateCookieHeader(cookieHeader);
  const now = new Date().toISOString();
  const session: StoredNaverSession = {
    cookieHeader,
    updatedAt: now,
    lastValidatedAt: now,
    isValid: validation.isValid,
    adultAccess: validation.adultAccess,
    lastError: validation.lastError,
  };

  await writeStoredSession(session);
  return summarizeSession(session);
}

export async function validateStoredNaverSession() {
  const session = await readStoredSession();

  if (!session) {
    return summarizeSession(null);
  }

  const validation = await validateCookieHeader(session.cookieHeader);
  const updatedSession: StoredNaverSession = {
    ...session,
    lastValidatedAt: new Date().toISOString(),
    isValid: validation.isValid,
    adultAccess: validation.adultAccess,
    lastError: validation.lastError,
  };

  await writeStoredSession(updatedSession);
  return summarizeSession(updatedSession);
}

export async function clearNaverSession() {
  await rm(getNaverSessionPath(), { force: true });
}
