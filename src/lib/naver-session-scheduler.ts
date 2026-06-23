import {
  getNaverSessionSummary,
  keepNaverSessionAlive,
} from "@/lib/naver-session";
import { getTimeoutFromEnv, withTimeout } from "@/lib/async-timeout";
import { renewNaverSessionWithStoredCredentials } from "@/lib/naver-login-browser";

const NAVER_SESSION_CHECK_INTERVAL_MS = 60 * 60 * 1000;
const NAVER_SESSION_KEEPALIVE_MAX_AGE_MS = 20 * 60 * 60 * 1000;
const NAVER_SESSION_SCHEDULER_RUN_TIMEOUT_MS = getTimeoutFromEnv(
  "NAVERRR_SESSION_SCHEDULER_RUN_TIMEOUT_MS",
  2 * 60 * 1000,
);

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

export async function runNaverSessionKeepalive() {
  if (globalThis.__naverrrNaverSessionSchedulerRunning) {
    return {
      skipped: true,
      action: "skipped" as const,
    };
  }

  globalThis.__naverrrNaverSessionSchedulerRunning = true;

  try {
    const summary = await withTimeout(
      () => getNaverSessionSummary(),
      NAVER_SESSION_SCHEDULER_RUN_TIMEOUT_MS,
      "Naver session scheduler run",
    );

    if (!summary.configured) {
      return {
        skipped: false,
        action: "not-configured" as const,
      };
    }

    const lastActivityAt = getLastActivityAt(summary);

    if (
      lastActivityAt !== null &&
      Date.now() - lastActivityAt < NAVER_SESSION_KEEPALIVE_MAX_AGE_MS
    ) {
      return {
        skipped: false,
        action: "fresh" as const,
      };
    }

    const keepalive = await withTimeout(
      () => keepNaverSessionAlive(),
      NAVER_SESSION_SCHEDULER_RUN_TIMEOUT_MS,
      "Naver session keepalive run",
    );

    if (keepalive.isValid) {
      console.info("[naverrr] naver session keepalive refreshed");
      return {
        skipped: false,
        action: "refreshed" as const,
      };
    }

    const renewedSession = await withTimeout(
      () => renewNaverSessionWithStoredCredentials(),
      NAVER_SESSION_SCHEDULER_RUN_TIMEOUT_MS,
      "Naver session renewal run",
    );

    if (renewedSession?.isValid) {
      console.info("[naverrr] naver session renewed with stored credentials");
      return {
        skipped: false,
        action: "renewed" as const,
      };
    } else {
      console.warn("[naverrr] naver session keepalive failed; bridge login may be required");
      return {
        skipped: false,
        action: "bridge-required" as const,
      };
    }
  } catch (error) {
    console.error("[naverrr] naver session keepalive failed", error);
    throw error;
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
