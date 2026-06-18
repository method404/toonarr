import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import {
  buildSeriesSlug,
  deleteSeriesFromLibrary,
  unmonitorSeriesInLibrary,
} from "@/lib/library-store";

type RouteContext = {
  params: Promise<{
    titleId: string;
  }>;
};

type DeleteSeriesBody = {
  action?: "unmonitor" | "delete";
};

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const params = await context.params;
    const titleId = Number(params.titleId);

    if (!Number.isInteger(titleId) || titleId <= 0) {
      return NextResponse.json({ error: "Invalid titleId." }, { status: 400 });
    }

    const body = (await request.json()) as DeleteSeriesBody;

    if (body.action === "unmonitor") {
      const entry = await unmonitorSeriesInLibrary(titleId);
      const slug = buildSeriesSlug(entry.title, entry.titleId);
      revalidatePath("/series");
      revalidatePath(`/series/${slug}`);
      return NextResponse.json({ ok: true, action: body.action, entry });
    }

    if (body.action === "delete") {
      const entry = await deleteSeriesFromLibrary(titleId);
      const slug = buildSeriesSlug(entry.title, entry.titleId);
      revalidatePath("/series");
      revalidatePath(`/series/${slug}`);
      return NextResponse.json({ ok: true, action: body.action, entry });
    }

    return NextResponse.json({ error: "Invalid delete action." }, { status: 400 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete series.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
