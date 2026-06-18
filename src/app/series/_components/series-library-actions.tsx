"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Locale } from "@/lib/locale";

type SeriesLibraryActionsProps = {
  locale: Locale;
};

export function SeriesLibraryActions({
  locale,
}: SeriesLibraryActionsProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const labels = {
    updateAll: locale === "ko" ? "전체 갱신" : "Refresh All",
    updating: locale === "ko" ? "갱신 중..." : "Updating...",
    error:
      locale === "ko"
        ? "전체 갱신에 실패했습니다."
        : "Failed to update series metadata.",
  };

  const handleUpdateAll = () => {
    if (isPending) {
      return;
    }

    setError("");

    startTransition(async () => {
      try {
        const response = await fetch("/api/series/update-all", {
          method: "POST",
        });

        if (!response.ok) {
          throw new Error(`Update all failed: ${response.status}`);
        }

        router.refresh();
      } catch {
        setError(labels.error);
      }
    });
  };

  return (
    <div className="series-action-cluster">
      <button
        type="button"
        className="button series-toolbar-button series-update-button"
        onClick={handleUpdateAll}
        disabled={isPending}
      >
        <span className="series-update-button-icon" aria-hidden="true">
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M13.65 7.167A5.668 5.668 0 1 0 8 13.667c1.57 0 3.02-.636 4.06-1.717"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
            <path
              d="M10.833 2.333H13.667V5.167"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        {isPending ? labels.updating : labels.updateAll}
      </button>
      {error ? <span className="series-action-error">{error}</span> : null}
    </div>
  );
}
