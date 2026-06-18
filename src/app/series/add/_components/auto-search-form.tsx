"use client";

import { useDeferredValue, useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";

type AutoSearchFormProps = {
  initialQuery: string;
  placeholder: string;
};

export function AutoSearchForm({
  initialQuery,
  placeholder,
}: AutoSearchFormProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState(initialQuery);
  const deferredQuery = useDeferredValue(query);
  const [isPending, startTransition] = useTransition();
  const isFirstRender = useRef(true);
  const committedQuery = useRef(initialQuery);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const timer = window.setTimeout(() => {
      if (deferredQuery === committedQuery.current) {
        return;
      }

      const params = new URLSearchParams();
      params.set("q", deferredQuery);
      committedQuery.current = deferredQuery;

      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    }, 260);

    return () => window.clearTimeout(timer);
  }, [deferredQuery, pathname, router]);

  return (
    <form
      className="inline-search-form add-series-search-form"
      role="search"
      onSubmit={(event) => event.preventDefault()}
    >
      <span className="add-series-search-icon" aria-hidden="true">
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
        onChange={(event) => setQuery(event.target.value)}
        autoComplete="off"
        spellCheck={false}
        aria-busy={isPending}
      />
    </form>
  );
}
