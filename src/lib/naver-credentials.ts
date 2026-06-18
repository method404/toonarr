import { chmod, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import crypto from "node:crypto";
import path from "node:path";

type StoredNaverCredentials = {
  username: string;
  password: string;
  updatedAt: string;
  lastUsedAt: string | null;
};

export type NaverCredentialSummary = {
  configured: boolean;
  username: string | null;
  updatedAt: string | null;
  lastUsedAt: string | null;
};

type StoredEncryptedPayload = {
  iv: string;
  tag: string;
  data: string;
  updatedAt: string;
  username: string;
  lastUsedAt: string | null;
};

function getDataRoot() {
  return path.join(process.cwd(), "data");
}

function getSettingsRoot() {
  return path.join(getDataRoot(), "settings");
}

function getCredentialPath() {
  return path.join(getSettingsRoot(), "naver-credentials.json");
}

function getCredentialKeyPath() {
  return path.join(getSettingsRoot(), "naver-credentials.key");
}

async function ensureDir(dirPath: string) {
  await mkdir(dirPath, { recursive: true });
}

async function writePrivateFile(filePath: string, value: string) {
  await ensureDir(path.dirname(filePath));
  await writeFile(filePath, value, "utf8");
  await chmod(filePath, 0o600).catch(() => undefined);
}

async function getEncryptionKey() {
  try {
    const existing = await readFile(getCredentialKeyPath());

    if (existing.length === 32) {
      return existing;
    }
  } catch {
    // ignore and regenerate
  }

  const nextKey = crypto.randomBytes(32);
  await ensureDir(getSettingsRoot());
  await writeFile(getCredentialKeyPath(), nextKey);
  await chmod(getCredentialKeyPath(), 0o600).catch(() => undefined);
  return nextKey;
}

async function readEncryptedPayload() {
  try {
    const raw = await readFile(getCredentialPath(), "utf8");
    return JSON.parse(raw) as StoredEncryptedPayload;
  } catch {
    return null;
  }
}

async function decryptCredentials(payload: StoredEncryptedPayload) {
  const key = await getEncryptionKey();
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(payload.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(payload.tag, "base64"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.data, "base64")),
    decipher.final(),
  ]).toString("utf8");

  const parsed = JSON.parse(decrypted) as {
    username?: string;
    password?: string;
  };

  return {
    username: parsed.username ?? "",
    password: parsed.password ?? "",
    updatedAt: payload.updatedAt,
    lastUsedAt: payload.lastUsedAt,
  } satisfies StoredNaverCredentials;
}

async function encryptCredentials(value: StoredNaverCredentials) {
  const key = await getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(
      JSON.stringify({
        username: value.username,
        password: value.password,
      }),
      "utf8",
    ),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  const payload: StoredEncryptedPayload = {
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    data: encrypted.toString("base64"),
    updatedAt: value.updatedAt,
    username: value.username,
    lastUsedAt: value.lastUsedAt,
  };

  await writePrivateFile(getCredentialPath(), `${JSON.stringify(payload, null, 2)}\n`);
}

function summarizeCredentials(
  credentials: StoredNaverCredentials | null,
): NaverCredentialSummary {
  return {
    configured: Boolean(credentials?.username && credentials.password),
    username: credentials?.username ?? null,
    updatedAt: credentials?.updatedAt ?? null,
    lastUsedAt: credentials?.lastUsedAt ?? null,
  };
}

export async function getStoredNaverCredentials() {
  const payload = await readEncryptedPayload();

  if (!payload) {
    return null;
  }

  try {
    const credentials = await decryptCredentials(payload);

    if (!credentials.username || !credentials.password) {
      return null;
    }

    return credentials;
  } catch {
    return null;
  }
}

export async function getNaverCredentialSummary() {
  return summarizeCredentials(await getStoredNaverCredentials());
}

export async function saveNaverCredentials(username: string, password: string) {
  const normalizedUsername = username.trim();
  const normalizedPassword = password.trim();

  if (!normalizedUsername || !normalizedPassword) {
    throw new Error("Naver ID and password are required.");
  }

  const current = await getStoredNaverCredentials();
  const credentials: StoredNaverCredentials = {
    username: normalizedUsername,
    password: normalizedPassword,
    updatedAt: new Date().toISOString(),
    lastUsedAt: current?.lastUsedAt ?? null,
  };

  await encryptCredentials(credentials);
  return summarizeCredentials(credentials);
}

export async function markNaverCredentialsUsed() {
  const current = await getStoredNaverCredentials();

  if (!current) {
    return null;
  }

  const updated: StoredNaverCredentials = {
    ...current,
    lastUsedAt: new Date().toISOString(),
  };

  await encryptCredentials(updated);
  return summarizeCredentials(updated);
}

export async function clearNaverCredentials() {
  await rm(getCredentialPath(), { force: true });
}
