import { NextResponse } from "next/server";
import { getStoredNaverRemoteAuthAttempt } from "@/lib/naver-remote-auth";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const attempt = await getStoredNaverRemoteAuthAttempt(token);

  if (!attempt) {
    return new NextResponse("Remote login attempt was not found.", { status: 404 });
  }

  const loginUrl = new URL("https://nid.naver.com/nidlogin.login");
  loginUrl.searchParams.set("url", attempt.callbackUrl);
  loginUrl.searchParams.set("svctype", "1");
  loginUrl.searchParams.set("locale", "ko_KR");
  loginUrl.searchParams.set("smart_LEVEL", "1");

  return NextResponse.redirect(loginUrl);
}
