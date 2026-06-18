import { access, mkdir } from "node:fs/promises";
import path from "node:path";
import {
  getStoredNaverCredentials,
  saveNaverCredentials,
  markNaverCredentialsUsed,
} from "@/lib/naver-credentials";
import {
  getNaverSessionSummary,
  saveNaverSession,
  type NaverSessionSummary,
} from "@/lib/naver-session";

type PlaywrightModule = typeof import("playwright");
type BrowserContext = Awaited<
  ReturnType<PlaywrightModule["chromium"]["launchPersistentContext"]>
>;

export type NaverBrowserLoginStatus = {
  state:
    | "idle"
    | "launching"
    | "waiting"
    | "capturing"
    | "completed"
    | "error";
  message: string;
  startedAt: string | null;
  updatedAt: string | null;
  currentUrl: string | null;
  session: NaverSessionSummary | null;
};

type NaverBrowserLoginState = {
  context: BrowserContext | null;
  status: NaverBrowserLoginStatus;
  renewalPromise: Promise<NaverSessionSummary | null> | null;
  pendingCredentials: {
    username: string;
    password: string;
  } | null;
};

declare global {
  var __naverrrNaverBrowserLoginState: NaverBrowserLoginState | undefined;
}

function getDataRoot() {
  return path.join(process.cwd(), "data");
}

function getBrowserProfileDir() {
  return path.join(getDataRoot(), "browser", "naver");
}

async function resolveBrowserLaunchOptions() {
  const candidates = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/microsoft-edge",
    "/usr/bin/microsoft-edge-stable",
  ];

  for (const executablePath of candidates) {
    try {
      await access(executablePath);
      return { executablePath };
    } catch {
      continue;
    }
  }

  return {};
}

function getDefaultStatus(): NaverBrowserLoginStatus {
  return {
    state: "idle",
    message: "No active browser login session.",
    startedAt: null,
    updatedAt: null,
    currentUrl: null,
    session: null,
  };
}

function getLoginState() {
  if (!globalThis.__naverrrNaverBrowserLoginState) {
    globalThis.__naverrrNaverBrowserLoginState = {
      context: null,
      status: getDefaultStatus(),
      renewalPromise: null,
      pendingCredentials: null,
    };
  }

  return globalThis.__naverrrNaverBrowserLoginState;
}

function setStatus(
  state: NaverBrowserLoginStatus["state"],
  message: string,
  session: NaverSessionSummary | null = null,
  currentUrl: string | null = null,
) {
  const loginState = getLoginState();
  const now = new Date().toISOString();

  loginState.status = {
    state,
    message,
    startedAt:
      state === "launching" && !loginState.status.startedAt
        ? now
        : loginState.status.startedAt,
    updatedAt: now,
    currentUrl,
    session,
  };

  if (state === "idle") {
    loginState.status.startedAt = null;
  }
}

async function importPlaywright() {
  return (await import("playwright")) as PlaywrightModule;
}

async function clickRememberDevice(page: Awaited<ReturnType<typeof getActivePage>>) {
  const keep = page.locator("#keep");
  const checkbox = page.locator("#nvlong");

  if ((await checkbox.count()) === 0) {
    return;
  }

  const currentValue = await checkbox.first().getAttribute("value");

  if (currentValue !== "on") {
    await keep.first().click().catch(() => undefined);
  }
}

async function fillAndSubmitLogin(
  page: Awaited<ReturnType<typeof getActivePage>>,
  credentials: {
    username: string;
    password: string;
  },
) {
  await page.waitForSelector('input[name="id"]', { timeout: 15000 });
  await page.fill('input[name="id"]', credentials.username);
  await page.fill('input[name="pw"]', credentials.password);
  await clickRememberDevice(page);

  const submitButton = page.locator("button.btn_login, input.btn_login, button[type='submit']");
  await submitButton.first().click();
}

async function captureSessionFromContext(
  context: BrowserContext,
  pendingCredentials: {
    username: string;
    password: string;
  } | null,
) {
  const cookies = await context.cookies([
    "https://comic.naver.com",
    "https://nid.naver.com",
  ]);

  if (!hasRequiredCookies(cookies)) {
    return null;
  }

  const session = await saveNaverSession(buildCookieHeader(cookies));
  if (pendingCredentials) {
    await saveNaverCredentials(
      pendingCredentials.username,
      pendingCredentials.password,
    );
  }
  await markNaverCredentialsUsed().catch(() => undefined);
  return session;
}

function buildCookieHeader(
  cookies: Array<{
    name: string;
    value: string;
    domain: string;
  }>,
) {
  return cookies
    .filter((cookie) =>
      cookie.domain.includes("naver.com") || cookie.domain.includes("pstatic.net"),
    )
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");
}

function hasRequiredCookies(
  cookies: Array<{
    name: string;
    domain: string;
  }>,
) {
  const names = new Set(
    cookies
      .filter((cookie) =>
        cookie.domain.includes("naver.com") || cookie.domain.includes("pstatic.net"),
      )
      .map((cookie) => cookie.name),
  );

  return names.has("NID_AUT") && names.has("NID_SES");
}

async function getActivePage(context: BrowserContext) {
  const pages = context.pages();

  if (pages.length > 0) {
    return pages[pages.length - 1];
  }

  const page = await context.newPage();
  return page;
}

export async function startNaverBrowserLogin(input?: {
  username?: string;
  password?: string;
}) {
  const loginState = getLoginState();

  if (loginState.context) {
    return getNaverBrowserLoginStatus();
  }

  setStatus("launching", "Launching Naver login browser.");

  try {
    const { chromium } = await importPlaywright();
    const userDataDir = getBrowserProfileDir();
    await mkdir(userDataDir, { recursive: true });
    const launchOptions = await resolveBrowserLaunchOptions();

    const context = await chromium.launchPersistentContext(userDataDir, {
      ...launchOptions,
      headless: false,
      viewport: { width: 1440, height: 960 },
    });

    loginState.context = context;
    const page = await getActivePage(context);
    await page.goto("https://nid.naver.com/nidlogin.login", {
      waitUntil: "domcontentloaded",
    });
    const credentials = await getStoredNaverCredentials();
    const pendingCredentials =
      input?.username?.trim() && input.password?.trim()
        ? {
            username: input.username.trim(),
            password: input.password.trim(),
          }
        : null;
    loginState.pendingCredentials = pendingCredentials;

    if (pendingCredentials) {
      await fillAndSubmitLogin(page, pendingCredentials).catch(() => undefined);
    } else if (credentials) {
      await fillAndSubmitLogin(page, credentials).catch(() => undefined);
    }

    setStatus(
      "waiting",
      "Complete Naver login in the opened browser window.",
      null,
      page.url(),
    );

    context.on("close", () => {
      const currentState = getLoginState();

      currentState.context = null;
      currentState.pendingCredentials = null;

      if (currentState.status.state !== "completed") {
        setStatus("idle", "Browser login window closed.");
      }
    });

    return getNaverBrowserLoginStatus();
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message.includes("Executable doesn't exist")
          ? "Browser executable was not found. Install Chrome locally or run `npx playwright install chromium`."
          : error.message
        : "Failed to launch browser login.";

    setStatus("error", message);
    throw error;
  }
}

export async function stopNaverBrowserLogin() {
  const loginState = getLoginState();

  if (loginState.context) {
    await loginState.context.close().catch(() => undefined);
  }

  loginState.context = null;
  loginState.pendingCredentials = null;
  loginState.status = getDefaultStatus();
  return loginState.status;
}

export async function resetNaverBrowserLoginState() {
  const loginState = getLoginState();

  if (loginState.context) {
    await loginState.context.close().catch(() => undefined);
  }

  loginState.context = null;
  loginState.renewalPromise = null;
  loginState.pendingCredentials = null;
  loginState.status = getDefaultStatus();

  return loginState.status;
}

export async function getNaverBrowserLoginStatus() {
  const loginState = getLoginState();

  if (!loginState.context) {
    if (loginState.status.session) {
      const storedSession = await getNaverSessionSummary();

      if (!storedSession.configured) {
        loginState.status = getDefaultStatus();
      }
    }

    return loginState.status;
  }

  try {
    const page = await getActivePage(loginState.context);
    const session = await captureSessionFromContext(
      loginState.context,
      loginState.pendingCredentials,
    );

    if (!session) {
      setStatus(
        "waiting",
        "Waiting for Naver login and device trust confirmation.",
        null,
        page.url(),
      );
      return getLoginState().status;
    }

    setStatus("capturing", "Capturing cookies from logged-in browser.", null, page.url());
    await loginState.context.close().catch(() => undefined);
    loginState.context = null;
    loginState.pendingCredentials = null;

    setStatus("completed", "Naver session captured successfully.", session, page.url());

    return getLoginState().status;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to inspect Naver browser login.";

    setStatus("error", message);
    return getLoginState().status;
  }
}

export async function renewNaverSessionWithStoredCredentials() {
  const loginState = getLoginState();

  if (loginState.renewalPromise) {
    return loginState.renewalPromise;
  }

  loginState.renewalPromise = (async () => {
    const credentials = await getStoredNaverCredentials();

    try {
      const { chromium } = await importPlaywright();
      const launchOptions = await resolveBrowserLaunchOptions();
      const userDataDir = getBrowserProfileDir();
      await mkdir(userDataDir, { recursive: true });
      const context = await chromium.launchPersistentContext(userDataDir, {
        ...launchOptions,
        headless: true,
        viewport: { width: 1366, height: 900 },
      });

      try {
        const page = await getActivePage(context);

        await page
          .goto("https://comic.naver.com/webtoon/list?titleId=846556", {
            waitUntil: "domcontentloaded",
          })
          .catch(() => undefined);
        await page.waitForTimeout(1500);

        const existingSession = await captureSessionFromContext(context, null);

        if (existingSession) {
          return existingSession;
        }

        if (!credentials) {
          return null;
        }

        await page.goto("https://nid.naver.com/nidlogin.login", {
          waitUntil: "domcontentloaded",
        });
        await fillAndSubmitLogin(page, credentials);
        await page
          .waitForLoadState("domcontentloaded", { timeout: 20000 })
          .catch(() => undefined);
        await page.waitForTimeout(2500);

        return captureSessionFromContext(context, null);
      } finally {
        await context.close().catch(() => undefined);
      }
    } catch {
      return null;
    } finally {
      loginState.renewalPromise = null;
    }
  })();

  return loginState.renewalPromise;
}
