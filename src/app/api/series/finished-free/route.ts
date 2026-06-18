import { NextResponse } from "next/server";
import { normalizeLocale } from "@/lib/locale";
import {
  getNaverFinishedFreePage,
  type FinishedFreeOrder,
} from "@/lib/naver-finished-free";

function isFinishedFreeOrder(value: string | null): value is FinishedFreeOrder {
  return value === "USER" || value === "UPDATE" || value === "STARSCORE";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const locale = normalizeLocale(searchParams.get("locale"));
  const order = isFinishedFreeOrder(searchParams.get("order"))
    ? (searchParams.get("order") as FinishedFreeOrder)
    : "USER";
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Number(searchParams.get("pageSize") ?? "25");

  if (!Number.isInteger(page) || page <= 0 || !Number.isInteger(pageSize) || pageSize <= 0) {
    return NextResponse.json({ error: "Invalid pagination." }, { status: 400 });
  }

  try {
    const payload = await getNaverFinishedFreePage(locale, order, page, pageSize);
    return NextResponse.json(payload);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load finished free series.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
