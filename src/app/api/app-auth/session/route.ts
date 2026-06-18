import { NextResponse } from "next/server";
import {
  APP_AUTH_COOKIE,
  createAppSessionToken,
  resolveLoginRedirectPath,
  verifyAppPassword,
} from "@/lib/app-auth";
import { getAppSettings, updateAppSettings } from "@/lib/app-settings";

export const runtime = "nodejs";

type LoginBody = {
  username?: string;
  password?: string;
  redirectPath?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LoginBody;
    const settings = await getAppSettings();
    const username = body.username?.trim() ?? "";
    const password = body.password ?? "";

    if (
      settings.security.authMode !== "form" ||
      !settings.security.username ||
      !settings.security.passwordHash ||
      !settings.security.passwordSalt
    ) {
      return NextResponse.json(
        { error: "Application authentication is not configured." },
        { status: 400 },
      );
    }

    if (
      username !== settings.security.username ||
      !verifyAppPassword(
        password,
        settings.security.passwordSalt,
        settings.security.passwordHash,
      )
    ) {
      return NextResponse.json(
        { error: "Invalid username or password." },
        { status: 401 },
      );
    }

    let sessionSecret = settings.security.sessionSecret;

    if (!sessionSecret) {
      const rotated = await updateAppSettings({
        authMode: settings.security.authMode,
        authRequired: settings.security.authRequired,
        username: settings.security.username,
        passwordHash: settings.security.passwordHash,
        passwordSalt: settings.security.passwordSalt,
      });
      sessionSecret = rotated.security.sessionSecret;
    }

    if (!sessionSecret) {
      return NextResponse.json(
        { error: "Application authentication session is not ready." },
        { status: 500 },
      );
    }

    const token = await createAppSessionToken(settings.security.username, sessionSecret);
    const response = NextResponse.json({
      ok: true,
      redirectPath: resolveLoginRedirectPath(body.redirectPath),
    });

    response.cookies.set(APP_AUTH_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to sign in.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });

  response.cookies.set(APP_AUTH_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
  });

  return response;
}
