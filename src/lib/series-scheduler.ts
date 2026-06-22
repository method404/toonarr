import {
  getSeriesRefreshIntervalMinutes,
  refreshAllStoredSeries,
} from "@/lib/library-store";
import { getTimeoutFromEnv, withTimeout } from "@/lib/async-timeout";
import type { JobRun } from "@/lib/types";

const SERIES_SCHEDULER_RUN_TIMEOUT_MS = getTimeoutFromEnv(
  "NAVERRR_SERIES_SCHEDULER_RUN_TIMEOUT_MS",
  10 * 60 * 1000,
);

declare global {
  var __naverrrSchedulerStarted: boolean | undefined;
  var __naverrrSchedulerTimer: NodeJS.Timeout | undefined;
  var __naverrrSchedulerRunning: boolean | undefined;
  var __naverrrSchedulerRecentJobs: JobRun[] | undefined;
  var __naverrrSchedulerCurrentRun: JobRun | undefined;
}

function getSchedulerRecentJobsState() {
  if (!globalThis.__naverrrSchedulerRecentJobs) {
    globalThis.__naverrrSchedulerRecentJobs = [];
  }

  return globalThis.__naverrrSchedulerRecentJobs;
}

function appendSchedulerRecentJob(job: JobRun) {
  const jobs = getSchedulerRecentJobsState();
  jobs.unshift(job);
  globalThis.__naverrrSchedulerRecentJobs = jobs.slice(0, 12);
}

async function runScheduledRefresh() {
  if (globalThis.__naverrrSchedulerRunning) {
    return;
  }

  globalThis.__naverrrSchedulerRunning = true;
  const startedAt = new Date().toISOString();
  globalThis.__naverrrSchedulerCurrentRun = {
    id: `scheduler-running-${Date.now()}`,
    name: "Series refresh scheduler",
    trigger: "schedule",
    status: "running",
    itemsProcessed: 0,
    startedAt,
  };

  try {
    const entries = await withTimeout(
      () => refreshAllStoredSeries(),
      SERIES_SCHEDULER_RUN_TIMEOUT_MS,
      "Series refresh scheduler run",
    );
    appendSchedulerRecentJob({
      id: `scheduler-job-${Date.now()}`,
      name: "Series refresh scheduler",
      trigger: "schedule",
      status: "success",
      itemsProcessed: entries.length,
      startedAt,
      finishedAt: new Date().toISOString(),
    });
    if (entries.length > 0) {
      console.info(
        `[naverrr] scheduled refresh complete: ${entries.length} series`,
      );
    }
  } catch (error) {
    console.error("[naverrr] scheduled refresh failed", error);
    appendSchedulerRecentJob({
      id: `scheduler-job-${Date.now()}`,
      name: "Series refresh scheduler",
      trigger: "schedule",
      status: "failed",
      itemsProcessed: 0,
      startedAt,
      finishedAt: new Date().toISOString(),
    });
  } finally {
    globalThis.__naverrrSchedulerRunning = false;
    globalThis.__naverrrSchedulerCurrentRun = undefined;
  }
}

export function startSeriesScheduler() {
  if (typeof window !== "undefined") {
    return;
  }

  if (globalThis.__naverrrSchedulerStarted) {
    return;
  }

  globalThis.__naverrrSchedulerStarted = true;

  const intervalMs = getSeriesRefreshIntervalMinutes() * 60 * 1000;
  globalThis.__naverrrSchedulerTimer = setInterval(() => {
    void runScheduledRefresh();
  }, intervalMs);

  // Run once on startup so overdue checks are not delayed until the next full interval.
  void runScheduledRefresh();

  console.info(
    `[naverrr] series scheduler started (${getSeriesRefreshIntervalMinutes()} min)`,
  );
}

export function getSeriesSchedulerRecentJobs() {
  const jobs = [...getSchedulerRecentJobsState()];

  if (globalThis.__naverrrSchedulerCurrentRun) {
    return [globalThis.__naverrrSchedulerCurrentRun, ...jobs];
  }

  return jobs;
}
