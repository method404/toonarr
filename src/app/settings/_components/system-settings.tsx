"use client";

import { ServerPathPicker } from "@/app/_components/server-path-picker";
import { useState, useTransition } from "react";
import type {
  AppAuthMode,
  AppAuthRequired,
  AppSettingsSummary,
} from "@/lib/app-settings";
import type { Locale } from "@/lib/locale";
import type { MonitorMode } from "@/lib/types";

type SystemSettingsProps = {
  locale: Locale;
  initialSettings: AppSettingsSummary;
};

export function SystemSettings({
  locale,
  initialSettings,
}: SystemSettingsProps) {
  const [rootFolder, setRootFolder] = useState(
    initialSettings.library.defaultRootFolder,
  );
  const [monitorMode, setMonitorMode] = useState<MonitorMode>(
    initialSettings.library.defaultMonitorMode,
  );
  const [authMode, setAuthMode] = useState<AppAuthMode>(
    initialSettings.security.authMode,
  );
  const [authRequired, setAuthRequired] = useState<AppAuthRequired>(
    initialSettings.security.authRequired,
  );
  const [authUsername, setAuthUsername] = useState(
    initialSettings.security.username,
  );
  const [authPassword, setAuthPassword] = useState("");
  const [authPasswordConfirm, setAuthPasswordConfirm] = useState("");
  const [passwordConfigured, setPasswordConfigured] = useState(
    initialSettings.security.passwordConfigured,
  );
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const labels = {
    library: locale === "ko" ? "다운로드" : "Downloads",
    security: locale === "ko" ? "보안" : "Security",
    rootFolder: locale === "ko" ? "기본 다운로드 경로" : "Default download path",
    monitor: locale === "ko" ? "기본 모니터" : "Default monitor",
    authentication: locale === "ko" ? "인증" : "Authentication",
    authRequired:
      locale === "ko" ? "인증 적용 범위" : "Authentication required",
    authUsername: locale === "ko" ? "관리자 ID" : "Admin username",
    authPassword: locale === "ko" ? "관리자 비밀번호" : "Admin password",
    authPasswordConfirm:
      locale === "ko" ? "관리자 비밀번호 확인" : "Confirm admin password",
    authNone: locale === "ko" ? "사용 안 함" : "Disabled",
    authForm: locale === "ko" ? "로그인 페이지" : "Login page",
    authAll: locale === "ko" ? "모든 주소" : "All addresses",
    authLocalBypass:
      locale === "ko" ? "로컬 주소는 생략" : "Bypass for local addresses",
    all: locale === "ko" ? "전체 회차" : "All episodes",
    future: locale === "ko" ? "앞으로 올라올 회차만" : "Future episodes only",
    none: locale === "ko" ? "모니터 안 함" : "No monitoring",
    pickFolder: locale === "ko" ? "직접 선택" : "Browse",
    pickingFolder: locale === "ko" ? "불러오는 중..." : "Loading...",
    useCurrentFolder: locale === "ko" ? "이 경로 사용" : "Use this path",
    close: locale === "ko" ? "닫기" : "Close",
    save: locale === "ko" ? "저장" : "Save",
    saving: locale === "ko" ? "저장 중..." : "Saving...",
    success:
      locale === "ko"
        ? "시스템 설정을 저장했습니다."
        : "Saved system settings.",
    failure:
      locale === "ko"
        ? "시스템 설정을 저장하지 못했습니다."
        : "Failed to save system settings.",
  };

  const requiresPasswordConfirmation =
    authMode === "form" &&
    authPassword.length > 0 &&
    authPassword !== authPasswordConfirm;

  return (
    <div className="settings-page">
      <section className="settings-panel">
        <header className="settings-panel-header">
          <h2>{labels.library}</h2>
        </header>

        <div className="settings-form-grid">
          <div className="settings-form-row">
            <div className="settings-form-label">
              <h3>{labels.rootFolder}</h3>
            </div>
            <div className="settings-form-control">
              <ServerPathPicker
                value={rootFolder}
                locale={locale}
                prompt={labels.rootFolder}
                chooseLabel={labels.pickFolder}
                choosingLabel={labels.pickingFolder}
                useCurrentLabel={labels.useCurrentFolder}
                closeLabel={labels.close}
                onChange={setRootFolder}
                showChooseButton={false}
              />
            </div>
          </div>

          <div className="settings-form-row">
            <div className="settings-form-label">
              <h3>{labels.monitor}</h3>
            </div>
            <div className="settings-form-control">
              <select
                className="settings-select"
                value={monitorMode}
                onChange={(event) => setMonitorMode(event.target.value as MonitorMode)}
              >
                <option value="all">{labels.all}</option>
                <option value="future">{labels.future}</option>
                <option value="none">{labels.none}</option>
              </select>
            </div>
          </div>
        </div>

      </section>

      <section className="settings-panel">
        <header className="settings-panel-header">
          <h2>{labels.security}</h2>
        </header>

        <div className="settings-form-grid">
          <div className="settings-form-row">
            <div className="settings-form-label">
              <h3>{labels.authentication}</h3>
            </div>
            <div className="settings-form-control">
              <select
                className="settings-select"
                value={authMode}
                onChange={(event) => setAuthMode(event.target.value as AppAuthMode)}
              >
                <option value="none">{labels.authNone}</option>
                <option value="form">{labels.authForm}</option>
              </select>
            </div>
          </div>

          <div className="settings-form-row">
            <div className="settings-form-label">
              <h3>{labels.authRequired}</h3>
            </div>
            <div className="settings-form-control">
              <select
                className="settings-select"
                value={authRequired}
                onChange={(event) =>
                  setAuthRequired(event.target.value as AppAuthRequired)
                }
                disabled={authMode !== "form"}
              >
                <option value="disabledForLocalAddresses">
                  {labels.authLocalBypass}
                </option>
                <option value="all">{labels.authAll}</option>
              </select>
            </div>
          </div>

          <div className="settings-form-row">
            <div className="settings-form-label">
              <h3>{labels.authUsername}</h3>
            </div>
            <div className="settings-form-control">
              <input
                className="settings-input"
                type="text"
                value={authUsername}
                onChange={(event) => setAuthUsername(event.target.value)}
                disabled={authMode !== "form"}
                autoComplete="username"
                spellCheck={false}
              />
            </div>
          </div>

          <div className="settings-form-row">
            <div className="settings-form-label">
              <h3>{labels.authPassword}</h3>
            </div>
            <div className="settings-form-control">
              <input
                className="settings-input"
                type="password"
                value={authPassword}
                onChange={(event) => setAuthPassword(event.target.value)}
                disabled={authMode !== "form"}
                autoComplete="new-password"
                spellCheck={false}
              />
            </div>
          </div>

          <div className="settings-form-row">
            <div className="settings-form-label">
              <h3>{labels.authPasswordConfirm}</h3>
            </div>
            <div className="settings-form-control">
              <input
                className="settings-input"
                type="password"
                value={authPasswordConfirm}
                onChange={(event) => setAuthPasswordConfirm(event.target.value)}
                disabled={authMode !== "form"}
                autoComplete="new-password"
                spellCheck={false}
              />
              {requiresPasswordConfirmation ? (
                <p className="settings-error-inline settings-inline-error">
                  {locale === "ko"
                    ? "관리자 비밀번호가 서로 다릅니다."
                    : "Admin passwords do not match."}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="settings-panel-footer">
          <button
            type="button"
            className="button"
            disabled={
              isPending ||
              rootFolder.trim().length === 0 ||
              (authMode === "form" &&
                (authUsername.trim().length === 0 ||
                  (!passwordConfigured && authPassword.length === 0) ||
                  requiresPasswordConfirmation))
            }
            onClick={() => {
              setMessage("");
              setError("");

              startTransition(async () => {
                try {
                  const response = await fetch("/api/settings/app", {
                    method: "PUT",
                    headers: {
                      "content-type": "application/json",
                    },
                    body: JSON.stringify({
                      defaultRootFolder: rootFolder,
                      defaultMonitorMode: monitorMode,
                      authMode,
                      authRequired,
                      username: authUsername,
                      password: authPassword,
                      passwordConfirm: authPasswordConfirm,
                    }),
                  });
                  const payload = (await response.json()) as {
                    error?: string;
                    settings?: AppSettingsSummary;
                  };

                  if (!response.ok || !payload.settings) {
                    throw new Error(payload.error ?? labels.failure);
                  }

                  setRootFolder(payload.settings.library.defaultRootFolder);
                  setMonitorMode(payload.settings.library.defaultMonitorMode);
                  setAuthMode(payload.settings.security.authMode);
                  setAuthRequired(payload.settings.security.authRequired);
                  setAuthUsername(payload.settings.security.username);
                  setPasswordConfigured(payload.settings.security.passwordConfigured);
                  setAuthPassword("");
                  setAuthPasswordConfirm("");
                  setMessage(labels.success);
                } catch (requestError) {
                  setError(
                    requestError instanceof Error
                      ? requestError.message
                      : labels.failure,
                  );
                }
              });
            }}
          >
            {isPending ? labels.saving : labels.save}
          </button>
        </div>
      </section>

      {message ? <p className="settings-success-inline">{message}</p> : null}
      {error ? <p className="settings-error-inline">{error}</p> : null}
    </div>
  );
}
