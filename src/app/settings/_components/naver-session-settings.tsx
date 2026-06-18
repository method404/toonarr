"use client";

import { useEffect, useState, useTransition } from "react";
import type { NaverCredentialSummary } from "@/lib/naver-credentials";
import type { NaverBrowserLoginStatus } from "@/lib/naver-login-browser";
import type { Locale } from "@/lib/locale";
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

export function NaverSessionSettings({
  locale,
  initialSession,
  initialCredentials,
}: NaverSessionSettingsProps) {
  const [session, setSession] = useState(initialSession);
  const [credentials, setCredentials] = useState(initialCredentials);
  const [username, setUsername] = useState(initialCredentials.username ?? "");
  const [password, setPassword] = useState("");
  const [loginStatus, setLoginStatus] = useState<NaverBrowserLoginStatus>({
    state: "idle",
    message:
      locale === "ko"
        ? "브라우저 로그인 대기 중이 아닙니다."
        : "No browser login in progress.",
    startedAt: null,
    updatedAt: null,
    currentUrl: null,
    session: null,
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pendingAction, setPendingAction] = useState<
    "credentialSave" | "credentialClear" | null
  >(null);
  const [isPending, startTransition] = useTransition();

  const labels = {
    credentials: locale === "ko" ? "네이버 계정" : "Naver account",
    username: locale === "ko" ? "네이버 ID" : "Naver ID",
    password: locale === "ko" ? "비밀번호" : "Password",
    lastUsedAt: locale === "ko" ? "마지막 자동 로그인" : "Last auto login",
    adultAccess:
      locale === "ko" ? "성인컨텐츠 접근" : "Adult content access",
    saveAccount: locale === "ko" ? "계정 저장" : "Save account",
    savingAccount: locale === "ko" ? "저장 중..." : "Saving...",
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
    browserOpened:
      locale === "ko"
        ? "브라우저 로그인 창을 열었습니다. 로그인 성공 후 계정이 저장됩니다."
        : "Opened the browser login window. The account will be saved after login succeeds.",
    credentialError:
      locale === "ko" ? "계정 저장에 실패했습니다." : "Failed to save account.",
    browserOpenError:
      locale === "ko"
        ? "브라우저 로그인 창을 열지 못했습니다."
        : "Failed to open the browser login window.",
  };

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/settings/naver-session/login");
        const payload = (await response.json()) as {
          login?: NaverBrowserLoginStatus;
        };

        if (response.ok && payload.login) {
          setLoginStatus(payload.login);

          if (payload.login.session) {
            setSession(payload.login.session);
          }
        }
      } catch {
        return;
      }
    })();
  }, []);

  useEffect(() => {
    if (
      loginStatus.state !== "launching" &&
      loginStatus.state !== "waiting" &&
      loginStatus.state !== "capturing"
    ) {
      return;
    }

    const timer = window.setInterval(async () => {
      try {
        const response = await fetch("/api/settings/naver-session/login");
        const payload = (await response.json()) as {
          login?: NaverBrowserLoginStatus;
        };

        if (!response.ok || !payload.login) {
          return;
        }

        setLoginStatus(payload.login);

        if (payload.login.session) {
          setSession(payload.login.session);
          const credentialResponse = await fetch("/api/settings/naver-credentials", {
            cache: "no-store",
          }).catch(() => null);

          if (credentialResponse?.ok) {
            const credentialPayload = (await credentialResponse.json()) as {
              credentials?: NaverCredentialSummary;
            };

            if (credentialPayload.credentials) {
              setCredentials(credentialPayload.credentials);
              setUsername(credentialPayload.credentials.username ?? "");
            }
          }

          setPassword("");
          setMessage(
            locale === "ko"
              ? "브라우저 로그인 세션을 자동 저장했습니다."
              : "Browser login session captured automatically.",
          );
          setError("");
        }
      } catch {
        return;
      }
    }, 1500);

    return () => {
      window.clearInterval(timer);
    };
  }, [locale, loginStatus.state]);

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
              <h3>{locale === "ko" ? "상태" : "Status"}</h3>
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
        </div>

        <div className="settings-panel-footer settings-panel-footer-split">
          <div className="settings-inline-actions">
            <button
              type="button"
              className="button button-success"
              disabled={
                isPending ||
                username.trim().length === 0 ||
                password.length === 0 ||
                loginStatus.state === "launching" ||
                loginStatus.state === "waiting" ||
                loginStatus.state === "capturing"
              }
              onClick={() => {
                setMessage("");
                setError("");
                setPendingAction("credentialSave");

                startTransition(async () => {
                  try {
                    const response = await fetch("/api/settings/naver-session/login", {
                      method: "POST",
                      headers: {
                        "content-type": "application/json",
                      },
                      body: JSON.stringify({ username, password }),
                    });
                    const payload = (await response.json()) as {
                      error?: string;
                      login?: NaverBrowserLoginStatus;
                    };

                    if (!response.ok || !payload.login) {
                      throw new Error(payload.error ?? labels.browserOpenError);
                    }

                    setLoginStatus(payload.login);
                    setMessage(labels.browserOpened);
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
                    setLoginStatus({
                      state: "idle",
                      message:
                        locale === "ko"
                          ? "브라우저 로그인 대기 중이 아닙니다."
                          : "No browser login in progress.",
                      startedAt: null,
                      updatedAt: null,
                      currentUrl: null,
                      session: null,
                    });
                    setUsername("");
                    setPassword("");
                    setMessage(labels.credentialCleared);
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
