import {
  getNaverSessionCookieHeader,
  mergeNaverSessionSetCookieLines,
} from "@/lib/naver-session";
import { fetchWithTimeout, getTimeoutFromEnv } from "@/lib/async-timeout";

const NAVER_FETCH_TIMEOUT_MS = getTimeoutFromEnv(
  "NAVERRR_FETCH_TIMEOUT_MS",
  30_000,
);
const NAVER_INTERNAL_API_TIMEOUT_MS = getTimeoutFromEnv(
  "NAVERRR_INTERNAL_API_TIMEOUT_MS",
  15_000,
);

function shouldAttachNaverCookie(url: string) {
  const hostname = new URL(url).hostname;
  return hostname === "comic.naver.com" || hostname === "image-comic.pstatic.net";
}

function withDefaultHeaders(
  url: string,
  headers: HeadersInit | undefined,
  cookieHeader: string | null,
) {
  const merged = new Headers(headers);

  if (!merged.has("accept-language")) {
    merged.set("accept-language", "ko-KR,ko;q=0.9,en-US;q=0.8");
  }

  if (!merged.has("user-agent")) {
    merged.set(
      "user-agent",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
    );
  }

  if (!merged.has("referer") && shouldAttachNaverCookie(url)) {
    merged.set("referer", "https://comic.naver.com/");
  }

  if (cookieHeader && shouldAttachNaverCookie(url) && !merged.has("cookie")) {
    merged.set("cookie", cookieHeader);
  }

  return merged;
}

async function readErrorText(response: Response) {
  try {
    return (await response.text()).trim();
  } catch {
    return "";
  }
}

function buildNaverRequestError(url: string, status: number, text: string) {
  const isLoginError =
    status === 401 ||
    status === 403 ||
    text === "\"LOGIN\"" ||
    text === "LOGIN";

  if (isLoginError) {
    return new Error("Naver login session is required or expired. Update it in Settings.");
  }

  return new Error(`Naver request failed: ${status} ${url}`);
}

function isLoginBlocked(status: number, text: string) {
  return (
    status === 401 ||
    status === 403 ||
    text === "\"LOGIN\"" ||
    text === "LOGIN"
  );
}

async function performNaverFetch(
  url: string,
  init: RequestInit | undefined,
  cookieHeader: string | null,
) {
  const response = await fetchWithTimeout(
    url,
    {
      ...init,
      cache: "no-store",
      headers: withDefaultHeaders(url, init?.headers, cookieHeader),
    },
    {
      timeoutMs: NAVER_FETCH_TIMEOUT_MS,
      label: `Naver request (${url})`,
    },
  );

  if (shouldAttachNaverCookie(url)) {
    const setCookieLines =
      typeof response.headers.getSetCookie === "function"
        ? response.headers.getSetCookie()
        : response.headers.get("set-cookie")?.split(/\r?\n/) ?? [];

    await mergeNaverSessionSetCookieLines(setCookieLines).catch(() => undefined);
  }

  return response;
}

function getInternalAppUrl() {
  return process.env.NAVERRR_BASE_URL ?? "http://127.0.0.1:3000";
}

async function tryRenewNaverSession() {
  try {
    const response = await fetchWithTimeout(
      `${getInternalAppUrl()}/api/settings/naver-session/renew`,
      {
        method: "POST",
        cache: "no-store",
      },
      {
        timeoutMs: NAVER_INTERNAL_API_TIMEOUT_MS,
        label: "internal Naver session renew request",
      },
    );

    if (!response.ok) {
      return false;
    }

    const payload = (await response.json()) as {
      ok?: boolean;
      session?: unknown;
    };

    return Boolean(payload.ok && payload.session);
  } catch {
    return false;
  }
}

export async function fetchNaver(url: string, init?: RequestInit) {
  const cookieHeader = await getNaverSessionCookieHeader();
  let response = await performNaverFetch(url, init, cookieHeader);

  if (!response.ok) {
    const errorText = await readErrorText(response);

    if (isLoginBlocked(response.status, errorText)) {
      const renewedSession = await tryRenewNaverSession();

      if (renewedSession) {
        response = await performNaverFetch(url, init, await getNaverSessionCookieHeader());

        if (response.ok) {
          return response;
        }

        throw buildNaverRequestError(
          url,
          response.status,
          await readErrorText(response),
        );
      }
    }

    throw buildNaverRequestError(url, response.status, errorText);
  }

  return response;
}

export async function fetchNaverJson<T>(url: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);

  if (!headers.has("accept")) {
    headers.set("accept", "application/json");
  }

  const response = await fetchNaver(url, {
    ...init,
    headers,
  });

  return (await response.json()) as T;
}

export async function fetchNaverText(url: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);

  if (!headers.has("accept")) {
    headers.set("accept", "text/html,application/xhtml+xml");
  }

  const response = await fetchNaver(url, {
    ...init,
    headers,
  });

  return response.text();
}
