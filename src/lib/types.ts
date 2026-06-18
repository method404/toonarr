export type AdapterStatus = "ready" | "planned" | "degraded";
export type SeriesStatus = "monitoring" | "paused" | "review";
export type MonitorMode = "all" | "future" | "none";
export type RuleStatus = "active" | "draft" | "paused";
export type JobStatus = "success" | "running" | "warning" | "failed";
export type TaskStatus = "queued" | "running" | "delayed" | "blocked";
export type EventLevel = "info" | "success" | "warning" | "error";

export type DashboardStat = {
  label: string;
  value: string;
  detail: string;
};

export type SourceAdapter = {
  id: string;
  name: string;
  mode: "api" | "html" | "browser";
  status: AdapterStatus;
  notes: string;
};

export type SeriesRecord = {
  id: string;
  title: string;
  sourceName: string;
  status: SeriesStatus;
  monitored: boolean;
  tags: string[];
  episodes: number;
  qualityProfile: string;
  pollCadence: string;
  storagePath: string;
  lastSeen: string;
  nextCheck: string;
  sizeOnDisk: string;
};

export type CollectionRule = {
  id: string;
  name: string;
  cadence: string;
  retention: string;
  freshnessWindowHours: number;
  status: RuleStatus;
};

export type JobRun = {
  id: string;
  name: string;
  trigger: string;
  status: JobStatus;
  itemsProcessed: number;
  startedAt: string;
  finishedAt?: string;
};

export type RuntimeConfig = {
  schedule: string;
  downloadRoot: string;
  authMode: string;
};

export type ActivityTask = {
  id: string;
  name: string;
  sourceName: string;
  status: TaskStatus;
  queue: string;
  startedAt: string;
  eta: string;
};

export type HistoryEvent = {
  id: string;
  seriesTitle: string;
  event: string;
  result: EventLevel;
  sourceName: string;
  at: string;
  detail: string;
};

export type SystemWidget = {
  id: string;
  label: string;
  value: string;
  detail: string;
  status: EventLevel;
};

export type SettingGroup = {
  id: string;
  title: string;
  description: string;
  values: Array<{
    label: string;
    value: string;
  }>;
};

export type DashboardSnapshot = {
  stats: DashboardStat[];
  adapters: SourceAdapter[];
  runtime: RuntimeConfig;
  series: SeriesRecord[];
  jobs: JobRun[];
  tasks: ActivityTask[];
  history: HistoryEvent[];
  systemWidgets: SystemWidget[];
  settings: SettingGroup[];
};
