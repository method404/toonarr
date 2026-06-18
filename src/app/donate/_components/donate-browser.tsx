"use client";

import { useState } from "react";
import { CopyAddressButton } from "@/app/donate/_components/copy-address-button";
import type { Locale } from "@/lib/locale";

type DonationBrowserMethod = {
  id: "btc" | "eth" | "usdt_trx";
  symbol: string;
  network: string;
  label: string;
  address: string;
  iconUrl: string;
  qrDataUrl: string | null;
};

type DonateBrowserProps = {
  locale: Locale;
  methods: DonationBrowserMethod[];
};

export function DonateBrowser({ locale, methods }: DonateBrowserProps) {
  const [selectedId, setSelectedId] = useState<DonationBrowserMethod["id"]>(
    methods[0]?.id ?? "btc",
  );

  const selectedMethod =
    methods.find((method) => method.id === selectedId) ?? methods[0] ?? null;

  const labels = {
    address: locale === "ko" ? "지갑 주소" : "Wallet Address",
    empty:
      locale === "ko"
        ? "지갑 주소를 설정하면 QR 코드가 표시됩니다."
        : "Set a wallet address to display the QR code.",
    thanksTitle: locale === "ko" ? "감사합니다!" : "Thank you!",
    thanksBody:
      locale === "ko"
        ? "후원은 유지보수와 기능 개선에 직접적인 도움이 됩니다."
        : "Your support helps maintain and improve Toonarr.",
    github: locale === "ko" ? "GitHub" : "GitHub",
  };

  if (!selectedMethod) {
    return null;
  }

  return (
    <section className="donate-browser">
      <div className="donate-token-selector">
        <div className="donate-token-list">
          {methods.map((method) => (
            <button
              key={method.id}
              type="button"
              className={`donate-token-button${
                selectedMethod.id === method.id ? " active" : ""
              }`}
              onClick={() => setSelectedId(method.id)}
            >
              <img
                src={method.iconUrl}
                alt={method.symbol}
                width={52}
                height={52}
                className="donate-token-icon"
              />
              <span className="donate-token-meta">
                <strong>{method.symbol}</strong>
                <span>{method.network}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <article className="donate-method-card donate-method-card-active">
        <div className="donate-method-copy">
          <div className="donate-address-block">
            <p className="donate-address-label">{labels.address}</p>
            <div className="donate-address-row">
              <div
                className={`donate-address-inline${
                  selectedMethod.address ? "" : " empty"
                }`}
              >
                <p
                  className={`donate-address-value${
                    selectedMethod.address ? "" : " empty"
                  }`}
                >
                  {selectedMethod.address || labels.empty}
                </p>
                <CopyAddressButton address={selectedMethod.address} locale={locale} />
              </div>
            </div>
          </div>
        </div>

        <div className="donate-qr-panel">
          {selectedMethod.qrDataUrl ? (
            <img
              src={selectedMethod.qrDataUrl}
              alt={`${selectedMethod.symbol} donation QR`}
              width={220}
              height={220}
              className="donate-qr-image"
            />
          ) : (
            <div className="donate-qr-placeholder">
              <span>QR</span>
            </div>
          )}
        </div>
      </article>

      <section className="donate-note-card">
        <div className="donate-note-copy">
          <h2>{labels.thanksTitle}</h2>
          <p>{labels.thanksBody}</p>
        </div>
        <a
          href="https://github.com/method404"
          target="_blank"
          rel="noreferrer"
          className="donate-github-link"
        >
          <span className="donate-github-icon" aria-hidden="true">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 .5C5.649.5.5 5.649.5 12c0 5.084 3.292 9.398 7.86 10.921.575.106.785-.25.785-.555 0-.274-.01-1-.015-1.962-3.197.695-3.872-1.54-3.872-1.54-.523-1.328-1.278-1.681-1.278-1.681-1.045-.714.079-.699.079-.699 1.155.081 1.763 1.187 1.763 1.187 1.026 1.757 2.692 1.25 3.349.956.104-.743.402-1.25.731-1.538-2.552-.29-5.236-1.276-5.236-5.682 0-1.255.448-2.282 1.182-3.087-.119-.29-.512-1.458.112-3.04 0 0 .965-.309 3.163 1.179a10.96 10.96 0 0 1 2.88-.387c.977.004 1.963.132 2.882.387 2.196-1.488 3.159-1.18 3.159-1.18.627 1.583.234 2.751.115 3.041.736.805 1.18 1.832 1.18 3.087 0 4.417-2.688 5.389-5.25 5.673.413.355.781 1.054.781 2.125 0 1.534-.014 2.772-.014 3.148 0 .308.207.667.79.554C20.212 21.394 23.5 17.082 23.5 12 23.5 5.649 18.351.5 12 .5Z" />
            </svg>
          </span>
          <span className="donate-github-copy">
            <strong>{labels.github}</strong>
            <span>github.com/method404</span>
          </span>
        </a>
      </section>
    </section>
  );
}
