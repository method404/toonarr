import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { resetNaverBrowserLoginState } from "@/lib/naver-login-browser";
import { clearNaverRemoteAuthAttempt } from "@/lib/naver-remote-auth";
import {
  clearNaverSession,
  getNaverSessionSummary,
  saveNaverSession,
} from "@/lib/naver-session";

type SaveNaverSessionBody = {
  cookieHeader?: string;
};

export async function GET() {
  return NextResponse.json({
    session: await getNaverSessionSummary(),
  });
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as SaveNaverSessionBody;
    const cookieHeader = body.cookieHeader?.trim() ?? "";

    if (!cookieHeader) {
      return NextResponse.json(
        { error: "Cookie header is required." },
        { status: 400 },
      );
    }

    const session = await saveNaverSession(cookieHeader);
    revalidatePath("/settings");

    return NextResponse.json({ ok: true, session });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save Naver session.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  await clearNaverSession();
  await clearNaverRemoteAuthAttempt();
  await resetNaverBrowserLoginState();
  revalidatePath("/settings");
  return NextResponse.json({ ok: true });
}
