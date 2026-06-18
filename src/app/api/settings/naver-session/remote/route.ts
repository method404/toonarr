import { NextResponse } from "next/server";
import QRCode from "qrcode";
import {
  clearNaverRemoteAuthAttempt,
  createNaverRemoteAuthAttempt,
  getNaverRemoteAuthAttemptSummary,
} from "@/lib/naver-remote-auth";

export const runtime = "nodejs";

function getRequestOrigin(request: Request) {
  const url = new URL(request.url);
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");
  const protocol = forwardedProto ?? url.protocol.replace(":", "");
  const host = forwardedHost ?? request.headers.get("host") ?? url.host;
  return `${protocol}://${host}`;
}

export async function GET() {
  const attempt = await getNaverRemoteAuthAttemptSummary();
  const qrDataUrl =
    attempt.configured && attempt.startUrl
      ? await QRCode.toDataURL(attempt.startUrl, {
          margin: 1,
          width: 220,
        }).catch(() => null)
      : null;

  return NextResponse.json({
    ok: true,
    attempt,
    qrDataUrl,
  });
}

export async function POST(request: Request) {
  try {
    const attempt = await createNaverRemoteAuthAttempt(getRequestOrigin(request));
    const qrDataUrl = attempt.startUrl
      ? await QRCode.toDataURL(attempt.startUrl, {
          margin: 1,
          width: 220,
        })
      : null;

    return NextResponse.json({
      ok: true,
      attempt,
      qrDataUrl,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to start remote login.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  await clearNaverRemoteAuthAttempt();
  return NextResponse.json({ ok: true });
}
