"use client";

import { useState, useTransition } from "react";
import type { NaverCredentialSummary } from "@/lib/naver-credentials";
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
  const toonarrUrl =
    typeof window === "undefined" ? "http://NAS_IP:3000" : window.location.origin;
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pendingAction, setPendingAction] = useState<
    "credentialSave" | "credentialClear" | "bridgeCopy" | null
  >(null);
  const [isPending, startTransition] = useTransition();
  const bridgeCommand = `npm exec --yes --package=github:method404/toonarr toonarr-naver-bridge -- --toonarr-url ${toonarrUrl} --username "${username || "NAVER_ID"}"`;

  const labels = {
    credentials: locale === "ko" ? "네이버 계정" : "Naver account",
    username: locale === "ko" ? "네이버 ID" : "Naver ID",
    password: locale === "ko" ? "비밀번호" : "Password",
    status: locale === "ko" ? "상태" : "Status",
    lastUsedAt: locale === "ko" ? "마지막 자동 로그인" : "Last auto login",
    adultAccess:
      locale === "ko" ? "성인컨텐츠 접근" : "Adult content access",
    bridgeLogin:
      locale === "ko" ? "외부 PC 로그인" : "External PC sign-in",
    saveAccount: locale === "ko" ? "계정 저장" : "Save account",
    savingAccount: locale === "ko" ? "저장 중..." : "Saving...",
    copyBridgeCommand:
      locale === "ko" ? "명령 복사" : "Copy command",
    copyingBridgeCommand:
      locale === "ko" ? "복사 중..." : "Copying...",
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
    credentialError:
      locale === "ko" ? "계정 저장에 실패했습니다." : "Failed to save account.",
    bridgeCommand: locale === "ko" ? "실행 명령" : "Command",
    bridgeCopied:
      locale === "ko" ? "브릿지 명령을 복사했습니다." : "Copied the bridge command.",
    bridgeCopyError:
      locale === "ko" ? "명령 복사에 실패했습니다." : "Failed to copy the command.",
  };

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
              <h3>{labels.bridgeLogin}</h3>
            </div>
            <div className="settings-form-control">
              <div className="settings-remote-auth-box">
                <div className="settings-remote-auth-link-row">
                  <div className="settings-command-header">
                    <span className="settings-remote-auth-label">{labels.bridgeCommand}</span>
                    <button
                      type="button"
                      className="button settings-command-copy-button"
                      onClick={() => {
                        setMessage("");
                        setError("");
                        setPendingAction("bridgeCopy");

                        startTransition(async () => {
                          try {
                            if (!navigator.clipboard) {
                              throw new Error(labels.bridgeCopyError);
                            }
                            await navigator.clipboard.writeText(bridgeCommand);
                            setMessage(labels.bridgeCopied);
                            setError("");
                          } catch (requestError) {
                            setError(
                              requestError instanceof Error
                                ? requestError.message
                                : labels.bridgeCopyError,
                            );
                          } finally {
                            setPendingAction(null);
                          }
                        });
                      }}
                    >
                      {pendingAction === "bridgeCopy" && isPending
                        ? labels.copyingBridgeCommand
                        : labels.copyBridgeCommand}
                    </button>
                  </div>
                  <textarea
                    className="settings-input settings-command-input"
                    readOnly
                    value={bridgeCommand}
                  />
                </div>
              </div>
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
