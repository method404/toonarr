"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/locale";

type LocaleSwitcherProps = {
  currentLocale: Locale;
  label: string;
  optionKo: string;
  optionEn: string;
  hideLabel?: boolean;
};

export function LocaleSwitcher({
  currentLocale,
  label,
  optionKo,
  optionEn,
  hideLabel = false,
}: LocaleSwitcherProps) {
  const router = useRouter();
  const [value, setValue] = useState(currentLocale);
  const [pending, setPending] = useState(false);

  async function updateLocale(nextLocale: Locale) {
    setValue(nextLocale);
    setPending(true);

    await fetch("/api/preferences/locale", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ locale: nextLocale }),
    });

    startTransition(() => {
      router.refresh();
    });

    setPending(false);
  }

  return (
    <label className="locale-switcher">
      {hideLabel ? null : <span>{label}</span>}
      <select
        aria-label={label}
        value={value}
        disabled={pending}
        onChange={(event) => {
          void updateLocale(event.target.value as Locale);
        }}
      >
        <option value="ko">{optionKo}</option>
        <option value="en">{optionEn}</option>
      </select>
    </label>
  );
}
