"use client";

import Image from "next/image";
import { useEffect, useState, useTransition } from "react";
import type { NaverCredentialSummary } from "@/lib/naver-credentials";
import type { Locale } from "@/lib/locale";
import type {
  NaverRemoteAuthAttemptSummary,
  NaverRemoteAuthState,
} from "@/lib/naver-remote-auth";
import type { NaverSessionSummary } from "@/lib/naver-session";

type NaverSessionSettingsProps = {
  locale: Locale;
  initialSession: NaverSessionSummary;
  initialCredentials: NaverCredentialSummary;
};

function formatDateTime(value: string | null, locale: Locale) {
  if (!value) {
    return locale === "ko" ? "없음" : "None";
  }

  try {
    return new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function getAdultAccessLabel(value: boolean | null, locale: Locale) {
  if (value === null) {
    return locale === "ko" ? "미확인" : "Unknown";
  }

  return value
    ? locale === "ko"
      ? "가능"
      : "Available"
    : locale === "ko"
      ? "불가"
      : "Unavailable";
}

function getRemoteAuthStateLabel(state: NaverRemoteAuthState, locale: Locale) {
  if (locale !== "ko") {
    switch (state) {
      case "pending":
        return "Waiting for login";
      case "verified":
        return "Login confirmed";
      case "capturing":
        return "Saving session";
      case "completed":
        return "Completed";
      case "failed":
        return "Failed";
      case "expired":
        return "Expired";
      default:
        return "Idle";
    }
  }

  switch (state) {
    case "pending":
      return "로그인 대기";
    case "verified":
      return "로그인 확인됨";
    case "capturing":
      return "세션 저장 중";
    case "completed":
      return "완료";
    case "failed":
      return "실패";
    case "expired":
      return "만료됨";
    default:
      return "대기 없음";
  }
}

async function fetchSessionSummary() {
  const response = await fetch("/api/settings/naver-session", {
    cache: "no-store",
  });
  const payload = (await response.json()) as {
    session?: NaverSessionSummary;
  };

  return response.ok ? payload.session ?? null : null;
}

export function NaverSessionSettings({
  locale,
  initialSession,
  initialCredentials,
}: NaverSessionSettingsProps) {
  const [session, setSession] = useState(initialSession);
  const [credentials, setCredentials] = useState(initialCredentials);
  const [username, setUsername] = useState(initialCredentials.username ?? "");
  const [password, setPassword] = useState("");
  const [remoteAttempt, setRemoteAttempt] = useState<NaverRemoteAuthAttemptSummary | null>(
    null,
  );
  const [remoteQrDataUrl, setRemoteQrDataUrl] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pendingAction, setPendingAction] = useState<
    "credentialSave" | "credentialClear" | "remoteStart" | null
  >(null);
  const [isPending, startTransition] = useTransition();

  const labels = {
    credentials: locale === "ko" ? "네이버 계정" : "Naver account",
    username: locale === "ko" ? "네이버 ID" : "Naver ID",
    password: locale === "ko" ? "비밀번호" : "Password",
    status: locale === "ko" ? "상태" : "Status",
    lastUsedAt: locale === "ko" ? "마지막 자동 로그인" : "Last auto login",
    adultAccess:
      locale === "ko" ? "성인컨텐츠 접근" : "Adult content access",
    remoteLogin:
      locale === "ko" ? "원격 로그인" : "Remote sign-in",
    saveAccount: locale === "ko" ? "계정 저장" : "Save account",
    savingAccount: locale === "ko" ? "저장 중..." : "Saving...",
    startRemoteLogin:
      locale === "ko" ? "원격 로그인 시작" : "Start remote sign-in",
    startingRemoteLogin:
      locale === "ko" ? "링크 생성 중..." : "Creating link...",
    clearAccount: locale === "ko" ? "계정 삭제" : "Delete account",
    clearingAccount: locale === "ko" ? "삭제 중..." : "Deleting...",
    configuredSummary:
      locale === "ko" ? "저장됨" : "Saved",
    notConfiguredSummary:
      locale === "ko" ? "저장되지 않음" : "Not saved",
    credentialSaved:
      locale === "ko"
        ? "자동 로그인용 계정을 저장했습니다."
        : "Saved account for automatic sign-in.",
    credentialCleared:
      locale === "ko" ? "저장된 계정을 삭제했습니다." : "Stored account deleted.",
    remoteStarted:
      locale === "ko"
        ? "원격 로그인 링크를 만들었습니다. 외부 브라우저에서 로그인하고 '이 기기에서 2단계 인증 요청 안함'을 체크하세요."
        : "Created a remote sign-in link. Complete login in an external browser and enable trusted device.",
    credentialError:
      locale === "ko" ? "계정 저장에 실패했습니다." : "Failed to save account.",
    remoteError:
      locale === "ko"
        ? "원격 로그인 링크를 만들지 못했습니다."
        : "Failed to create remote sign-in link.",
    remoteGuide:
      locale === "ko"
        ? "PC나 휴대폰에서 아래 링크 또는 QR을 열고 네이버 로그인과 브라우저 신뢰 설정을 완료하세요."
        : "Open the link or QR below on another device and finish Naver login with trusted-device enabled.",
    remoteLink: locale === "ko" ? "원격 로그인 링크" : "Remote sign-in link",
    expiresAt: locale === "ko" ? "만료 시각" : "Expires at",
    openLink: locale === "ko" ? "링크 열기" : "Open link",
  };

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/settings/naver-session/remote", {
          cache: "no-store",
        });
        const payload = (await response.json()) as {
          attempt?: NaverRemoteAuthAttemptSummary;
          qrDataUrl?: string | null;
        };

        if (!response.ok || !payload.attempt) {
          return;
        }

        setRemoteAttempt(payload.attempt.configured ? payload.attempt : null);
        setRemoteQrDataUrl(payload.qrDataUrl ?? null);
      } catch {
        return;
      }
    })();
  }, []);

  useEffect(() => {
    if (
      !remoteAttempt ||
      !["pending", "verified", "capturing"].includes(remoteAttempt.state)
    ) {
      return;
    }

    const timer = window.setInterval(async () => {
      try {
        const response = await fetch("/api/settings/naver-session/remote", {
          cache: "no-store",
        });
        const payload = (await response.json()) as {
          attempt?: NaverRemoteAuthAttemptSummary;
          qrDataUrl?: string | null;
        };

        if (!response.ok || !payload.attempt) {
          return;
        }

        setRemoteAttempt(payload.attempt.configured ? payload.attempt : null);
        setRemoteQrDataUrl(payload.qrDataUrl ?? null);

        if (payload.attempt.state === "completed") {
          const nextSession = await fetchSessionSummary();

          if (nextSession) {
            setSession(nextSession);
          }

          setMessage(
            locale === "ko"
              ? "원격 로그인이 끝났고 네이버 세션을 저장했습니다."
              : "Remote sign-in finished and the Naver session was saved.",
          );
          setError("");
        }
      } catch {
        return;
      }
    }, 2000);

    return () => {
      window.clearInterval(timer);
    };
  }, [locale, remoteAttempt]);

  return (
    <div className="settings-page">
      <section className="settings-panel">
        <header className="settings-panel-header">
          <h2>{labels.credentials}</h2>
        </header>

        <div className="settings-form-grid">
          <div className="settings-form-row">
            <div className="settings-form-label">
              <h3>{labels.username}</h3>
            </div>
            <div className="settings-form-control">
              <input
                className="settings-input"
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                spellCheck={false}
              />
            </div>
          </div>

          <div className="settings-form-row">
            <div className="settings-form-label">
              <h3>{labels.password}</h3>
            </div>
            <div className="settings-form-control">
              <input
                className="settings-input"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                spellCheck={false}
              />
            </div>
          </div>

          <div className="settings-form-row">
            <div className="settings-form-label">
              <h3>{labels.status}</h3>
            </div>
            <div className="settings-form-control">
              <p className="settings-summary-line">
                {credentials.configured
                  ? labels.configuredSummary
                  : labels.notConfiguredSummary}
              </p>
            </div>
          </div>

          <div className="settings-form-row">
            <div className="settings-form-label">
              <h3>{labels.adultAccess}</h3>
            </div>
            <div className="settings-form-control">
              <strong className="settings-inline-value">
                {getAdultAccessLabel(session.adultAccess, locale)}
              </strong>
            </div>
          </div>

          <div className="settings-form-row">
            <div className="settings-form-label">
              <h3>{labels.lastUsedAt}</h3>
            </div>
            <div className="settings-form-control">
              <strong className="settings-inline-value">
                {formatDateTime(credentials.lastUsedAt, locale)}
              </strong>
            </div>
          </div>

          <div className="settings-form-row">
            <div className="settings-form-label">
              <h3>{labels.remoteLogin}</h3>
            </div>
            <div className="settings-form-control">
              <strong className="settings-inline-value">
                {getRemoteAuthStateLabel(remoteAttempt?.state ?? "idle", locale)}
              </strong>

              {remoteAttempt?.configured && remoteAttempt.startUrl ? (
                <div className="settings-remote-auth-box">
                  <p className="settings-meta-note">{labels.remoteGuide}</p>

                  {remoteQrDataUrl ? (
                    <div className="settings-remote-auth-qr">
                      <Image
                        src={remoteQrDataUrl}
                        alt="Remote login QR"
                        width={220}
                        height={220}
                        unoptimized
                      />
                    </div>
                  ) : null}

                  <div className="settings-remote-auth-link-row">
                    <span className="settings-remote-auth-label">{labels.remoteLink}</span>
                    <input
                      className="settings-input"
                      type="text"
                      readOnly
                      value={remoteAttempt.startUrl}
                    />
                  </div>

                  <div className="settings-inline-actions">
                    <a
                      className="button"
                      href={remoteAttempt.startUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {labels.openLink}
                    </a>
                  </div>

                  <p className="settings-meta-note">
                    {labels.expiresAt}: {formatDateTime(remoteAttempt.expiresAt, locale)}
                  </p>

                  {remoteAttempt.error ? (
                    <p className="settings-error-inline">{remoteAttempt.error}</p>
                  ) : null}
                </div>
              ) : (
                <p className="settings-meta-note">{labels.remoteGuide}</p>
              )}
            </div>
          </div>
        </div>

        <div className="settings-panel-footer settings-panel-footer-split">
          <div className="settings-inline-actions">
            <button
              type="button"
              className="button button-success"
              disabled={isPending || username.trim().length === 0 || password.length === 0}
              onClick={() => {
                setMessage("");
                setError("");
                setPendingAction("credentialSave");

                startTransition(async () => {
                  try {
                    const response = await fetch("/api/settings/naver-credentials", {
                      method: "PUT",
                      headers: {
                        "content-type": "application/json",
                      },
                      body: JSON.stringify({ username, password }),
                    });
                    const payload = (await response.json()) as {
                      error?: string;
                      credentials?: NaverCredentialSummary;
                    };

                    if (!response.ok || !payload.credentials) {
                      throw new Error(payload.error ?? labels.credentialError);
                    }

                    setCredentials(payload.credentials);
                    setUsername(payload.credentials.username ?? "");
                    setPassword("");
                    setMessage(labels.credentialSaved);
                    setError("");
                  } catch (requestError) {
                    setError(
                      requestError instanceof Error
                        ? requestError.message
                        : labels.credentialError,
                    );
                  } finally {
                    setPendingAction(null);
                  }
                });
              }}
            >
              {pendingAction === "credentialSave" && isPending
                ? labels.savingAccount
                : labels.saveAccount}
            </button>

            <button
              type="button"
              className="button"
              disabled={
                isPending ||
                (!credentials.configured &&
                  (username.trim().length === 0 || password.length === 0))
              }
              onClick={() => {
                setMessage("");
                setError("");
                setPendingAction("remoteStart");

                startTransition(async () => {
                  try {
                    let nextCredentials = credentials;

                    if (!credentials.configured && username.trim() && password.length > 0) {
                      const credentialResponse = await fetch(
                        "/api/settings/naver-credentials",
                        {
                          method: "PUT",
                          headers: {
                            "content-type": "application/json",
                          },
                          body: JSON.stringify({ username, password }),
                        },
                      );
                      const credentialPayload = (await credentialResponse.json()) as {
                        error?: string;
                        credentials?: NaverCredentialSummary;
                      };

                      if (!credentialResponse.ok || !credentialPayload.credentials) {
                        throw new Error(credentialPayload.error ?? labels.credentialError);
                      }

                      nextCredentials = credentialPayload.credentials;
                      setCredentials(credentialPayload.credentials);
                      setUsername(credentialPayload.credentials.username ?? "");
                      setPassword("");
                    }

                    if (!nextCredentials.configured) {
                      throw new Error(labels.credentialError);
                    }

                    const response = await fetch("/api/settings/naver-session/remote", {
                      method: "POST",
                    });
                    const payload = (await response.json()) as {
                      error?: string;
                      attempt?: NaverRemoteAuthAttemptSummary;
                      qrDataUrl?: string | null;
                    };

                    if (!response.ok || !payload.attempt) {
                      throw new Error(payload.error ?? labels.remoteError);
                    }

                    setRemoteAttempt(payload.attempt);
                    setRemoteQrDataUrl(payload.qrDataUrl ?? null);
                    setMessage(labels.remoteStarted);
                    setError("");
                  } catch (requestError) {
                    setError(
                      requestError instanceof Error
                        ? requestError.message
                        : labels.remoteError,
                    );
                  } finally {
                    setPendingAction(null);
                  }
                });
              }}
            >
              {pendingAction === "remoteStart" && isPending
                ? labels.startingRemoteLogin
                : labels.startRemoteLogin}
            </button>
          </div>

          <div className="settings-inline-actions">
            <button
              type="button"
              className="button button-danger"
              disabled={isPending || !credentials.configured}
              onClick={() => {
                setMessage("");
                setError("");
                setPendingAction("credentialClear");

                startTransition(async () => {
                  try {
                    const response = await fetch("/api/settings/naver-credentials", {
                      method: "DELETE",
                    });
                    const payload = (await response.json()) as {
                      error?: string;
                    };

                    if (!response.ok) {
                      throw new Error(payload.error ?? labels.credentialError);
                    }

                    setCredentials({
                      configured: false,
                      username: null,
                      updatedAt: null,
                      lastUsedAt: null,
                    });
                    setSession({
                      configured: false,
                      updatedAt: null,
                      lastValidatedAt: null,
                      isValid: null,
                      adultAccess: null,
                      lastError: null,
                      cookieNames: [],
                      requiredCookies: {
                        nidAut: false,
                        nidSes: false,
                      },
                      maskedCookieHeader: "",
                    });
                    setRemoteAttempt(null);
                    setRemoteQrDataUrl(null);
                    setUsername("");
                    setPassword("");
                    setMessage(labels.credentialCleared);
                    setError("");
                  } catch (requestError) {
                    setError(
                      requestError instanceof Error
                        ? requestError.message
                        : labels.credentialError,
                    );
                  } finally {
                    setPendingAction(null);
                  }
                });
              }}
            >
              {pendingAction === "credentialClear" && isPending
                ? labels.clearingAccount
                : labels.clearAccount}
            </button>
          </div>
        </div>
      </section>

      {session.lastError ? (
        <p className="settings-error-inline">{session.lastError}</p>
      ) : null}
      {message ? <p className="settings-success-inline">{message}</p> : null}
      {error ? <p className="settings-error-inline">{error}</p> : null}
    </div>
  );
}
