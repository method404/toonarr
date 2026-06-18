"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Locale } from "@/lib/locale";

type SeriesScheduleSettingsProps = {
  locale: Locale;
  titleId: number;
  checkIntervalHours: number;
  nextAirLabel: string;
};

const intervalOptions = [1, 6, 12, 24] as const;

export function SeriesScheduleSettings({
  locale,
  titleId,
  checkIntervalHours,
  nextAirLabel,
}: SeriesScheduleSettingsProps) {
  const router = useRouter();
  const [value, setValue] = useState(String(checkIntervalHours));
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const labels = {
    airDate: "Air Date",
    checkSchedule: locale === "ko" ? "체크 주기" : "Check Interval",
    hour: locale === "ko" ? "시간" : "hour",
    hours: locale === "ko" ? "시간" : "hours",
    saving: locale === "ko" ? "저장 중..." : "Saving...",
    error:
      locale === "ko"
        ? "체크 주기 저장에 실패했습니다."
        : "Failed to save check interval.",
  };

  const handleChange = (nextValue: string) => {
    setValue(nextValue);
    setError("");

    startTransition(async () => {
      try {
        const response = await fetch(`/api/series/${titleId}/settings`, {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            checkIntervalHours: Number(nextValue),
          }),
        });

        if (!response.ok) {
          throw new Error(`Settings save failed: ${response.status}`);
        }

        router.refresh();
      } catch {
        setError(labels.error);
      }
    });
  };

  return (
    <div className="series-schedule-bar">
      <div className="series-schedule-item">
        <span className="series-schedule-label">{labels.airDate}</span>
        <strong>{nextAirLabel}</strong>
      </div>

      <label className="series-schedule-item series-schedule-select">
        <span className="series-schedule-label">{labels.checkSchedule}</span>
        <select
          value={value}
          onChange={(event) => handleChange(event.target.value)}
          disabled={isPending}
        >
          {intervalOptions.map((option) => (
            <option key={option} value={option}>
              {option} {option === 1 ? labels.hour : labels.hours}
            </option>
          ))}
        </select>
      </label>

      {isPending ? <span className="series-schedule-status">{labels.saving}</span> : null}
      {error ? <span className="series-action-error">{error}</span> : null}
    </div>
  );
}
