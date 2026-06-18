import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { buildSeriesSlug, refreshSeriesInLibrary } from "@/lib/library-store";

type RouteContext = {
  params: Promise<{
    titleId: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    const params = await context.params;
    const titleId = Number(params.titleId);

    if (!Number.isInteger(titleId) || titleId <= 0) {
      return NextResponse.json({ error: "Invalid titleId." }, { status: 400 });
    }

    const entry = await refreshSeriesInLibrary(titleId);
    const slug = buildSeriesSlug(entry.title, entry.titleId);

    revalidatePath("/series");
    revalidatePath(`/series/${slug}`);

    return NextResponse.json({ ok: true, entry });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to refresh series.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
