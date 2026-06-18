import { NextResponse } from "next/server";
import {
  getNaverBrowserLoginStatus,
  startNaverBrowserLogin,
  stopNaverBrowserLogin,
} from "@/lib/naver-login-browser";

export const runtime = "nodejs";

type StartNaverBrowserLoginBody = {
  username?: string;
  password?: string;
};

export async function GET() {
  return NextResponse.json({
    login: await getNaverBrowserLoginStatus(),
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as StartNaverBrowserLoginBody;
    const login = await startNaverBrowserLogin({
      username: body.username,
      password: body.password,
    });
    return NextResponse.json({ ok: true, login });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to start browser login.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const login = await stopNaverBrowserLogin();
    return NextResponse.json({ ok: true, login });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to stop browser login.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
