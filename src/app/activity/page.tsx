import { AdminShell } from "@/app/_components/admin-shell";
import { SectionCard } from "@/app/_components/section-card";
import { StatusPill } from "@/app/_components/status-pill";
import { getDictionary } from "@/lib/i18n";
import { getSeriesStorageSyncActivityTasks, getSeriesStorageSyncRecentJobs } from "@/lib/library-store";
import { getLocale } from "@/lib/locale";
import { getSeriesSchedulerRecentJobs } from "@/lib/series-scheduler";

const toneByTaskStatus = {
  queued: "neutral",
  running: "accent",
  delayed: "warn",
  blocked: "bad",
} as const;

const toneByJobStatus = {
  success: "good",
  running: "accent",
  warning: "warn",
  failed: "bad",
} as const;

export const dynamic = "force-dynamic";

function formatTimestamp(value: string | undefined, locale: "ko" | "en") {
  if (!value) {
    return "-";
  }

  try {
    return new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function getQueueLabel(value: string, locale: "ko" | "en") {
  switch (value) {
    case "series-add":
      return locale === "ko" ? "시리즈 추가" : "Series Add";
    case "series-refresh":
      return locale === "ko" ? "시리즈 갱신" : "Series Refresh";
    default:
      return value;
  }
}

function getTriggerLabel(value: string, locale: "ko" | "en") {
  switch (value) {
    case "series-add":
      return locale === "ko" ? "추가 요청" : "Add request";
    case "series-refresh":
      return locale === "ko" ? "갱신 요청" : "Refresh request";
    case "schedule":
      return locale === "ko" ? "스케줄러" : "Scheduler";
    default:
      return value;
  }
}

export default async function ActivityPage() {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const tasks = getSeriesStorageSyncActivityTasks();
  const jobs = [...getSeriesSchedulerRecentJobs(), ...getSeriesStorageSyncRecentJobs()]
    .sort((left, right) => {
      const leftTime = new Date(left.startedAt).getTime();
      const rightTime = new Date(right.startedAt).getTime();
      return rightTime - leftTime;
    })
    .slice(0, 12);

  const labels = {
    noTasks:
      locale === "ko"
        ? "현재 실행 중이거나 대기 중인 작업이 없습니다."
        : "There are no running or queued tasks right now.",
    noJobs:
      locale === "ko"
        ? "아직 기록된 실행 이력이 없습니다."
        : "There are no recorded runs yet.",
  };

  return (
    <AdminShell
      locale={locale}
      activePath="/activity"
      title={dict.activityPage.title}
      hideHeader
    >
      <section className="dashboard-grid">
        <SectionCard
          title={dict.activityPage.currentTasks}
        >
          <div className="table-wrap">
            <table className="data-table dense-table">
              <thead>
                <tr>
                  <th>{dict.common.title}</th>
                  <th>{dict.common.source}</th>
                  <th>{dict.common.queue}</th>
                  <th>{dict.common.status}</th>
                  <th>{dict.common.started}</th>
                  <th>{dict.activityPage.eta}</th>
                </tr>
              </thead>
              <tbody>
                {tasks.length ? (
                  tasks.map((task) => (
                    <tr key={task.id}>
                      <td>{task.name}</td>
                      <td>{task.sourceName}</td>
                      <td>{getQueueLabel(task.queue, locale)}</td>
                      <td>
                        <StatusPill tone={toneByTaskStatus[task.status]}>
                          {dict.statusLabels[task.status]}
                        </StatusPill>
                      </td>
                      <td>{formatTimestamp(task.startedAt, locale)}</td>
                      <td>{task.eta}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="table-empty-cell">
                      {labels.noTasks}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard
          eyebrow={dict.common.activity}
          title={dict.activityPage.schedulerRuns}
          description={dict.activityPage.schedulerRunsDesc}
        >
          {jobs.length ? (
            <div className="stack compact-stack">
              {jobs.map((job) => (
                <article key={job.id} className="list-row compact-row">
                  <div>
                    <strong>{job.name}</strong>
                    <p className="tiny">
                      {getTriggerLabel(job.trigger, locale)} ·{" "}
                      {formatTimestamp(job.startedAt, locale)}
                    </p>
                  </div>
                  <div className="queue-meta">
                    <StatusPill tone={toneByJobStatus[job.status]}>
                      {dict.statusLabels[job.status]}
                    </StatusPill>
                    <span className="tiny">
                      {job.itemsProcessed} {dict.activityPage.items}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="series-empty-state">{labels.noJobs}</div>
          )}
        </SectionCard>
      </section>
    </AdminShell>
  );
}
