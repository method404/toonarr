import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import {
  buildSeriesSlug,
  deleteSeriesEpisodeInLibrary,
} from "@/lib/library-store";

type RouteContext = {
  params: Promise<{
    titleId: string;
    no: string;
  }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const params = await context.params;
    const titleId = Number(params.titleId);
    const no = Number(params.no);

    if (
      !Number.isInteger(titleId) ||
      titleId <= 0 ||
      !Number.isInteger(no) ||
      no <= 0
    ) {
      return NextResponse.json({ error: "Invalid episode delete payload." }, { status: 400 });
    }

    const entry = await deleteSeriesEpisodeInLibrary(titleId, no);
    const slug = buildSeriesSlug(entry.title, entry.titleId);

    revalidatePath("/series");
    revalidatePath(`/series/${slug}`);

    return NextResponse.json({ ok: true, entry });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete episode.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
