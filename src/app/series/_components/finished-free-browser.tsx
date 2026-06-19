"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AdultBadge } from "@/app/_components/adult-badge";
import { SeriesSelectionModal } from "@/app/series/_components/series-selection-modal";
import type { Locale } from "@/lib/locale";
import type { MonitorMode } from "@/lib/types";

type BrowserOrder = "USER" | "UPDATE" | "STARSCORE";

type BrowserItem = {
  id: string;
  titleId: number | null;
  title: string;
  thumbnailUrl: string;
  authors: string;
  synopsis: string;
  episodes: number;
  lastUpdated: string;
  genres: string[];
  flags: string[];
  rating: string;
  isAdult: boolean;
  isPaid: boolean;
};

type FinishedFreeBrowserProps = {
  apiPath: string;
  basePath: string;
  filterItems: Array<{ key: BrowserOrder; label: string }>;
  initialItems: BrowserItem[];
  initialHasMore: boolean;
  initialPage: number;
  labels: {
    filters: string;
    episodes: string;
    updated: string;
    empty: string;
    emptyDescription: string;
    loading: string;
    end: string;
  };
  locale: Locale;
  order: BrowserOrder;
  storedSeriesByTitleId: Record<string, string>;
  defaultRootFolder: string;
  defaultMonitorMode: MonitorMode;
};

const PAGE_SIZE = 25;

function withOrder(base: string, order: BrowserOrder) {
  return `${base}${base.includes("?") ? "&" : "?"}order=${order}`;
}

function withPage(base: string, locale: Locale, order: BrowserOrder, page: number) {
  const divider = base.includes("?") ? "&" : "?";
  return `${base}${divider}order=${order}&page=${page}&pageSize=${PAGE_SIZE}&locale=${locale}`;
}

export function FinishedFreeBrowser({
  apiPath,
  basePath,
  filterItems,
  initialItems,
  initialHasMore,
  initialPage,
  labels,
  locale,
  order,
  storedSeriesByTitleId,
  defaultRootFolder,
  defaultMonitorMode,
}: FinishedFreeBrowserProps) {
  const [items, setItems] = useState(initialItems);
  const [storedMap, setStoredMap] = useState(storedSeriesByTitleId);
  const [page, setPage] = useState(initialPage);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const selectedItem =
    selectedId === null
      ? null
      : items.find((item) => item.id === selectedId) ?? null;

  useEffect(() => {
    if (!hasMore || isLoading) {
      return;
    }

    const sentinel = sentinelRef.current;

    if (!sentinel) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const firstEntry = entries[0];

        if (!firstEntry?.isIntersecting) {
          return;
        }

        setIsLoading(true);

        void fetch(withPage(apiPath, locale, order, page + 1), {
          cache: "no-store",
        })
          .then(async (response) => {
            if (!response.ok) {
              throw new Error(`Failed to load page: ${response.status}`);
            }

            return (await response.json()) as {
              items: BrowserItem[];
              page: number;
              hasMore: boolean;
            };
          })
          .then((payload) => {
            setItems((current) => {
              const existingIds = new Set(current.map((item) => item.id));
              const nextItems = payload.items.filter(
                (item) => !existingIds.has(item.id),
              );
              return [...current, ...nextItems];
            });
            setPage(payload.page);
            setHasMore(payload.hasMore);
          })
          .catch(() => {
            setHasMore(false);
          })
          .finally(() => {
            setIsLoading(false);
          });
      },
      { rootMargin: "320px 0px" },
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [apiPath, hasMore, isLoading, locale, order, page]);

  return (
    <>
      <div className="finished-free-page">
        <div className="weekday-filter-bar">
          <span className="weekday-filter-label">{labels.filters}</span>
          <div className="weekday-filter-list">
            {filterItems.map((item) => (
              <Link
                key={item.key}
                href={withOrder(basePath, item.key)}
                className={`weekday-filter-chip${order === item.key ? " active" : ""}`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        {items.length ? (
          <div className="search-result-list">
            {items.map((item) => {
              const storedSlug =
                item.titleId === null
                  ? null
                  : storedMap[String(item.titleId)] ?? null;

              const cardContent = (
                <>
                  <div className="search-result-poster">
                    {item.isAdult ? <AdultBadge /> : null}
                    {item.thumbnailUrl ? (
                      <Image
                        src={item.thumbnailUrl}
                        alt={item.title}
                        width={132}
                        height={190}
                        unoptimized
                      />
                    ) : (
                      <div className="poster-fallback">
                        <span>FF</span>
                      </div>
                    )}
                  </div>

                  <div className="search-result-main">
                    <div className="search-result-head">
                      <div className="search-result-heading">
                        <div className="search-result-title-row">
                          <h3>{item.title}</h3>
                          {storedSlug ? (
                            <span className="tag-badge added-state-badge">
                              {locale === "ko" ? "이미 추가됨" : "Added"}
                            </span>
                          ) : null}
                          {item.flags.map((flag) => (
                            <span key={flag} className="tag-badge subtle-tag">
                              {flag}
                            </span>
                          ))}
                        </div>
                        <div className="search-result-meta">
                          <span>{item.authors || "-"}</span>
                          <span>
                            {labels.episodes} {item.episodes}
                          </span>
                          <span>
                            {labels.updated} {item.lastUpdated || "-"}
                          </span>
                          <span>
                            <span className="weekday-star" aria-hidden="true">
                              ★
                            </span>
                            {item.rating}
                          </span>
                        </div>
                      </div>
                    </div>

                    <p
                      className={`search-result-overview${
                        item.synopsis ? "" : " empty"
                      }`}
                    >
                      {item.synopsis || labels.emptyDescription}
                    </p>

                    <div className="search-result-foot">
                      <div className="badge-list">
                        {item.genres.slice(0, 8).map((genre) => (
                          <span key={genre} className="tag-badge">
                            {genre}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              );

              if (storedSlug) {
                return (
                  <Link
                    key={item.id}
                    href={`/series/${storedSlug}`}
                    className="search-result-card"
                  >
                    {cardContent}
                  </Link>
                );
              }

              return (
                <button
                  key={item.id}
                  type="button"
                  className="search-result-card search-result-card-button"
                  onClick={() => setSelectedId(item.id)}
                >
                  {cardContent}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="series-empty-state">{labels.empty}</div>
        )}

        {items.length ? (
          <div className="finished-free-footer">
            {isLoading ? (
              <span className="finished-free-loading">{labels.loading}</span>
            ) : !hasMore ? (
              <span className="finished-free-end">{labels.end}</span>
            ) : null}
            <div ref={sentinelRef} className="finished-free-sentinel" aria-hidden="true" />
          </div>
        ) : null}
      </div>

      {selectedItem ? (
        <SeriesSelectionModal
          key={selectedItem.id}
          item={{
            id: selectedItem.id,
            titleId: selectedItem.titleId,
            title: selectedItem.title,
            thumbnailUrl: selectedItem.thumbnailUrl,
            isAdult: selectedItem.isAdult,
            isPaid: selectedItem.isPaid,
            authors: selectedItem.authors,
            overview: selectedItem.synopsis,
            rating: selectedItem.rating,
          }}
          locale={locale}
          defaultRootFolder={defaultRootFolder}
          defaultMonitorMode={defaultMonitorMode}
          onAdded={({ titleId, slug }) =>
            setStoredMap((current) => ({
              ...current,
              [String(titleId)]: slug,
            }))
          }
          onClose={() => setSelectedId(null)}
        />
      ) : null}
    </>
  );
}
