"use client";

import Image from "next/image";
import Link from "next/link";
import { useDeferredValue, useEffect, useRef, useState } from "react";
import { AdultBadge } from "@/app/_components/adult-badge";
import type { Locale } from "@/lib/locale";

type TopSeriesSearchResult = {
  id: string;
  titleId: number | null;
  source: "webtoon" | "challenge" | "bestChallenge";
  sourceLabel: string;
  title: string;
  thumbnailUrl: string;
  authors: string;
  publish: string;
  episodes: number;
  lastUpdated: string;
  flags: string[];
  isAdult: boolean;
  storedSlug: string | null;
};

type TopSeriesSearchProps = {
  locale: Locale;
  placeholder: string;
};

export function TopSeriesSearch({
  locale,
  placeholder,
}: TopSeriesSearchProps) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [results, setResults] = useState<TopSeriesSearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    const currentQuery = deferredQuery.trim();

    if (currentQuery.length === 0) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        setIsLoading(true);
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(currentQuery)}&locale=${locale}`,
          { signal: controller.signal },
        );

        if (!response.ok) {
          throw new Error(`Search failed: ${response.status}`);
        }

        const payload = (await response.json()) as {
          results?: TopSeriesSearchResult[];
        };

        setResults(payload.results ?? []);
        setIsOpen(true);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setResults([]);
          setIsOpen(true);
        }
      } finally {
        setIsLoading(false);
      }
    }, 220);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [deferredQuery, locale]);

  useEffect(() => {
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
  }, []);

  return (
    <form
      ref={containerRef}
      className="top-search-form"
      role="search"
      onSubmit={(event) => event.preventDefault()}
    >
      <span className="top-search-icon" aria-hidden="true">
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M11.217 10.276 14 13.06l-.94.94-2.784-2.783a5.333 5.333 0 1 1 .94-.94ZM6.667 10.667a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
            fill="currentColor"
          />
        </svg>
      </span>
      <input
        type="text"
        name="q"
        value={query}
        placeholder={placeholder}
        onChange={(event) => {
          const nextQuery = event.target.value;
          setQuery(nextQuery);

          if (nextQuery.trim().length === 0) {
            setResults([]);
            setIsOpen(false);
            setIsLoading(false);
          }
        }}
        onFocus={() => {
          if (results.length > 0 || deferredQuery.trim().length > 0) {
            setIsOpen(true);
          }
        }}
        autoComplete="off"
        spellCheck={false}
      />

      {isOpen ? (
        <div className="top-search-dropdown">
          {isLoading && results.length === 0 ? (
            <div className="top-search-empty">
              {locale === "ko" ? "검색 중..." : "Searching..."}
            </div>
          ) : results.length > 0 ? (
            <div className="top-search-result-list">
              {results.map((result) => {
                const href = result.storedSlug
                  ? `/series/${result.storedSlug}`
                  : `/series/add?q=${encodeURIComponent(query.trim())}&open=${encodeURIComponent(
                      `${result.source}-${result.id}`,
                    )}`;

                return (
                  <Link
                    key={`${result.source}-${result.id}`}
                    href={href}
                    className="top-search-result-item"
                    onClick={() => setIsOpen(false)}
                  >
                    <div className="top-search-result-poster">
                      {result.isAdult ? <AdultBadge size={18} /> : null}
                      {result.thumbnailUrl ? (
                        <Image
                          src={result.thumbnailUrl}
                          alt={result.title}
                          width={132}
                          height={190}
                          unoptimized
                        />
                      ) : (
                        <div className="top-search-result-fallback">
                          <span>{result.sourceLabel.slice(0, 2)}</span>
                        </div>
                      )}
                    </div>
                    <div className="top-search-result-main">
                      <div className="top-search-result-title-row">
                        <strong>{result.title}</strong>
                        <span className="tag-badge">{result.sourceLabel}</span>
                        {result.storedSlug ? (
                          <span className="tag-badge subtle-tag">
                            {locale === "ko" ? "저장됨" : "Stored"}
                          </span>
                        ) : null}
                      </div>
                      <div className="top-search-result-meta">
                        <span>{result.authors || "-"}</span>
                        <span>{result.publish || "-"}</span>
                        <span>
                          {locale === "ko" ? "회차" : "Episodes"} {result.episodes}
                        </span>
                        <span>
                          {locale === "ko" ? "업데이트" : "Updated"}{" "}
                          {result.lastUpdated || "-"}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : deferredQuery.trim().length > 0 ? (
            <div className="top-search-empty">
              {locale === "ko" ? "검색 결과가 없습니다." : "No results found."}
            </div>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
