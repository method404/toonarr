"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import type { Locale } from "@/lib/locale";

type SeriesEpisodeManageMenuProps = {
  locale: Locale;
  titleId: number;
  no: number;
};

export function SeriesEpisodeManageMenu({
  locale,
  titleId,
  no,
}: SeriesEpisodeManageMenuProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const labels = {
    manage: locale === "ko" ? "관리" : "Manage",
    resave: locale === "ko" ? "다시저장" : "Re-save",
    delete: locale === "ko" ? "회차 삭제" : "Delete Episode",
    retryError:
      locale === "ko"
        ? "회차 다시저장에 실패했습니다."
        : "Failed to re-save episode.",
    deleteError:
      locale === "ko"
        ? "회차 삭제에 실패했습니다."
        : "Failed to delete episode.",
    deleteConfirm:
      locale === "ko"
        ? `${no}화를 삭제합니다. 계속할까요?`
        : `Delete episode ${no}?`,
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const runAction = (action: "resave" | "delete") => {
    if (isPending) {
      return;
    }

    if (action === "delete" && !window.confirm(labels.deleteConfirm)) {
      return;
    }

    setError("");
    setIsOpen(false);

    startTransition(async () => {
      try {
        const response = await fetch(
          `/api/series/${titleId}/episodes/${no}${action === "resave" ? "/retry" : ""}`,
          { method: action === "resave" ? "POST" : "DELETE" },
        );

        if (!response.ok) {
          throw new Error(`Episode action failed: ${response.status}`);
        }

        router.refresh();
      } catch {
        setError(action === "resave" ? labels.retryError : labels.deleteError);
      }
    });
  };

  return (
    <div ref={containerRef} className="series-episode-manage">
      <button
        type="button"
        className="series-episode-manage-trigger"
        aria-label={labels.manage}
        aria-expanded={isOpen}
        onClick={() => {
          if (!isPending) {
            setIsOpen((current) => !current);
          }
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <circle cx="8" cy="3" r="1.25" fill="currentColor" />
          <circle cx="8" cy="8" r="1.25" fill="currentColor" />
          <circle cx="8" cy="13" r="1.25" fill="currentColor" />
        </svg>
      </button>

      {isOpen ? (
        <div className="series-episode-manage-menu">
          <button
            type="button"
            className="series-episode-manage-item"
            disabled={isPending}
            onClick={() => runAction("resave")}
          >
            {labels.resave}
          </button>
          <button
            type="button"
            className="series-episode-manage-item danger"
            disabled={isPending}
            onClick={() => runAction("delete")}
          >
            {labels.delete}
          </button>
        </div>
      ) : null}

      {error ? <span className="series-episode-manage-error">{error}</span> : null}
    </div>
  );
}
