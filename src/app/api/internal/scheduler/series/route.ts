import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { authorizeInternalScheduler } from "@/lib/internal-scheduler-auth";
import { runScheduledRefresh } from "@/lib/series-scheduler";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const unauthorized = authorizeInternalScheduler(request);

  if (unauthorized) {
    return unauthorized;
  }

  try {
    const result = await runScheduledRefresh();

    revalidatePath("/series");
    revalidatePath("/activity");

    return NextResponse.json({
      ok: true,
      skipped: result.skipped,
      count: result.itemsProcessed,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to run series scheduler.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
