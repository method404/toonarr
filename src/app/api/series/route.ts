import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAppSettings } from "@/lib/app-settings";
import { addSeriesToLibrary } from "@/lib/library-store";
import type { MonitorMode } from "@/lib/types";

export const runtime = "nodejs";

type AddSeriesBody = {
  titleId?: number;
  rootFolder?: string;
  monitorMode?: MonitorMode;
};

const validMonitorModes = new Set<MonitorMode>(["all", "future", "none"]);

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AddSeriesBody;
    const settings = await getAppSettings();
    const titleId = body.titleId;
    const rootFolder =
      body.rootFolder?.trim() || settings.library.defaultRootFolder;
    const monitorMode =
      body.monitorMode ?? settings.library.defaultMonitorMode;

    if (
      typeof titleId !== "number" ||
      !Number.isInteger(titleId) ||
      titleId <= 0 ||
      !rootFolder ||
      !validMonitorModes.has(monitorMode as MonitorMode)
    ) {
      return NextResponse.json(
        { error: "Invalid series payload." },
        { status: 400 },
      );
    }

    const entry = await addSeriesToLibrary({
      titleId,
      rootFolder,
      monitorMode: monitorMode as MonitorMode,
    });

    revalidatePath("/series");

    return NextResponse.json({ ok: true, entry });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to store series.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
