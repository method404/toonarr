import { NextResponse } from "next/server";
import { authorizeInternalScheduler } from "@/lib/internal-scheduler-auth";
import { runNaverSessionKeepalive } from "@/lib/naver-session-scheduler";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const unauthorized = authorizeInternalScheduler(request);

  if (unauthorized) {
    return unauthorized;
  }

  try {
    const result = await runNaverSessionKeepalive();

    return NextResponse.json({
      ok: true,
      skipped: result.skipped,
      action: result.action,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to run Naver session scheduler.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
