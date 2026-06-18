import type {
  ActivityTask,
  CollectionRule,
  DashboardSnapshot,
  HistoryEvent,
  JobRun,
  RuntimeConfig,
  SettingGroup,
  SeriesRecord,
  SourceAdapter,
  SystemWidget,
} from "@/lib/types";
import type { Locale } from "@/lib/locale";

function pick(locale: Locale, ko: string, en: string) {
  return locale === "ko" ? ko : en;
}

function getAdapters(locale: Locale): SourceAdapter[] {
  return [
    {
      id: "adapter-naver",
      name: "Naver Webtoon",
      mode: "html",
      status: "ready",
      notes: pick(
        locale,
        "가장 먼저 붙일 기본 HTML 파서 대상입니다.",
        "Baseline HTML parser target for the first real adapter.",
      ),
    },
    {
      id: "adapter-kakao",
      name: "KakaoPage",
      mode: "browser",
      status: "planned",
      notes: pick(
        locale,
        "세션 처리와 브라우저 자동화가 필요할 가능성이 높습니다.",
        "Likely requires session handling and browser automation.",
      ),
    },
    {
      id: "adapter-generic",
      name: pick(locale, "일반 HTML 소스", "Generic HTML source"),
      mode: "api",
      status: "degraded",
      notes: pick(
        locale,
        "커스텀 selector가 필요한 사이트용 임시 계약입니다.",
        "Placeholder contract for sites with custom selectors.",
      ),
    },
  ];
}

function getSeriesRecords(locale: Locale): SeriesRecord[] {
  return [
    {
      id: "series-1",
      title: "Dungeon Refresh",
      sourceName: "Naver Webtoon",
      status: "monitoring",
      monitored: true,
      tags: [
        pick(locale, "액션", "Action"),
        pick(locale, "일간", "Daily"),
      ],
      episodes: 184,
      qualityProfile: pick(locale, "원본 이미지 보관", "Original image archive"),
      pollCadence: pick(locale, "6시간마다", "Every 6 hours"),
      storagePath: "/data/webtoons/dungeon-refresh",
      lastSeen: "2026-06-18 10:20",
      nextCheck: "2026-06-18 16:00",
      sizeOnDisk: "8.2 GB",
    },
    {
      id: "series-2",
      title: "City Null Arc",
      sourceName: pick(locale, "일반 HTML", "Generic HTML"),
      status: "review",
      monitored: true,
      tags: [pick(locale, "수동 검토", "Manual review")],
      episodes: 63,
      qualityProfile: pick(locale, "메타데이터 + 이미지", "Metadata + images"),
      pollCadence: pick(locale, "매일 05:00", "Daily at 05:00"),
      storagePath: "/data/webtoons/city-null-arc",
      lastSeen: "2026-06-17 23:41",
      nextCheck: "2026-06-19 05:00",
      sizeOnDisk: "1.4 GB",
    },
    {
      id: "series-3",
      title: "Orbit Manual",
      sourceName: "KakaoPage",
      status: "paused",
      monitored: false,
      tags: [pick(locale, "로그인 필요", "Login wall")],
      episodes: 21,
      qualityProfile: pick(locale, "수동 승인", "Manual approval"),
      pollCadence: pick(locale, "수동만", "Manual only"),
      storagePath: "/data/webtoons/orbit-manual",
      lastSeen: "2026-06-13 18:05",
      nextCheck: pick(locale, "중지됨", "Paused"),
      sizeOnDisk: "460 MB",
    },
  ];
}

function getRulesRecords(locale: Locale): CollectionRule[] {
  return [
    {
      id: "rule-1",
      name: pick(locale, "일간 보관", "Daily archive"),
      cadence: pick(locale, "매일", "Daily"),
      retention: pick(locale, "이미지 전체 보관", "Archive all images"),
      freshnessWindowHours: 36,
      status: "active",
    },
    {
      id: "rule-2",
      name: pick(locale, "수동 인증 소스", "Manual gated source"),
      cadence: pick(locale, "수동", "Manual"),
      retention: pick(locale, "메타데이터만", "Metadata only"),
      freshnessWindowHours: 168,
      status: "draft",
    },
    {
      id: "rule-3",
      name: pick(locale, "저소음 알림", "Low-noise notifier"),
      cadence: pick(locale, "시간별", "Hourly"),
      retention: pick(locale, "알림만", "Notify only"),
      freshnessWindowHours: 12,
      status: "paused",
    },
  ];
}

function getJobsRecords(locale: Locale): JobRun[] {
  return [
    {
      id: "job-1",
      name: pick(locale, "일간 소스 점검", "Daily source sweep"),
      trigger: pick(locale, "스케줄", "schedule"),
      status: "success",
      itemsProcessed: 28,
      startedAt: "2026-06-18 05:00",
      finishedAt: "2026-06-18 05:03",
    },
    {
      id: "job-2",
      name: pick(locale, "수동 메타데이터 새로고침", "Manual metadata refresh"),
      trigger: pick(locale, "운영자", "operator"),
      status: "running",
      itemsProcessed: 7,
      startedAt: "2026-06-18 11:15",
    },
    {
      id: "job-3",
      name: pick(locale, "Kakao 로그인 재시도", "Kakao login retry"),
      trigger: pick(locale, "재시도", "retry"),
      status: "warning",
      itemsProcessed: 0,
      startedAt: "2026-06-18 07:00",
      finishedAt: "2026-06-18 07:01",
    },
  ];
}

function getRuntime(locale: Locale): RuntimeConfig {
  return {
    schedule: pick(locale, "20분마다 폴링", "Cron-driven poller every 20 minutes"),
    downloadRoot: "/data/webtoons",
    authMode: pick(
      locale,
      "관리자 UI + 어댑터별 시크릿 분리",
      "Admin-only UI with adapter-scoped secrets",
    ),
  };
}

function getTasksRecords(locale: Locale): ActivityTask[] {
  return [
    {
      id: "task-1",
      name: pick(locale, "시리즈 메타데이터 갱신", "Refresh series metadata"),
      sourceName: "Naver Webtoon",
      status: "running",
      queue: pick(locale, "메타데이터", "metadata"),
      startedAt: "2026-06-18 11:15",
      eta: pick(locale, "2분 남음", "2m left"),
    },
    {
      id: "task-2",
      name: pick(locale, "누락 회차 이미지 다운로드", "Download missing chapter images"),
      sourceName: pick(locale, "일반 HTML", "Generic HTML"),
      status: "queued",
      queue: pick(locale, "다운로드", "downloads"),
      startedAt: pick(locale, "대기 중", "Waiting"),
      eta: pick(locale, "task-1 이후 시작", "Starts after task-1"),
    },
    {
      id: "task-3",
      name: pick(locale, "어댑터 세션 재발급", "Renew adapter session"),
      sourceName: "KakaoPage",
      status: "blocked",
      queue: pick(locale, "인증", "auth"),
      startedAt: "2026-06-18 07:00",
      eta: pick(locale, "인증정보 필요", "Needs credentials"),
    },
  ];
}

function getHistoryRecords(locale: Locale): HistoryEvent[] {
  return [
    {
      id: "history-1",
      seriesTitle: "Dungeon Refresh",
      event: pick(locale, "184화 수집 완료", "Grabbed chapter 184"),
      result: "success",
      sourceName: "Naver Webtoon",
      at: "2026-06-18 05:03",
      detail: pick(
        locale,
        "12개 이미지가 /data/webtoons/dungeon-refresh/184 에 저장됨",
        "12 images archived to /data/webtoons/dungeon-refresh/184",
      ),
    },
    {
      id: "history-2",
      seriesTitle: "City Null Arc",
      event: pick(locale, "파서 불일치 감지", "Parser mismatch detected"),
      result: "warning",
      sourceName: pick(locale, "일반 HTML", "Generic HTML"),
      at: "2026-06-18 04:12",
      detail: pick(
        locale,
        "레이아웃 변경 이후 episode selector가 0개 노드를 반환함",
        "Episode selector returned 0 nodes after layout drift.",
      ),
    },
    {
      id: "history-3",
      seriesTitle: "Orbit Manual",
      event: pick(locale, "세션 갱신 실패", "Session refresh failed"),
      result: "error",
      sourceName: "KakaoPage",
      at: "2026-06-18 07:01",
      detail: pick(
        locale,
        "어댑터 secret 저장소에 로그인 쿠키가 없음",
        "Login cookie missing from adapter secret store.",
      ),
    },
  ];
}

function getSystemWidgetsRecords(locale: Locale): SystemWidget[] {
  return [
    {
      id: "sys-1",
      label: pick(locale, "디스크 루트", "Disk root"),
      value: "/data/webtoons",
      detail: pick(
        locale,
        "시리즈 파일과 manifest가 저장되는 마운트 볼륨입니다.",
        "Mounted volume for series payloads and manifests.",
      ),
      status: "success",
    },
    {
      id: "sys-2",
      label: pick(locale, "스케줄러", "Scheduler"),
      value: pick(locale, "20분마다 활성", "Active every 20m"),
      detail: pick(locale, "다음 기상: 2026-06-18 11:40", "Next wake: 2026-06-18 11:40"),
      status: "info",
    },
    {
      id: "sys-3",
      label: pick(locale, "어댑터 상태", "Adapter health"),
      value: pick(locale, "경고 1건", "1 warning"),
      detail: pick(
        locale,
        "KakaoPage가 인증정보 전달 대기 상태입니다.",
        "KakaoPage blocked pending credential handoff.",
      ),
      status: "warning",
    },
    {
      id: "sys-4",
      label: pick(locale, "쓰기 권한", "Write access"),
      value: pick(locale, "읽기/쓰기", "Read/Write"),
      detail: pick(
        locale,
        "컨테이너가 /app/data 아래에 폴더와 manifest를 생성할 수 있습니다.",
        "Container can create folders and manifests under /app/data.",
      ),
      status: "success",
    },
  ];
}

function getSettingsRecords(locale: Locale): SettingGroup[] {
  return [
    {
      id: "setting-1",
      title: pick(locale, "미디어 관리", "Media management"),
      description: pick(
        locale,
        "파일 시스템 구조, 폴더 이름, 보관 정책",
        "Filesystem layout, naming, and retention policy.",
      ),
      values: [
        { label: pick(locale, "루트 폴더", "Root folder"), value: "/data/webtoons" },
        {
          label: pick(locale, "폴더 규칙", "Folder naming"),
          value: "{Series Title}/{Chapter Number}",
        },
        {
          label: pick(locale, "보관 정책", "Retention"),
          value: pick(locale, "원본 이미지 전체 보관", "Archive all source images"),
        },
      ],
    },
    {
      id: "setting-2",
      title: pick(locale, "스케줄러", "Scheduler"),
      description: pick(
        locale,
        "큐 기상 주기와 기본 폴링 설정",
        "Queue wake interval and polling defaults.",
      ),
      values: [
        { label: pick(locale, "기상 주기", "Wake interval"), value: "*/20 * * * *" },
        { label: pick(locale, "동시 작업", "Concurrent tasks"), value: "3 workers" },
        {
          label: pick(locale, "재시도 정책", "Retry policy"),
          value: pick(locale, "선형 backoff 2회", "2 retries with linear backoff"),
        },
      ],
    },
    {
      id: "setting-3",
      title: pick(locale, "보안", "Security"),
      description: pick(
        locale,
        "관리자 접근과 어댑터 시크릿 처리",
        "Admin access and adapter secret handling.",
      ),
      values: [
        {
          label: pick(locale, "관리자 인증", "Admin auth"),
          value: pick(locale, "아직 미구현", "Not wired yet"),
        },
        {
          label: pick(locale, "시크릿 저장소", "Secret storage"),
          value: pick(locale, "환경변수 또는 NAS secret 파일", "Environment or NAS secret file"),
        },
        {
          label: pick(locale, "허용 호스트", "Allowed hosts"),
          value: pick(locale, "어댑터별 allowlist만 허용", "Per-adapter allowlist only"),
        },
      ],
    },
  ];
}

export async function getDashboardSnapshot(
  locale: Locale = "ko",
): Promise<DashboardSnapshot> {
  const adapters = getAdapters(locale);
  const runtime = getRuntime(locale);
  const series = getSeriesRecords(locale);
  const jobs = getJobsRecords(locale);
  const tasks = getTasksRecords(locale);
  const history = getHistoryRecords(locale);
  const systemWidgets = getSystemWidgetsRecords(locale);
  const settings = getSettingsRecords(locale);

  return {
    stats: [
      {
        label: pick(locale, "등록 시리즈", "Watched series"),
        value: String(series.length),
        detail: pick(locale, "모니터링 중인 라이브러리 항목", "Monitored library entries."),
      },
      {
        label: pick(locale, "큐 깊이", "Queue depth"),
        value: String(tasks.length),
        detail: pick(locale, "스케줄러에 보이는 작업 수", "Tasks visible to the scheduler."),
      },
      {
        label: pick(locale, "미수집 항목", "Missing grabs"),
        value: "14",
        detail: pick(locale, "아직 수집 대기 중인 회차", "Episodes still waiting for fetch."),
      },
      {
        label: pick(locale, "남은 디스크", "Free disk"),
        value: "812 GB",
        detail: pick(
          locale,
          "마운트된 저장 볼륨에서 사용 가능한 용량",
          "Available on the mounted target volume.",
        ),
      },
    ],
    adapters,
    runtime,
    series,
    jobs,
    tasks,
    history,
    systemWidgets,
    settings,
  };
}

export async function getSeries(locale: Locale = "ko"): Promise<SeriesRecord[]> {
  return getSeriesRecords(locale);
}

export async function getRules(locale: Locale = "ko"): Promise<CollectionRule[]> {
  return getRulesRecords(locale);
}

export async function getJobRuns(locale: Locale = "ko"): Promise<JobRun[]> {
  return getJobsRecords(locale);
}

export async function getActivityTasks(
  locale: Locale = "ko",
): Promise<ActivityTask[]> {
  return getTasksRecords(locale);
}

export async function getHistoryEvents(
  locale: Locale = "ko",
): Promise<HistoryEvent[]> {
  return getHistoryRecords(locale);
}

export async function getSystemWidgets(
  locale: Locale = "ko",
): Promise<SystemWidget[]> {
  return getSystemWidgetsRecords(locale);
}

export async function getSettingsGroups(
  locale: Locale = "ko",
): Promise<SettingGroup[]> {
  return getSettingsRecords(locale);
}
