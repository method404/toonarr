import {
  getNaverSessionSummary,
  keepNaverSessionAlive,
} from "@/lib/naver-session";
import { renewNaverSessionWithStoredCredentials } from "@/lib/naver-login-browser";

const NAVER_SESSION_CHECK_INTERVAL_MS = 60 * 60 * 1000;
const NAVER_SESSION_KEEPALIVE_MAX_AGE_MS = 20 * 60 * 60 * 1000;

declare global {
  var __naverrrNaverSessionSchedulerStarted: boolean | undefined;
  var __naverrrNaverSessionSchedulerTimer: NodeJS.Timeout | undefined;
  var __naverrrNaverSessionSchedulerRunning: boolean | undefined;
}

function getLastActivityAt(summary: {
  updatedAt: string | null;
  lastValidatedAt: string | null;
}) {
  const candidate = summary.lastValidatedAt ?? summary.updatedAt;

  if (!candidate) {
    return null;
  }

  const parsed = Date.parse(candidate);
  return Number.isNaN(parsed) ? null : parsed;
}

async function runNaverSessionKeepalive() {
  if (globalThis.__naverrrNaverSessionSchedulerRunning) {
    return;
  }

  globalThis.__naverrrNaverSessionSchedulerRunning = true;

  try {
    const summary = await getNaverSessionSummary();

    if (!summary.configured) {
      return;
    }

    const lastActivityAt = getLastActivityAt(summary);

    if (
      lastActivityAt !== null &&
      Date.now() - lastActivityAt < NAVER_SESSION_KEEPALIVE_MAX_AGE_MS
    ) {
      return;
    }

    const keepalive = await keepNaverSessionAlive();

    if (keepalive.isValid) {
      console.info("[naverrr] naver session keepalive refreshed");
      return;
    }

    const renewedSession = await renewNaverSessionWithStoredCredentials();

    if (renewedSession?.isValid) {
      console.info("[naverrr] naver session renewed with stored credentials");
    } else {
      console.warn("[naverrr] naver session keepalive failed; bridge login may be required");
    }
  } catch (error) {
    console.error("[naverrr] naver session keepalive failed", error);
  } finally {
    globalThis.__naverrrNaverSessionSchedulerRunning = false;
  }
}

export function startNaverSessionScheduler() {
  if (typeof window !== "undefined") {
    return;
  }

  if (globalThis.__naverrrNaverSessionSchedulerStarted) {
    return;
  }

  globalThis.__naverrrNaverSessionSchedulerStarted = true;
  globalThis.__naverrrNaverSessionSchedulerTimer = setInterval(() => {
    void runNaverSessionKeepalive();
  }, NAVER_SESSION_CHECK_INTERVAL_MS);

  setTimeout(() => {
    void runNaverSessionKeepalive();
  }, 10_000);

  console.info("[naverrr] naver session scheduler started (hourly check / 20h keepalive)");
}
