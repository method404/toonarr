"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type SeriesDetailAutoRefreshProps = {
  active: boolean;
};

export function SeriesDetailAutoRefresh({
  active,
}: SeriesDetailAutoRefreshProps) {
  const router = useRouter();

  useEffect(() => {
    if (!active) {
      return;
    }

    const timer = window.setInterval(() => {
      router.refresh();
    }, 3000);

    return () => window.clearInterval(timer);
  }, [active, router]);

  return null;
}
