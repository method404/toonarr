import { NextResponse } from "next/server";
import {
  getAppSettings,
  summarizeAppSettings,
  updateAppSettings,
} from "@/lib/app-settings";
import { hashAppPassword } from "@/lib/app-auth";
import type { MonitorMode } from "@/lib/types";
import type {
  AppAuthMode,
  AppAuthRequired,
  UpdateProvider,
} from "@/lib/app-settings";

const validMonitorModes = new Set<MonitorMode>(["all", "future", "none"]);
const validAuthModes = new Set<AppAuthMode>(["none", "form"]);
const validAuthRequiredModes = new Set<AppAuthRequired>([
  "all",
  "disabledForLocalAddresses",
]);
const validUpdateProviders = new Set<UpdateProvider>(["none", "github", "docker"]);

type UpdateAppSettingsBody = {
  defaultRootFolder?: string;
  defaultMonitorMode?: MonitorMode;
  updateProvider?: UpdateProvider;
  githubRepo?: string;
  dockerImage?: string;
  authMode?: AppAuthMode;
  authRequired?: AppAuthRequired;
  username?: string;
  password?: string;
  passwordConfirm?: string;
};

export async function GET() {
  const settings = await getAppSettings();
  return NextResponse.json({ settings: summarizeAppSettings(settings) });
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as UpdateAppSettingsBody;
    const current = await getAppSettings();
    const defaultRootFolder = body.defaultRootFolder?.trim();
    const defaultMonitorMode = body.defaultMonitorMode;
    const updateProvider = body.updateProvider ?? current.updates.provider;
    const githubRepo = body.githubRepo?.trim() ?? current.updates.githubRepo;
    const dockerImage = body.dockerImage?.trim() ?? current.updates.dockerImage;
    const authMode = body.authMode;
    const authRequired = body.authRequired;
    const username = body.username?.trim() ?? "";
    const password = body.password ?? "";
    const passwordConfirm = body.passwordConfirm ?? "";

    if (
      !defaultRootFolder ||
      !defaultRootFolder.length ||
      !validMonitorModes.has(defaultMonitorMode as MonitorMode) ||
      !validUpdateProviders.has(updateProvider as UpdateProvider) ||
      !validAuthModes.has(authMode as AppAuthMode) ||
      !validAuthRequiredModes.has(authRequired as AppAuthRequired)
    ) {
      return NextResponse.json(
        { error: "Invalid app settings payload." },
        { status: 400 },
      );
    }

    const nextUsername = authMode === "form" ? username : current.security.username;
    const requiresStoredPassword =
      authMode === "form" &&
      !password.length &&
      !current.security.passwordHash;

    if (authMode === "form" && !username.length) {
      return NextResponse.json(
        { error: "Authentication username is required." },
        { status: 400 },
      );
    }

    if (updateProvider === "github" && !githubRepo.length) {
      return NextResponse.json(
        { error: "GitHub repository is required." },
        { status: 400 },
      );
    }

    if (updateProvider === "docker" && !dockerImage.length) {
      return NextResponse.json(
        { error: "Docker image is required." },
        { status: 400 },
      );
    }

    if (requiresStoredPassword) {
      return NextResponse.json(
        { error: "Authentication password is required." },
        { status: 400 },
      );
    }

    if (authMode === "form" && password.length > 0 && password !== passwordConfirm) {
      return NextResponse.json(
        { error: "Authentication passwords do not match." },
        { status: 400 },
      );
    }

    const nextPassword =
      authMode !== "form"
        ? { hash: current.security.passwordHash, salt: current.security.passwordSalt }
        : password.length > 0
          ? hashAppPassword(password)
          : {
              hash: current.security.passwordHash,
              salt: current.security.passwordSalt,
            };

    const settings = await updateAppSettings({
      defaultRootFolder,
      defaultMonitorMode,
      updateProvider,
      githubRepo,
      dockerImage,
      authMode,
      authRequired,
      username: nextUsername,
      passwordHash: nextPassword.hash,
      passwordSalt: nextPassword.salt,
    });

    return NextResponse.json({ ok: true, settings: summarizeAppSettings(settings) });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update app settings.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
