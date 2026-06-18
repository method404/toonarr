import { cookies } from "next/headers";
import { normalizeLocale } from "@/lib/locale";

export async function POST(request: Request) {
  const payload = (await request.json()) as { locale?: string };
  const locale = normalizeLocale(payload.locale);
  const cookieStore = await cookies();

  cookieStore.set("naverrr-locale", locale, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });

  return Response.json({ ok: true, locale });
}
