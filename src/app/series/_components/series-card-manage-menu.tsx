"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import type { Locale } from "@/lib/locale";

type SeriesCardManageMenuProps = {
  locale: Locale;
  titleId: number;
};

export function SeriesCardManageMenu({
  locale,
  titleId,
}: SeriesCardManageMenuProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [processingAction, setProcessingAction] = useState<
    "refresh" | "unmonitor" | "delete" | null
  >(null);

  const labels = {
    manage: locale === "ko" ? "관리" : "Manage",
    refresh: locale === "ko" ? "갱신하기" : "Refresh",
    remove: locale === "ko" ? "삭제하기" : "Delete",
    removeTitle: locale === "ko" ? "시리즈 삭제" : "Remove Series",
    removeBody:
      locale === "ko"
        ? "모니터링만 중지할지, 저장된 웹툰 파일까지 같이 삭제할지 선택합니다."
        : "Choose whether to stop monitoring only or delete the stored series files too.",
    unmonitor: locale === "ko" ? "모니터링 중지" : "Stop Monitoring",
    deletingFiles: locale === "ko" ? "시리즈 삭제" : "Delete Series",
    processing: locale === "ko" ? "처리 중..." : "Processing...",
    close: locale === "ko" ? "닫기" : "Close",
    refreshError:
      locale === "ko" ? "시리즈 갱신에 실패했습니다." : "Failed to refresh series.",
    deleteError:
      locale === "ko"
        ? "시리즈 삭제 처리에 실패했습니다."
        : "Failed to remove the series.",
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

  const handleRefresh = () => {
    if (isPending) {
      return;
    }

    setError("");
    setIsOpen(false);

    startTransition(async () => {
      try {
        setProcessingAction("refresh");
        const response = await fetch(`/api/series/${titleId}/refresh`, {
          method: "POST",
        });

        if (!response.ok) {
          throw new Error(`Refresh failed: ${response.status}`);
        }

        router.refresh();
      } catch {
        setError(labels.refreshError);
      } finally {
        setProcessingAction(null);
      }
    });
  };

  const handleDelete = (action: "unmonitor" | "delete") => {
    if (isPending) {
      return;
    }

    setError("");

    startTransition(async () => {
      try {
        setProcessingAction(action);
        const response = await fetch(`/api/series/${titleId}`, {
          method: "DELETE",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({ action }),
        });

        if (!response.ok) {
          throw new Error(`Delete failed: ${response.status}`);
        }

        setIsDeleteModalOpen(false);
        router.refresh();
      } catch {
        setError(labels.deleteError);
      } finally {
        setProcessingAction(null);
      }
    });
  };

  return (
    <>
      <div
        ref={containerRef}
        className="series-card-manage"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="series-card-manage-trigger"
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
          <div className="series-card-manage-menu">
            <button
              type="button"
              className="series-card-manage-item"
              disabled={isPending}
              onClick={handleRefresh}
            >
              {processingAction === "refresh" ? labels.processing : labels.refresh}
            </button>
            <button
              type="button"
              className="series-card-manage-item danger"
              disabled={isPending}
              onClick={() => {
                setIsOpen(false);
                setIsDeleteModalOpen(true);
              }}
            >
              {labels.remove}
            </button>
          </div>
        ) : null}

        {error ? <span className="series-card-manage-error">{error}</span> : null}
      </div>

      {isDeleteModalOpen ? (
        <div className="series-modal-overlay" onClick={() => setIsDeleteModalOpen(false)}>
          <div
            className="series-delete-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="series-modal-close"
              onClick={() => setIsDeleteModalOpen(false)}
              aria-label={labels.close}
            >
              ×
            </button>
            <div className="series-delete-modal-copy">
              <h2>{labels.removeTitle}</h2>
              <p>{labels.removeBody}</p>
            </div>
            <div className="series-delete-modal-actions">
              <button
                type="button"
                className="button secondary"
                onClick={() => handleDelete("unmonitor")}
                disabled={isPending}
              >
                {isPending && processingAction === "unmonitor"
                  ? labels.processing
                  : labels.unmonitor}
              </button>
              <button
                type="button"
                className="button series-delete-button"
                onClick={() => handleDelete("delete")}
                disabled={isPending}
              >
                {isPending && processingAction === "delete"
                  ? labels.processing
                  : labels.deletingFiles}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
