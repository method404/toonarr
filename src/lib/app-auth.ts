import crypto from "node:crypto";
import { cookies, headers } from "next/headers";
import { getAppSettings } from "@/lib/app-settings";

export const APP_AUTH_COOKIE = "naverrr-auth";

export function hashAppPassword(password: string, salt?: string) {
  const normalizedSalt = salt ?? crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, normalizedSalt, 64).toString("hex");

  return {
    salt: normalizedSalt,
    hash,
  };
}

export function verifyAppPassword(
  password: string,
  salt: string,
  expectedHash: string,
) {
  const actualHash = crypto.scryptSync(password, salt, 64).toString("hex");
  const left = Buffer.from(actualHash, "hex");
  const right = Buffer.from(expectedHash, "hex");

  if (left.length !== right.length) {
    return false;
  }

  return crypto.timingSafeEqual(left, right);
}

function base64UrlEncode(value: Uint8Array) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(`${normalized}${padding}`, "base64");
}

async function importSigningKey(secret: string) {
  return crypto.webcrypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function createAppSessionToken(username: string, secret: string) {
  const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 30;
  const payload = JSON.stringify({ username, expiresAt });
  const key = await importSigningKey(secret);
  const signature = await crypto.webcrypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  );

  return `${base64UrlEncode(new TextEncoder().encode(payload))}.${base64UrlEncode(new Uint8Array(signature))}`;
}

export async function verifyAppSessionToken(token: string, secret: string) {
  const [encodedPayload, encodedSignature] = token.split(".");

  if (!encodedPayload || !encodedSignature) {
    return null;
  }

  try {
    const payloadBuffer = base64UrlDecode(encodedPayload);
    const signatureBuffer = base64UrlDecode(encodedSignature);
    const key = await importSigningKey(secret);
    const valid = await crypto.webcrypto.subtle.verify(
      "HMAC",
      key,
      signatureBuffer,
      payloadBuffer,
    );

    if (!valid) {
      return null;
    }

    const payload = JSON.parse(payloadBuffer.toString("utf8")) as {
      username?: string;
      expiresAt?: number;
    };

    if (
      !payload.username ||
      typeof payload.expiresAt !== "number" ||
      payload.expiresAt <= Date.now()
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function isLocalAddress(value: string | null | undefined) {
  if (!value) {
    return false;
  }

  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, "")
    .replace(/^::ffff:/, "");

  if (
    normalized === "::1" ||
    normalized === "127.0.0.1" ||
    normalized.startsWith("127.") ||
    normalized === "localhost"
  ) {
    return true;
  }

  if (normalized.startsWith("10.") || normalized.startsWith("192.168.")) {
    return true;
  }

  const match = normalized.match(/^172\.(\d{1,2})\./);
  if (match) {
    const second = Number(match[1]);
    return second >= 16 && second <= 31;
  }

  if (normalized.startsWith("fc") || normalized.startsWith("fd")) {
    return true;
  }

  return false;
}

export function isLocalRequest(headers: Headers) {
  const forwardedFor = headers.get("x-forwarded-for");
  const realIp = headers.get("x-real-ip");
  const host = headers.get("host");

  const candidates = [
    forwardedFor?.split(",")[0]?.trim() ?? null,
    realIp?.trim() ?? null,
    host?.split(":")[0]?.trim() ?? null,
  ];

  return candidates.some((candidate) => isLocalAddress(candidate));
}

function sanitizeRedirectPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/series";
  }

  return value;
}

export function resolveLoginRedirectPath(value: string | null | undefined) {
  return sanitizeRedirectPath(value);
}

export async function getAppAuthContext() {
  const settings = await getAppSettings();
  const authConfigured =
    settings.security.authMode === "form" &&
    settings.security.username.length > 0 &&
    Boolean(settings.security.passwordHash) &&
    Boolean(settings.security.passwordSalt) &&
    Boolean(settings.security.sessionSecret);

  if (!authConfigured) {
    return {
      settings,
      authConfigured: false,
      bypassed: true,
      authenticated: true,
      username: null,
    };
  }

  const requestHeaders = await headers();
  const bypassed =
    settings.security.authRequired === "disabledForLocalAddresses" &&
    isLocalRequest(requestHeaders);

  if (bypassed) {
    return {
      settings,
      authConfigured: true,
      bypassed: true,
      authenticated: true,
      username: null,
    };
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(APP_AUTH_COOKIE)?.value ?? null;
  const payload =
    token && settings.security.sessionSecret
      ? await verifyAppSessionToken(token, settings.security.sessionSecret)
      : null;

  return {
    settings,
    authConfigured: true,
    bypassed: false,
    authenticated: Boolean(payload),
    username: payload?.username ?? null,
  };
}
