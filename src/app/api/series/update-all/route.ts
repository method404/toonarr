import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { forceRefreshAllStoredSeries } from "@/lib/library-store";

export async function POST() {
  try {
    const entries = await forceRefreshAllStoredSeries();

    revalidatePath("/series");

    return NextResponse.json({ ok: true, count: entries.length });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update all series.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
