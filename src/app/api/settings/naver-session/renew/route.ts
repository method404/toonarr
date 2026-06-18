import { NextResponse } from "next/server";
import { renewNaverSessionWithStoredCredentials } from "@/lib/naver-login-browser";

export const runtime = "nodejs";

export async function POST() {
  try {
    const session = await renewNaverSessionWithStoredCredentials();

    return NextResponse.json({
      ok: Boolean(session),
      session,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to renew Naver session.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
