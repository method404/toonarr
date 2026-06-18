"use client";

import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/locale";

type SeriesSynopsisProps = {
  locale: Locale;
  text: string;
};

const COLLAPSED_MAX_HEIGHT = 152;

export function SeriesSynopsis({ locale, text }: SeriesSynopsisProps) {
  const contentRef = useRef<HTMLParagraphElement | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [collapsible, setCollapsible] = useState(false);

  useEffect(() => {
    const element = contentRef.current;

    if (!element) {
      return;
    }

    const checkOverflow = () => {
      setCollapsible(element.scrollHeight > COLLAPSED_MAX_HEIGHT + 4);
    };

    checkOverflow();
    window.addEventListener("resize", checkOverflow);

    return () => {
      window.removeEventListener("resize", checkOverflow);
    };
  }, [text]);

  return (
    <div className="series-detail-summary-block">
      <p
        ref={contentRef}
        className={`series-detail-summary${expanded ? " expanded" : " collapsed"}`}
      >
        {text}
      </p>
      {collapsible ? (
        <button
          type="button"
          className="series-detail-summary-toggle"
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded
            ? locale === "ko"
              ? "접기"
              : "Show less"
            : locale === "ko"
              ? "더보기"
              : "Show more"}
        </button>
      ) : null}
    </div>
  );
}
