"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { AdultBadge } from "@/app/_components/adult-badge";
import { SeriesSelectionModal } from "@/app/series/_components/series-selection-modal";
import type { Locale } from "@/lib/locale";
import type { MonitorMode } from "@/lib/types";
import type { WeekdayOrder, WeekdaySection } from "@/lib/naver-weekday";

type WeekdaySeriesBrowserProps = {
  filterItems: Array<{ key: WeekdayOrder; label: string }>;
  locale: Locale;
  order: WeekdayOrder;
  sections: WeekdaySection[];
  storedSeriesByTitleId: Record<string, string>;
  defaultRootFolder: string;
  defaultMonitorMode: MonitorMode;
  labels: {
    filters: string;
  };
};

export function WeekdaySeriesBrowser({
  filterItems,
  locale,
  order,
  sections,
  storedSeriesByTitleId,
  defaultRootFolder,
  defaultMonitorMode,
  labels,
}: WeekdaySeriesBrowserProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [storedMap, setStoredMap] = useState(storedSeriesByTitleId);

  const selectedItem =
    selectedId === null
      ? null
      : sections
          .flatMap((section) => section.items)
          .find((item) => item.id === selectedId) ?? null;

  return (
    <>
      <div className="weekday-board-wrap">
        <div className="weekday-filter-bar">
          <span className="weekday-filter-label">{labels.filters}</span>
          <div className="weekday-filter-list">
            {filterItems.map((item) => (
              <Link
                key={item.key}
                href={`/series/weekday?order=${item.key}`}
                className={`weekday-filter-chip${
                  order === item.key ? " active" : ""
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="weekday-board">
          {sections.map((section) => (
            <section key={section.key} className="weekday-section">
              <header className="weekday-section-header">
                <h2>{section.label}</h2>
              </header>

              <div className="weekday-column-list">
                {section.items.map((item) => {
                  const storedSlug =
                    item.titleId === null
                      ? null
                      : storedMap[String(item.titleId)] ?? null;

                  const cardContent = (
                    <>
                      <div className="weekday-thumb">
                        {item.isAdult ? (
                          <AdultBadge size={34} className="weekday-adult-badge" />
                        ) : null}
                        {item.thumbnailUrl ? (
                          <Image
                            src={item.thumbnailUrl}
                            alt={item.title}
                            width={480}
                            height={623}
                            unoptimized
                          />
                        ) : (
                          <div className="weekday-thumb-fallback" />
                        )}
                      </div>
                      <div className="weekday-title-line">
                        <div className="weekday-title-head">
                          <strong>{item.title}</strong>
                          {storedSlug ? (
                            <span className="tag-badge added-state-badge weekday-added-badge">
                              {locale === "ko" ? "이미 추가됨" : "Added"}
                            </span>
                          ) : null}
                          {item.isPaid ? (
                            <span className="tag-badge subtle-tag">
                              {locale === "ko" ? "유료" : "Paid"}
                            </span>
                          ) : null}
                        </div>
                        <span className="weekday-score">
                          <span className="weekday-star" aria-hidden="true">
                            ★
                          </span>
                          {item.starScore}
                        </span>
                      </div>
                    </>
                  );

                  if (storedSlug) {
                    return (
                      <Link
                        key={item.id}
                        href={`/series/${storedSlug}`}
                        className="weekday-tile weekday-tile-button"
                      >
                        {cardContent}
                      </Link>
                    );
                  }

                  return (
                    <button
                      key={item.id}
                      type="button"
                      className="weekday-tile weekday-tile-button"
                      onClick={() => setSelectedId(item.id)}
                    >
                      {cardContent}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
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
            authors: selectedItem.author,
            rating: selectedItem.starScore,
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
