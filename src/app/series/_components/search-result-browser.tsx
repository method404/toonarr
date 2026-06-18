"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { AdultBadge } from "@/app/_components/adult-badge";
import { SeriesSelectionModal } from "@/app/series/_components/series-selection-modal";
import type { Locale } from "@/lib/locale";
import type { NaverSearchResult } from "@/lib/naver-search";

type SearchResultBrowserProps = {
  labels: {
    updatedCol: string;
    statusUnknown: string;
  };
  locale: Locale;
  results: NaverSearchResult[];
  storedSeriesByTitleId: Record<string, string>;
  defaultRootFolder: string;
  defaultMonitorMode: "all" | "future" | "none";
  initialSelectedId?: string;
};

export function SearchResultBrowser({
  labels,
  locale,
  results,
  storedSeriesByTitleId,
  defaultRootFolder,
  defaultMonitorMode,
  initialSelectedId,
}: SearchResultBrowserProps) {
  const [selectedId, setSelectedId] = useState<string | null>(
    initialSelectedId || null,
  );
  const [storedMap, setStoredMap] = useState(storedSeriesByTitleId);

  const selectedItem =
    selectedId === null
      ? null
      : results.find((result) => `${result.source}-${result.id}` === selectedId) ??
        null;

  return (
    <>
      <div className="search-result-list">
        {results.map((result) => {
          const itemId = `${result.source}-${result.id}`;
          const storedSlug =
            result.titleId === null
              ? null
              : storedMap[String(result.titleId)] ?? null;
          const cardContent = (
            <>
              <div className="search-result-poster">
                {result.isAdult ? <AdultBadge /> : null}
                {result.thumbnailUrl ? (
                  <Image
                    src={result.thumbnailUrl}
                    alt={result.title}
                    width={132}
                    height={190}
                    unoptimized
                  />
                ) : (
                  <div className="poster-fallback">
                    <span>{result.sourceLabel.slice(0, 2)}</span>
                  </div>
                )}
              </div>

              <div className="search-result-main">
                <div className="search-result-head">
                  <div className="search-result-heading">
                    <div className="search-result-title-row">
                      <h3>{result.title}</h3>
                      {storedSlug ? (
                        <span className="tag-badge added-state-badge">
                          {locale === "ko" ? "이미 추가됨" : "Added"}
                        </span>
                      ) : null}
                      <span className="tag-badge">{result.sourceLabel}</span>
                      {result.flags.map((flag) => (
                        <span key={flag} className="tag-badge subtle-tag">
                          {flag}
                        </span>
                      ))}
                    </div>
                    <div className="search-result-meta">
                      <span>{result.authors || "-"}</span>
                      <span>
                        {locale === "ko" ? "회차" : "Episodes"} {result.episodes}
                      </span>
                      <span>
                        {labels.updatedCol} {result.lastUpdated || "-"}
                      </span>
                      <span>
                        {locale === "ko" ? "상태" : "Status"}{" "}
                        {result.publish || labels.statusUnknown}
                      </span>
                    </div>
                  </div>
                </div>

                {result.synopsis ? (
                  <p className="search-result-overview">{result.synopsis}</p>
                ) : (
                  <p className="search-result-overview empty">
                    {labels.statusUnknown}
                  </p>
                )}

                <div className="search-result-foot">
                  <div className="badge-list">
                    {[...new Set([...result.genres, ...result.tags])]
                      .slice(0, 12)
                      .map((item) => (
                        <span key={item} className="tag-badge">
                          {item}
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
                key={itemId}
                href={`/series/${storedSlug}`}
                className="search-result-card"
              >
                {cardContent}
              </Link>
            );
          }

          return (
            <button
              key={itemId}
              type="button"
              className="search-result-card search-result-card-button"
              onClick={() => setSelectedId(itemId)}
            >
              {cardContent}
            </button>
          );
        })}
      </div>

      {selectedItem ? (
        <SeriesSelectionModal
          key={`${selectedItem.source}-${selectedItem.id}`}
          item={{
            id: `${selectedItem.source}-${selectedItem.id}`,
            titleId: selectedItem.titleId,
            title: selectedItem.title,
            thumbnailUrl: selectedItem.thumbnailUrl,
            isAdult: selectedItem.isAdult,
            sourceLabel: selectedItem.sourceLabel,
            authors: selectedItem.authors,
            overview: selectedItem.synopsis,
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
