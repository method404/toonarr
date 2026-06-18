"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Locale } from "@/lib/locale";

type SeriesDetailActionsProps = {
  locale: Locale;
  titleId: number;
};

export function SeriesDetailActions({
  locale,
  titleId,
}: SeriesDetailActionsProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [processingAction, setProcessingAction] = useState<
    "unmonitor" | "delete" | null
  >(null);

  const labels = {
    refresh: locale === "ko" ? "메타데이터 갱신" : "Refresh Metadata",
    refreshing: locale === "ko" ? "갱신 중..." : "Refreshing...",
    remove: locale === "ko" ? "삭제" : "Delete",
    removeTitle: locale === "ko" ? "시리즈 삭제" : "Remove Series",
    removeBody:
      locale === "ko"
        ? "모니터링만 중지할지, 저장된 웹툰 파일까지 같이 삭제할지 선택합니다."
        : "Choose whether to stop monitoring only or delete the stored series files too.",
    unmonitor: locale === "ko" ? "모니터링 중지" : "Stop Monitoring",
    deletingFiles: locale === "ko" ? "시리즈 삭제" : "Delete Series",
    processing: locale === "ko" ? "처리 중..." : "Processing...",
    close: locale === "ko" ? "닫기" : "Close",
    error:
      locale === "ko"
        ? "메타데이터 갱신에 실패했습니다."
        : "Failed to refresh metadata.",
    deleteError:
      locale === "ko"
        ? "시리즈 삭제 처리에 실패했습니다."
        : "Failed to remove the series.",
  };

  const handleRefresh = () => {
    if (isPending) {
      return;
    }

    setError("");

    startTransition(async () => {
      try {
        const response = await fetch(`/api/series/${titleId}/refresh`, {
          method: "POST",
        });

        if (!response.ok) {
          throw new Error(`Refresh failed: ${response.status}`);
        }

        router.refresh();
      } catch {
        setError(labels.error);
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

        if (action === "delete") {
          router.push("/series");
          router.refresh();
          return;
        }

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
      <div className="series-action-cluster">
        <button
          type="button"
          className="button button-success"
          onClick={handleRefresh}
          disabled={isPending}
        >
          {isPending ? labels.refreshing : labels.refresh}
        </button>
        <button
          type="button"
          className="button button-danger"
          onClick={() => setIsDeleteModalOpen(true)}
          disabled={isPending}
        >
          {labels.remove}
        </button>
        {error ? <span className="series-action-error">{error}</span> : null}
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
