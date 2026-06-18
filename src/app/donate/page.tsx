import Image from "next/image";
import QRCode from "qrcode";
import { CopyAddressButton } from "@/app/donate/_components/copy-address-button";
import { DONATION_METHODS } from "@/lib/donate-config";

async function buildMethods() {
  return Promise.all(
    DONATION_METHODS.map(async (method) => ({
      ...method,
      qrDataUrl: method.address
        ? await QRCode.toDataURL(method.address, {
            margin: 1,
            width: 220,
            color: {
              dark: "#12171d",
              light: "#ffffffff",
            },
          })
        : null,
    })),
  );
}

export default async function DonatePage() {
  const methods = await buildMethods();

  return (
    <main className="donate-page">
      <section className="donate-shell">
        <header className="donate-header">
          <div>
            <p className="donate-kicker">Toonarr</p>
            <h1>Donate</h1>
          </div>
          <p className="donate-description">
            Edit <code>src/lib/donate-config.ts</code> to change wallet addresses.
            QR codes regenerate automatically from the address value.
          </p>
        </header>

        <section className="donate-method-list">
          {methods.map((method) => (
            <article key={method.id} className="donate-method-card">
              <div className="donate-method-copy">
                <div className="donate-method-heading">
                  <div>
                    <p className="donate-method-symbol">{method.symbol}</p>
                    <h2>{method.label}</h2>
                  </div>
                  <span className="donate-method-network">{method.network}</span>
                </div>

                <div className="donate-address-block">
                  <p className="donate-address-label">Wallet Address</p>
                  <p className={`donate-address-value${method.address ? "" : " empty"}`}>
                    {method.address || "Set the wallet address to generate the QR code."}
                  </p>
                </div>

                <div className="donate-method-actions">
                  <CopyAddressButton address={method.address} />
                </div>
              </div>

              <div className="donate-qr-panel">
                {method.qrDataUrl ? (
                  <Image
                    src={method.qrDataUrl}
                    alt={`${method.symbol} donation QR`}
                    width={220}
                    height={220}
                    unoptimized
                    className="donate-qr-image"
                  />
                ) : (
                  <div className="donate-qr-placeholder">
                    <span>QR</span>
                  </div>
                )}
              </div>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}
