import QRCode from "qrcode";
import { DonateBrowser } from "@/app/donate/_components/donate-browser";
import { DONATION_METHODS } from "@/lib/donate-config";
import { getLocale } from "@/lib/locale";

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
  const locale = await getLocale();
  const methods = await buildMethods();

  return (
    <main className="donate-page">
      <section className="donate-shell">
        <header className="donate-header">
          <div>
            <h1>Donate</h1>
          </div>
        </header>

        <DonateBrowser locale={locale} methods={methods} />
      </section>
    </main>
  );
}
