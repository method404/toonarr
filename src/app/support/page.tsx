import { getLocale } from "@/lib/locale";

export default async function SupportPage() {
  const locale = await getLocale();

  return (
    <main className="login-page">
      <div className="login-shell">
        <section className="login-panel">
          <div className="login-panel-header">
            <h1>{locale === "ko" ? "후원하기" : "Support"}</h1>
          </div>
          <p className="muted">
            {locale === "ko"
              ? "추후 암호화폐 후원 랜딩 페이지로 교체할 자리입니다."
              : "Placeholder page for a future crypto donation landing page."}
          </p>
        </section>
      </div>
    </main>
  );
}
