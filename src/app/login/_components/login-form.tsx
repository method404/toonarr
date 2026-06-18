"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Locale } from "@/lib/locale";

type LoginFormProps = {
  locale: Locale;
  redirectPath: string;
};

export function LoginForm({ locale, redirectPath }: LoginFormProps) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const labels = {
    title: locale === "ko" ? "로그인" : "Sign in",
    username: locale === "ko" ? "아이디" : "Username",
    password: locale === "ko" ? "비밀번호" : "Password",
    submit: locale === "ko" ? "로그인" : "Sign in",
    submitting: locale === "ko" ? "로그인 중..." : "Signing in...",
    failure:
      locale === "ko"
        ? "로그인에 실패했습니다."
        : "Failed to sign in.",
  };

  return (
    <div className="login-shell">
      <form
        className="login-panel"
        onSubmit={(event) => {
          event.preventDefault();
          setError("");

          startTransition(async () => {
            try {
              const response = await fetch("/api/app-auth/session", {
                method: "POST",
                headers: {
                  "content-type": "application/json",
                },
                body: JSON.stringify({
                  username,
                  password,
                  redirectPath,
                }),
              });
              const payload = (await response.json()) as { error?: string };

              if (!response.ok) {
                throw new Error(payload.error ?? labels.failure);
              }

              router.replace(redirectPath);
              router.refresh();
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
        <div className="login-panel-header">
          <h1>{labels.title}</h1>
        </div>

        <div className="login-form-grid">
          <label className="login-field">
            <span>{labels.username}</span>
            <input
              className="settings-input"
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              spellCheck={false}
            />
          </label>

          <label className="login-field">
            <span>{labels.password}</span>
            <input
              className="settings-input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              spellCheck={false}
            />
          </label>
        </div>

        {error ? <p className="settings-error-inline">{error}</p> : null}

        <div className="login-actions">
          <button
            type="submit"
            className="button"
            disabled={isPending || username.trim().length === 0 || password.length === 0}
          >
            {isPending ? labels.submitting : labels.submit}
          </button>
        </div>
      </form>
    </div>
  );
}
