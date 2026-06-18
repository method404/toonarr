import { cookies } from "next/headers";

export const supportedLocales = ["ko", "en"] as const;

export type Locale = (typeof supportedLocales)[number];

export const defaultLocale: Locale = "ko";

export function normalizeLocale(value: string | null | undefined): Locale {
  if (value && supportedLocales.includes(value as Locale)) {
    return value as Locale;
  }

  return defaultLocale;
}

export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();

  return normalizeLocale(cookieStore.get("naverrr-locale")?.value);
}
