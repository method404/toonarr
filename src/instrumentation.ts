import { startNaverSessionScheduler } from "@/lib/naver-session-scheduler";
import { startSeriesScheduler } from "@/lib/series-scheduler";

export async function register() {
  startNaverSessionScheduler();
  startSeriesScheduler();
}
