import { mkdir, readFile, writeFile } from "node:fs/promises";
import crypto from "node:crypto";
import path from "node:path";
import type { MonitorMode } from "@/lib/types";

export type AppAuthMode = "none" | "form";
export type AppAuthRequired = "all" | "disabledForLocalAddresses";
export type UpdateProvider = "none" | "github" | "docker";

export type AppSettings = {
  library: {
    defaultRootFolder: string;
    defaultMonitorMode: MonitorMode;
  };
  updates: {
    provider: UpdateProvider;
    githubRepo: string;
    dockerImage: string;
  };
  security: {
    authMode: AppAuthMode;
    authRequired: AppAuthRequired;
    username: string;
    passwordHash: string | null;
    passwordSalt: string | null;
    sessionSecret: string | null;
  };
};

export type AppSettingsSummary = {
  library: {
    defaultRootFolder: string;
    defaultMonitorMode: MonitorMode;
  };
  updates: {
    provider: UpdateProvider;
    githubRepo: string;
    dockerImage: string;
  };
  security: {
    authMode: AppAuthMode;
    authRequired: AppAuthRequired;
    username: string;
    passwordConfigured: boolean;
  };
};

const DEFAULT_APP_SETTINGS: AppSettings = {
  library: {
    defaultRootFolder: "./storage/webtoons",
    defaultMonitorMode: "all",
  },
  updates: {
    provider: "github",
    githubRepo: "method404/toonarr-releases",
    dockerImage: "",
  },
  security: {
    authMode: "none",
    authRequired: "disabledForLocalAddresses",
    username: "",
    passwordHash: null,
    passwordSalt: null,
    sessionSecret: null,
  },
};

function getSettingsRoot() {
  return path.join(process.cwd(), "data", "settings");
}

function getAppSettingsPath() {
  return path.join(getSettingsRoot(), "app.json");
}

function normalizeMonitorMode(value: string | null | undefined): MonitorMode {
  if (value === "all" || value === "future" || value === "none") {
    return value;
  }

  return DEFAULT_APP_SETTINGS.library.defaultMonitorMode;
}

function normalizeAuthMode(value: string | null | undefined): AppAuthMode {
  return value === "form" ? "form" : "none";
}

function normalizeAuthRequired(value: string | null | undefined): AppAuthRequired {
  return value === "all" ? "all" : "disabledForLocalAddresses";
}

function normalizeRootFolder(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0
    ? trimmed
    : DEFAULT_APP_SETTINGS.library.defaultRootFolder;
}

function normalizeUpdateProvider(value: string | null | undefined): UpdateProvider {
  if (value === "github" || value === "docker" || value === "none") {
    return value;
  }

  return DEFAULT_APP_SETTINGS.updates.provider;
}

function normalizeGithubRepo(value: string | null | undefined) {
  return value?.trim() ?? DEFAULT_APP_SETTINGS.updates.githubRepo;
}

function normalizeDockerImage(value: string | null | undefined) {
  return value?.trim() ?? DEFAULT_APP_SETTINGS.updates.dockerImage;
}

function normalizeAppSettings(value: Partial<AppSettings> | null | undefined): AppSettings {
  return {
    library: {
      defaultRootFolder: normalizeRootFolder(value?.library?.defaultRootFolder),
      defaultMonitorMode: normalizeMonitorMode(value?.library?.defaultMonitorMode),
    },
    updates: {
      provider: normalizeUpdateProvider(value?.updates?.provider),
      githubRepo: normalizeGithubRepo(value?.updates?.githubRepo),
      dockerImage: normalizeDockerImage(value?.updates?.dockerImage),
    },
    security: {
      authMode: normalizeAuthMode(value?.security?.authMode),
      authRequired: normalizeAuthRequired(value?.security?.authRequired),
      username: value?.security?.username?.trim() ?? "",
      passwordHash: value?.security?.passwordHash ?? null,
      passwordSalt: value?.security?.passwordSalt ?? null,
      sessionSecret: value?.security?.sessionSecret ?? null,
    },
  };
}

export async function getAppSettings() {
  try {
    const raw = await readFile(getAppSettingsPath(), "utf8");
    return normalizeAppSettings(JSON.parse(raw) as Partial<AppSettings>);
  } catch {
    return DEFAULT_APP_SETTINGS;
  }
}

export function summarizeAppSettings(settings: AppSettings): AppSettingsSummary {
  return {
    library: {
      defaultRootFolder: settings.library.defaultRootFolder,
      defaultMonitorMode: settings.library.defaultMonitorMode,
    },
    updates: {
      provider: settings.updates.provider,
      githubRepo: settings.updates.githubRepo,
      dockerImage: settings.updates.dockerImage,
    },
    security: {
      authMode: settings.security.authMode,
      authRequired: settings.security.authRequired,
      username: settings.security.username,
      passwordConfigured: Boolean(
        settings.security.passwordHash && settings.security.passwordSalt,
      ),
    },
  };
}

export async function updateAppSettings(input: {
  defaultRootFolder?: string;
  defaultMonitorMode?: MonitorMode;
  updateProvider?: UpdateProvider;
  githubRepo?: string;
  dockerImage?: string;
  authMode?: AppAuthMode;
  authRequired?: AppAuthRequired;
  username?: string;
  passwordHash?: string | null;
  passwordSalt?: string | null;
}) {
  const current = await getAppSettings();
  const nextAuthMode = input.authMode ?? current.security.authMode;
  const nextUsername = input.username?.trim() ?? current.security.username;
  const nextPasswordHash =
    input.passwordHash !== undefined ? input.passwordHash : current.security.passwordHash;
  const nextPasswordSalt =
    input.passwordSalt !== undefined ? input.passwordSalt : current.security.passwordSalt;
  const shouldRotateSessionSecret =
    nextAuthMode === "form" &&
    nextUsername.length > 0 &&
    Boolean(nextPasswordHash) &&
    (nextUsername !== current.security.username ||
      nextPasswordHash !== current.security.passwordHash ||
      !current.security.sessionSecret);
  const next = normalizeAppSettings({
    ...current,
    library: {
      ...current.library,
      defaultRootFolder: input.defaultRootFolder ?? current.library.defaultRootFolder,
      defaultMonitorMode: input.defaultMonitorMode ?? current.library.defaultMonitorMode,
    },
    updates: {
      ...current.updates,
      provider: input.updateProvider ?? current.updates.provider,
      githubRepo: input.githubRepo ?? current.updates.githubRepo,
      dockerImage: input.dockerImage ?? current.updates.dockerImage,
    },
    security: {
      ...current.security,
      authMode: nextAuthMode,
      authRequired: input.authRequired ?? current.security.authRequired,
      username: nextUsername,
      passwordHash: nextPasswordHash,
      passwordSalt: nextPasswordSalt,
      sessionSecret: shouldRotateSessionSecret
        ? crypto.randomBytes(32).toString("hex")
        : current.security.sessionSecret,
    },
  });

  await mkdir(getSettingsRoot(), { recursive: true });
  await writeFile(getAppSettingsPath(), JSON.stringify(next, null, 2), "utf8");

  return next;
}
