"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Locale } from "@/lib/locale";

type SeriesEpisodeRetryButtonProps = {
  locale: Locale;
  titleId: number;
  no: number;
};

export function SeriesEpisodeRetryButton({
  locale,
  titleId,
  no,
}: SeriesEpisodeRetryButtonProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const labels = {
    retry: locale === "ko" ? "재시도" : "Retry",
    retrying: locale === "ko" ? "재시도 중..." : "Retrying...",
    error:
      locale === "ko"
        ? "회차 재시도에 실패했습니다."
        : "Failed to retry episode.",
  };

  return (
    <div className="series-episode-retry-wrap">
      <button
        type="button"
        className="series-episode-retry-button"
        disabled={isPending}
        onClick={() => {
          if (isPending) {
            return;
          }

          setError("");

          startTransition(async () => {
            try {
              const response = await fetch(
                `/api/series/${titleId}/episodes/${no}/retry`,
                { method: "POST" },
              );

              if (!response.ok) {
                throw new Error(`Retry failed: ${response.status}`);
              }

              router.refresh();
            } catch {
              setError(labels.error);
            }
          });
        }}
      >
        {isPending ? labels.retrying : labels.retry}
      </button>
      {error ? <span className="series-episode-retry-error">{error}</span> : null}
    </div>
  );
}
