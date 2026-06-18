import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { validateStoredNaverSession } from "@/lib/naver-session";

export const runtime = "nodejs";

export async function POST() {
  try {
    const session = await validateStoredNaverSession();
    revalidatePath("/settings");

    return NextResponse.json({ ok: true, session });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to validate Naver session.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
