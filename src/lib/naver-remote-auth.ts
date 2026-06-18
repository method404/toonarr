import { chmod, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import crypto from "node:crypto";
import path from "node:path";
import { renewNaverSessionWithStoredCredentials } from "@/lib/naver-login-browser";
import { getStoredNaverCredentials } from "@/lib/naver-credentials";

export type NaverRemoteAuthState =
  | "idle"
  | "pending"
  | "verified"
  | "capturing"
  | "completed"
  | "failed"
  | "expired";

type StoredNaverRemoteAuthAttempt = {
  token: string;
  state: NaverRemoteAuthState;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  verifiedAt: string | null;
  completedAt: string | null;
  origin: string;
  startUrl: string;
  callbackUrl: string;
  error: string | null;
};

export type NaverRemoteAuthAttemptSummary = {
  configured: boolean;
  token: string | null;
  state: NaverRemoteAuthState;
  createdAt: string | null;
  updatedAt: string | null;
  expiresAt: string | null;
  verifiedAt: string | null;
  completedAt: string | null;
  startUrl: string | null;
  callbackUrl: string | null;
  error: string | null;
};

const REMOTE_AUTH_TTL_MS = 1000 * 60 * 20;

function getSettingsRoot() {
  return path.join(process.cwd(), "data", "settings");
}

function getRemoteAuthPath() {
  return path.join(getSettingsRoot(), "naver-remote-auth.json");
}

async function writePrivateJson(filePath: string, value: unknown) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await chmod(filePath, 0o600).catch(() => undefined);
}

async function readStoredAttempt() {
  try {
    const raw = await readFile(getRemoteAuthPath(), "utf8");
    return JSON.parse(raw) as StoredNaverRemoteAuthAttempt;
  } catch {
    return null;
  }
}

function isExpired(attempt: StoredNaverRemoteAuthAttempt) {
  return new Date(attempt.expiresAt).getTime() <= Date.now();
}

function summarizeAttempt(
  attempt: StoredNaverRemoteAuthAttempt | null,
): NaverRemoteAuthAttemptSummary {
  if (!attempt) {
    return {
      configured: false,
      token: null,
      state: "idle",
      createdAt: null,
      updatedAt: null,
      expiresAt: null,
      verifiedAt: null,
      completedAt: null,
      startUrl: null,
      callbackUrl: null,
      error: null,
    };
  }

  return {
    configured: true,
    token: attempt.token,
    state: isExpired(attempt) && attempt.state !== "completed" ? "expired" : attempt.state,
    createdAt: attempt.createdAt,
    updatedAt: attempt.updatedAt,
    expiresAt: attempt.expiresAt,
    verifiedAt: attempt.verifiedAt,
    completedAt: attempt.completedAt,
    startUrl: attempt.startUrl,
    callbackUrl: attempt.callbackUrl,
    error: attempt.error,
  };
}

async function writeAttempt(attempt: StoredNaverRemoteAuthAttempt) {
  await writePrivateJson(getRemoteAuthPath(), attempt);
  return attempt;
}

export async function getNaverRemoteAuthAttemptSummary() {
  const attempt = await readStoredAttempt();

  if (!attempt) {
    return summarizeAttempt(null);
  }

  if (isExpired(attempt) && attempt.state !== "completed") {
    const expiredAttempt: StoredNaverRemoteAuthAttempt = {
      ...attempt,
      state: "expired",
      updatedAt: new Date().toISOString(),
      error: attempt.error ?? "Remote login attempt expired.",
    };
    await writeAttempt(expiredAttempt);
    return summarizeAttempt(expiredAttempt);
  }

  return summarizeAttempt(attempt);
}

export async function clearNaverRemoteAuthAttempt() {
  await rm(getRemoteAuthPath(), { force: true });
}

export async function createNaverRemoteAuthAttempt(origin: string) {
  const credentials = await getStoredNaverCredentials();

  if (!credentials) {
    throw new Error("Naver account credentials must be saved first.");
  }

  const token = crypto.randomBytes(24).toString("hex");
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + REMOTE_AUTH_TTL_MS).toISOString();
  const startUrl = `${origin}/naver/auth/start/${token}`;
  const callbackUrl = `${origin}/naver/auth/callback/${token}`;
  const attempt: StoredNaverRemoteAuthAttempt = {
    token,
    state: "pending",
    createdAt,
    updatedAt: createdAt,
    expiresAt,
    verifiedAt: null,
    completedAt: null,
    origin,
    startUrl,
    callbackUrl,
    error: null,
  };

  await writeAttempt(attempt);
  return summarizeAttempt(attempt);
}

export async function getStoredNaverRemoteAuthAttempt(token: string) {
  const attempt = await readStoredAttempt();

  if (!attempt || attempt.token !== token) {
    return null;
  }

  return attempt;
}

export async function markNaverRemoteAuthVerified(token: string) {
  const attempt = await getStoredNaverRemoteAuthAttempt(token);

  if (!attempt) {
    throw new Error("Remote login attempt was not found.");
  }

  if (isExpired(attempt)) {
    const expiredAttempt: StoredNaverRemoteAuthAttempt = {
      ...attempt,
      state: "expired",
      updatedAt: new Date().toISOString(),
      error: "Remote login attempt expired.",
    };
    await writeAttempt(expiredAttempt);
    return summarizeAttempt(expiredAttempt);
  }

  const updatedAttempt: StoredNaverRemoteAuthAttempt = {
    ...attempt,
    state: "verified",
    updatedAt: new Date().toISOString(),
    verifiedAt: new Date().toISOString(),
    error: null,
  };

  await writeAttempt(updatedAttempt);
  return summarizeAttempt(updatedAttempt);
}

export async function finalizeNaverRemoteAuth(token: string) {
  const attempt = await getStoredNaverRemoteAuthAttempt(token);

  if (!attempt) {
    throw new Error("Remote login attempt was not found.");
  }

  if (attempt.state === "completed") {
    return summarizeAttempt(attempt);
  }

  if (isExpired(attempt)) {
    const expiredAttempt: StoredNaverRemoteAuthAttempt = {
      ...attempt,
      state: "expired",
      updatedAt: new Date().toISOString(),
      error: "Remote login attempt expired.",
    };
    await writeAttempt(expiredAttempt);
    return summarizeAttempt(expiredAttempt);
  }

  const capturingAttempt: StoredNaverRemoteAuthAttempt = {
    ...attempt,
    state: "capturing",
    updatedAt: new Date().toISOString(),
    error: null,
  };
  await writeAttempt(capturingAttempt);

  try {
    const session = await renewNaverSessionWithStoredCredentials();

    if (!session) {
      throw new Error(
        "Could not capture a Naver session. Complete login with device trust enabled, then try again.",
      );
    }

    const completedAttempt: StoredNaverRemoteAuthAttempt = {
      ...capturingAttempt,
      state: "completed",
      updatedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      error: null,
    };
    await writeAttempt(completedAttempt);
    return summarizeAttempt(completedAttempt);
  } catch (error) {
    const failedAttempt: StoredNaverRemoteAuthAttempt = {
      ...capturingAttempt,
      state: "failed",
      updatedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Remote login failed.",
    };
    await writeAttempt(failedAttempt);
    return summarizeAttempt(failedAttempt);
  }
}
