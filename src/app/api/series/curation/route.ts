import { NextResponse } from "next/server";
import { normalizeLocale } from "@/lib/locale";
import { getNaverCurationPage, type CurationOrder } from "@/lib/naver-curation";

function isCurationOrder(value: string | null): value is CurationOrder {
  return value === "USER" || value === "UPDATE" || value === "STARSCORE";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const locale = normalizeLocale(searchParams.get("locale"));
  const type = searchParams.get("type")?.trim() ?? "";
  const id = Number(searchParams.get("id") ?? "0");
  const label = searchParams.get("label")?.trim() ?? "";
  const order = isCurationOrder(searchParams.get("order"))
    ? (searchParams.get("order") as CurationOrder)
    : "USER";
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Number(searchParams.get("pageSize") ?? "25");

  if (!type || !Number.isInteger(id) || id <= 0 || !Number.isInteger(page) || page <= 0) {
    return NextResponse.json({ error: "Invalid curation query." }, { status: 400 });
  }

  try {
    const payload = await getNaverCurationPage(locale, {
      type,
      id,
      order,
      page,
      pageSize,
      fallbackTitle: label || undefined,
    });

    return NextResponse.json(payload);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load curation page.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
