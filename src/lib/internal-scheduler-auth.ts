import { NextResponse } from "next/server";

const INTERNAL_SCHEDULER_HEADER = "x-toonarr-internal-token";

export function authorizeInternalScheduler(request: Request) {
  const expectedToken = process.env.TOONARR_INTERNAL_SCHEDULER_TOKEN;

  if (!expectedToken) {
    return NextResponse.json(
      { error: "Internal scheduler token is not configured." },
      { status: 503 },
    );
  }

  const providedToken = request.headers.get(INTERNAL_SCHEDULER_HEADER);

  if (!providedToken || providedToken !== expectedToken) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  return null;
}
