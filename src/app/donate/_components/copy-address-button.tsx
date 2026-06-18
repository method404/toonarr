"use client";

import { useState } from "react";

type CopyAddressButtonProps = {
  address: string;
  locale?: "ko" | "en";
};

export function CopyAddressButton({
  address,
  locale = "ko",
}: CopyAddressButtonProps) {
  const [copied, setCopied] = useState(false);
  const label = copied
    ? locale === "ko"
      ? "복사됨"
      : "Copied"
    : locale === "ko"
      ? "주소 복사"
      : "Copy";

  return (
    <button
      type="button"
      className="donate-copy-button"
      disabled={!address}
      aria-label={label}
      title={label}
      onClick={async () => {
        if (!address) {
          return;
        }

        await navigator.clipboard.writeText(address);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      }}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M9 9.75A2.25 2.25 0 0 1 11.25 7.5h7.5A2.25 2.25 0 0 1 21 9.75v9A2.25 2.25 0 0 1 18.75 21h-7.5A2.25 2.25 0 0 1 9 18.75v-9Z"
          stroke="currentColor"
          strokeWidth="1.7"
        />
        <path
          d="M15 7.5V5.25A2.25 2.25 0 0 0 12.75 3h-7.5A2.25 2.25 0 0 0 3 5.25v9a2.25 2.25 0 0 0 2.25 2.25H9"
          stroke="currentColor"
          strokeWidth="1.7"
        />
      </svg>
    </button>
  );
}
