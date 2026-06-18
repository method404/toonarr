"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { AdultBadge } from "@/app/_components/adult-badge";
import type { Locale } from "@/lib/locale";
import type { MonitorMode } from "@/lib/types";

type SeriesSelectionModalItem = {
  id: string;
  titleId: number | null;
  title: string;
  thumbnailUrl: string;
  isAdult: boolean;
  sourceLabel?: string;
  authors?: string;
  rating?: string;
  overview?: string;
};

type SeriesSelectionModalProps = {
  item: SeriesSelectionModalItem;
  locale: Locale;
  defaultRootFolder: string;
  defaultMonitorMode: MonitorMode;
  onClose: () => void;
  onAdded?: (payload: { titleId: number; slug: string }) => void;
};

type DirectoryPayload = {
  currentPath: string;
  parentPath: string | null;
  roots: string[];
  directories: Array<{
    name: string;
    path: string;
  }>;
};

export function SeriesSelectionModal({
  item,
  locale,
  defaultRootFolder,
  defaultMonitorMode,
  onClose,
  onAdded,
}: SeriesSelectionModalProps) {
  const router = useRouter();
  const [rootFolder, setRootFolder] = useState(defaultRootFolder);
  const [monitorMode, setMonitorMode] =
    useState<MonitorMode>(defaultMonitorMode);
  const [error, setError] = useState("");
  const [isPathBrowserOpen, setIsPathBrowserOpen] = useState(false);
  const [isPathBrowserLoading, setIsPathBrowserLoading] = useState(false);
  const [pathBrowserError, setPathBrowserError] = useState("");
  const [pathBrowserPayload, setPathBrowserPayload] =
    useState<DirectoryPayload | null>(null);
  const [isPending, startTransition] = useTransition();

  const labels = {
    rootFolder: locale === "ko" ? "다운로드 경로" : "Download Path",
    monitor: locale === "ko" ? "모니터" : "Monitor",
    all: locale === "ko" ? "전체 회차" : "All Episodes",
    future: locale === "ko" ? "앞으로 올라올 회차만" : "Future Episodes",
    none: locale === "ko" ? "모니터 안 함" : "No Monitoring",
    close: locale === "ko" ? "닫기" : "Close",
    add: locale === "ko" ? `${item.title} 추가` : `Add ${item.title}`,
    defaultRoot: locale === "ko" ? "기본 루트 경로" : "Default root path",
    currentRoot: locale === "ko" ? "현재 선택 경로" : "Current selected path",
    customRoot: locale === "ko" ? "직접 선택" : "Browse",
    choosingRoot: locale === "ko" ? "불러오는 중..." : "Loading...",
    useCurrentRoot: locale === "ko" ? "이 경로 사용" : "Use this path",
    roots: locale === "ko" ? "루트" : "Roots",
    parent: locale === "ko" ? "상위 폴더" : "Up",
    noDirectories:
      locale === "ko" ? "하위 폴더가 없습니다." : "There are no subdirectories.",
    author: locale === "ko" ? "작가" : "Author",
    saving: locale === "ko" ? "저장 중..." : "Saving...",
    error:
      locale === "ko"
        ? "시리즈를 저장하지 못했습니다."
        : "Failed to save series.",
  };

  const rootFolderSelectValue =
    rootFolder === defaultRootFolder ? defaultRootFolder : "__current__";

  const loadDirectory = async (targetPath: string) => {
    setIsPathBrowserLoading(true);
    setPathBrowserError("");

    try {
      const query = new URLSearchParams({ path: targetPath });
      const response = await fetch(`/api/system/directories?${query.toString()}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as
        | ({ error?: string } & Partial<DirectoryPayload>)
        | null;

      if (!response.ok || !payload?.currentPath || !payload.roots) {
        throw new Error(payload?.error || labels.error);
      }

      setPathBrowserPayload({
        currentPath: payload.currentPath,
        parentPath: payload.parentPath ?? null,
        roots: payload.roots,
        directories: payload.directories ?? [],
      });
    } catch (requestError) {
      setPathBrowserError(
        requestError instanceof Error ? requestError.message : labels.error,
      );
    } finally {
      setIsPathBrowserLoading(false);
    }
  };

  const handleAdd = () => {
    if (item.titleId === null || isPending) {
      return;
    }

    setError("");

    startTransition(async () => {
      try {
        const response = await fetch("/api/series", {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            titleId: item.titleId,
            rootFolder,
            monitorMode,
          }),
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as
            | { error?: string }
            | null;
          throw new Error(payload?.error || `Series save failed: ${response.status}`);
        }

        const payload = (await response.json().catch(() => null)) as
          | { ok?: boolean; entry?: { titleId?: number; slug?: string } }
          | null;

        if (payload?.entry?.titleId && payload.entry.slug) {
          onAdded?.({
            titleId: payload.entry.titleId,
            slug: payload.entry.slug,
          });
        }

        router.refresh();
        onClose();
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        setError(message || labels.error);
      }
    });
  };

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <div className="series-modal-overlay" onClick={onClose}>
      <div
        className="series-modal-panel"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="series-modal-close"
          onClick={onClose}
          aria-label={labels.close}
        >
          ×
        </button>

        <div className="series-modal-content">
          <div className="series-modal-poster">
            {item.isAdult ? <AdultBadge size={24} /> : null}
            {item.thumbnailUrl ? (
              <Image
                src={item.thumbnailUrl}
                alt={item.title}
                width={480}
                height={623}
                unoptimized
              />
            ) : (
              <div className="series-modal-poster-fallback" />
            )}
          </div>

          <div className="series-modal-heading">
            <h2>{item.title}</h2>
            <div className="series-modal-meta">
              {item.rating ? (
                <span className="series-modal-rating">
                  <span className="weekday-star" aria-hidden="true">
                    ★
                  </span>
                  {item.rating}
                </span>
              ) : null}
              {item.authors ? (
                <span className="series-modal-author">
                  {labels.author} {item.authors}
                </span>
              ) : null}
            </div>
            {item.sourceLabel ? (
              <div className="badge-list">
                <span className="tag-badge">{item.sourceLabel}</span>
              </div>
            ) : null}
            {item.overview ? (
              <p className="series-modal-overview">{item.overview}</p>
            ) : null}

            <div className="series-modal-settings">
              <label className="series-modal-setting-row">
                <span>{labels.rootFolder}</span>
                <div className="series-modal-path-control">
                  <select
                    value={rootFolderSelectValue}
                    onChange={(event) => {
                      const nextValue = event.target.value;

                      if (nextValue === defaultRootFolder) {
                        setRootFolder(defaultRootFolder);
                        return;
                      }

                      if (nextValue === "__custom__") {
                        setIsPathBrowserOpen(true);
                        void loadDirectory(rootFolder);
                      }
                    }}
                  >
                    {rootFolder !== defaultRootFolder ? (
                      <option value="__current__">{labels.currentRoot}</option>
                    ) : null}
                    <option value={defaultRootFolder}>{labels.defaultRoot}</option>
                    <option value="__custom__">{labels.customRoot}</option>
                  </select>
                  <p className="series-modal-path-value">{rootFolder}</p>
                </div>
              </label>

              <label className="series-modal-setting-row">
                <span>{labels.monitor}</span>
                <select
                  value={monitorMode}
                  onChange={(event) =>
                    setMonitorMode(event.target.value as MonitorMode)
                  }
                >
                  <option value="all">{labels.all}</option>
                  <option value="future">{labels.future}</option>
                  <option value="none">{labels.none}</option>
                </select>
              </label>
            </div>

            {error ? <p className="series-modal-error">{error}</p> : null}
          </div>
        </div>

        <div className="series-modal-footer">
          <button
            type="button"
            className="button button-success"
            onClick={handleAdd}
            disabled={item.titleId === null || isPending}
          >
            {isPending ? labels.saving : labels.add}
          </button>
        </div>
      </div>

      {isPathBrowserOpen ? (
        <div
          className="path-browser-overlay"
          onClick={() => setIsPathBrowserOpen(false)}
        >
          <div
            className="path-browser-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="path-browser-header">
              <div>
                <h2>{labels.rootFolder}</h2>
                <p>{pathBrowserPayload?.currentPath || rootFolder}</p>
              </div>
              <button
                type="button"
                className="path-browser-close"
                onClick={() => setIsPathBrowserOpen(false)}
                aria-label={labels.close}
              >
                ×
              </button>
            </div>

            <div className="path-browser-toolbar">
              <span className="path-browser-toolbar-label">{labels.roots}</span>
              <div className="path-browser-root-list">
                {(pathBrowserPayload?.roots ?? []).map((root) => (
                  <button
                    key={root}
                    type="button"
                    className={`path-browser-root${
                      pathBrowserPayload?.currentPath === root ? " active" : ""
                    }`}
                    onClick={() => void loadDirectory(root)}
                  >
                    {root}
                  </button>
                ))}
              </div>
            </div>

            <div className="path-browser-actions">
              <button
                type="button"
                className="button secondary"
                disabled={!pathBrowserPayload?.parentPath || isPathBrowserLoading}
                onClick={() =>
                  pathBrowserPayload?.parentPath
                    ? void loadDirectory(pathBrowserPayload.parentPath)
                    : undefined
                }
              >
                {labels.parent}
              </button>
              <button
                type="button"
                className="button button-success"
                disabled={!pathBrowserPayload?.currentPath}
                onClick={() => {
                  if (pathBrowserPayload?.currentPath) {
                    setRootFolder(pathBrowserPayload.currentPath);
                  }
                  setIsPathBrowserOpen(false);
                }}
              >
                {labels.useCurrentRoot}
              </button>
            </div>

            <div className="path-browser-list">
              {isPathBrowserLoading ? (
                <div className="path-browser-empty">{labels.choosingRoot}</div>
              ) : pathBrowserError ? (
                <div className="path-browser-empty error">{pathBrowserError}</div>
              ) : pathBrowserPayload?.directories.length ? (
                pathBrowserPayload.directories.map((directory) => (
                  <button
                    key={directory.path}
                    type="button"
                    className="path-browser-item"
                    onClick={() => void loadDirectory(directory.path)}
                  >
                    <span className="path-browser-item-name">{directory.name}</span>
                    <span className="path-browser-item-path">{directory.path}</span>
                  </button>
                ))
              ) : (
                <div className="path-browser-empty">{labels.noDirectories}</div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
