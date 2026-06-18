"use client";

import { useState } from "react";

type CopyAddressButtonProps = {
  address: string;
};

export function CopyAddressButton({ address }: CopyAddressButtonProps) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className="donate-copy-button"
      disabled={!address}
      onClick={async () => {
        if (!address) {
          return;
        }

        await navigator.clipboard.writeText(address);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      }}
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
