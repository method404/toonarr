import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { buildSeriesSlug, updateSeriesSettings } from "@/lib/library-store";

type RouteContext = {
  params: Promise<{
    titleId: string;
  }>;
};

type UpdateSeriesSettingsBody = {
  checkIntervalHours?: number;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const params = await context.params;
    const titleId = Number(params.titleId);
    const body = (await request.json()) as UpdateSeriesSettingsBody;
    const checkIntervalHours = body.checkIntervalHours;

    if (
      !Number.isInteger(titleId) ||
      titleId <= 0 ||
      !Number.isInteger(checkIntervalHours)
    ) {
      return NextResponse.json({ error: "Invalid settings payload." }, { status: 400 });
    }

    const entry = await updateSeriesSettings({
      titleId,
      checkIntervalHours: checkIntervalHours as number,
    });
    const slug = buildSeriesSlug(entry.title, entry.titleId);

    revalidatePath("/series");
    revalidatePath(`/series/${slug}`);

    return NextResponse.json({ ok: true, entry });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update settings.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
