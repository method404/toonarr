import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { resetNaverBrowserLoginState } from "@/lib/naver-login-browser";
import {
  clearNaverCredentials,
  getNaverCredentialSummary,
  saveNaverCredentials,
} from "@/lib/naver-credentials";
import { clearNaverRemoteAuthAttempt } from "@/lib/naver-remote-auth";
import { clearNaverSession } from "@/lib/naver-session";

type SaveNaverCredentialsBody = {
  username?: string;
  password?: string;
};

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    credentials: await getNaverCredentialSummary(),
  });
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as SaveNaverCredentialsBody;
    const credentials = await saveNaverCredentials(
      body.username ?? "",
      body.password ?? "",
    );

    revalidatePath("/settings");

    return NextResponse.json({ ok: true, credentials });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save credentials.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  await clearNaverCredentials();
  await clearNaverSession();
  await clearNaverRemoteAuthAttempt();
  await resetNaverBrowserLoginState();
  revalidatePath("/settings");
  return NextResponse.json({ ok: true });
}
