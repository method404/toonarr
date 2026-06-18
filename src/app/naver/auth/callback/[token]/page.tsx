import Link from "next/link";
import { finalizeNaverRemoteAuth, markNaverRemoteAuthVerified } from "@/lib/naver-remote-auth";

const pageStyle: Record<string, string> = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  background: "#0a0d10",
  color: "#f5f7fa",
  padding: "24px",
};

const cardStyle: Record<string, string> = {
  width: "100%",
  maxWidth: "560px",
  borderRadius: "18px",
  background: "#12171c",
  border: "1px solid rgba(255,255,255,0.08)",
  padding: "28px",
  boxShadow: "0 18px 50px rgba(0,0,0,0.28)",
};

export const runtime = "nodejs";

export default async function NaverRemoteAuthCallbackPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  let isSuccess = false;
  let title = "원격 로그인 실패";
  let heading = "원격 로그인 시도를 확인하지 못했습니다.";
  let detail = "원격 로그인 처리 중 오류가 발생했습니다.";

  try {
    await markNaverRemoteAuthVerified(token);
    const attempt = await finalizeNaverRemoteAuth(token);
    isSuccess = attempt.state === "completed";
    title = isSuccess ? "원격 로그인 완료" : "원격 로그인 실패";
    heading = isSuccess
      ? "네이버 세션을 저장했습니다."
      : "세션 저장을 끝내지 못했습니다.";
    detail = isSuccess
      ? "Toonarr 계정 설정 화면으로 돌아가 상태를 확인하면 됩니다."
      : attempt.error ?? "로그인 확인은 끝났지만 서버에서 세션을 확보하지 못했습니다.";
  } catch (error) {
    detail =
      error instanceof Error ? error.message : "원격 로그인 처리 중 오류가 발생했습니다.";
  }

  return (
    <main style={pageStyle}>
      <section style={cardStyle}>
        <p style={{ color: isSuccess ? "#37c871" : "#ff7d6b", margin: 0 }}>{title}</p>
        <h1 style={{ fontSize: "28px", lineHeight: 1.2, margin: "10px 0 12px" }}>
          {heading}
        </h1>
        <p style={{ color: "rgba(255,255,255,0.72)", lineHeight: 1.6, margin: 0 }}>
          {detail}
        </p>
        <div style={{ display: "flex", gap: "12px", marginTop: "22px", flexWrap: "wrap" }}>
          <Link
            href="/settings/account"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: "160px",
              height: "42px",
              borderRadius: "12px",
              background: isSuccess ? "#00853d" : "#2b3138",
              color: "#ffffff",
              textDecoration: "none",
              fontWeight: "600",
              padding: "0 18px",
            }}
          >
            계정 설정으로 이동
          </Link>
        </div>
      </section>
    </main>
  );
}
