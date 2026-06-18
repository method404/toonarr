"use client";

import { useState, useTransition } from "react";
import type { Locale } from "@/lib/locale";

type OpenStoragePathButtonProps = {
  locale: Locale;
  path: string;
};

export function OpenStoragePathButton({
  locale,
  path,
}: OpenStoragePathButtonProps) {
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const labels = {
    error:
      locale === "ko"
        ? "저장 경로를 열지 못했습니다."
        : "Failed to open storage path.",
  };

  const handleOpen = () => {
    if (isPending) {
      return;
    }

    setError("");

    startTransition(async () => {
      try {
        const response = await fetch("/api/system/open-path", {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({ path }),
        });

        if (!response.ok) {
          throw new Error(`Open path failed: ${response.status}`);
        }
      } catch {
        setError(labels.error);
      }
    });
  };

  return (
    <>
      <button
        type="button"
        className="series-storage-path-button"
        onClick={handleOpen}
        disabled={isPending}
        title={path}
      >
        <strong>{path}</strong>
      </button>
      {error ? <span className="series-storage-path-error">{error}</span> : null}
    </>
  );
}
