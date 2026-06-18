export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
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
