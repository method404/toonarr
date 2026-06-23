export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  const enableInProcessSchedulers =
    process.env.NAVERRR_ENABLE_IN_PROCESS_SCHEDULERS === "true" ||
    (process.env.NAVERRR_ENABLE_IN_PROCESS_SCHEDULERS == null &&
      process.env.NODE_ENV !== "production");

  if (!enableInProcessSchedulers) {
    return;
  }

  const [{ startNaverSessionScheduler }, { startSeriesScheduler }] =
    await Promise.all([
      import("@/lib/naver-session-scheduler"),
      import("@/lib/series-scheduler"),
    ]);

  startNaverSessionScheduler();
  startSeriesScheduler();
}
