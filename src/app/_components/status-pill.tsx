import type { ReactNode } from "react";

type StatusTone = "good" | "warn" | "bad" | "accent" | "neutral";

type StatusPillProps = {
  tone: StatusTone;
  children: ReactNode;
};

export function StatusPill({ tone, children }: StatusPillProps) {
  return <span className={`pill ${tone}`}>{children}</span>;
}
