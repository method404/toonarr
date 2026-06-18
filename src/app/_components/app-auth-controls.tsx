"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type AppAuthControlsProps = {
  locale: "ko" | "en";
};

export function AppAuthControls({ locale }: AppAuthControlsProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const label = locale === "ko" ? "로그아웃" : "Logout";

  return (
    <>
      <button
        type="button"
        className="button secondary top-nav-button"
        disabled={isPending}
        onClick={() => {
          setError("");

          startTransition(async () => {
            try {
              const response = await fetch("/api/app-auth/session", {
                method: "DELETE",
              });

              if (!response.ok) {
                throw new Error("Failed to sign out.");
              }

              router.replace("/login");
              router.refresh();
            } catch {
              setError(locale === "ko" ? "로그아웃 실패" : "Logout failed");
            }
          });
        }}
      >
        {label}
      </button>
      {error ? <span className="top-nav-error">{error}</span> : null}
    </>
  );
}
