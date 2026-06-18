#!/usr/bin/env node

import { access } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";

function parseArgs(argv) {
  const values = new Map();

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];

    if (!current.startsWith("--")) {
      continue;
    }

    const [key, inlineValue] = current.slice(2).split("=", 2);

    if (inlineValue !== undefined) {
      values.set(key, inlineValue);
      continue;
    }

    const next = argv[index + 1];

    if (!next || next.startsWith("--")) {
      values.set(key, "true");
      continue;
    }

    values.set(key, next);
    index += 1;
  }

  return values;
}

function printUsage() {
  console.log(`Toonarr Naver session bridge

Usage:
  node scripts/naver-session-bridge.mjs --toonarr-url http://NAS_IP:3000 --username NAVER_ID --password NAVER_PW

Options:
  --toonarr-url   Toonarr base URL, e.g. http://192.168.0.10:3000
  --username      Naver ID
  --password      Naver password
  --profile-dir   Optional persistent browser profile directory
  --headless      true/false, default false
`);
}

function normalizeBaseUrl(rawValue) {
  const value = rawValue?.trim();

  if (!value) {
    throw new Error("Missing --toonarr-url");
  }

  return value.replace(/\/+$/, "");
}

async function resolveBrowserLaunchOptions() {
  const candidates = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  ];

  for (const executablePath of candidates) {
    try {
      await access(executablePath);
      return { executablePath };
    } catch {
      continue;
    }
  }

  return {};
}

function buildCookieHeader(cookies) {
  return cookies
    .filter((cookie) => {
      return (
        cookie.domain.includes("naver.com") || cookie.domain.includes("pstatic.net")
      );
    })
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");
}

function hasRequiredCookies(cookies) {
  const names = new Set(
    cookies
      .filter((cookie) => {
        return (
          cookie.domain.includes("naver.com") || cookie.domain.includes("pstatic.net")
        );
      })
      .map((cookie) => cookie.name),
  );

  return names.has("NID_AUT") && names.has("NID_SES");
}

async function saveCredentials(toonarrUrl, username, password) {
  const response = await fetch(`${toonarrUrl}/api/settings/naver-credentials`, {
    method: "PUT",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      username,
      password,
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(
      payload.error ?? `Failed to save Naver credentials: ${response.status}`,
    );
  }
}

async function saveSession(toonarrUrl, cookieHeader) {
  const response = await fetch(`${toonarrUrl}/api/settings/naver-session`, {
    method: "PUT",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      cookieHeader,
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      payload.error ?? `Failed to save Naver session: ${response.status}`,
    );
  }

  return payload.session ?? null;
}

async function clickRememberDevice(page) {
  const checkbox = page.locator("#nvlong");
  const keep = page.locator("#keep");

  if ((await checkbox.count()) === 0) {
    return;
  }

  const currentValue = await checkbox.first().getAttribute("value");

  if (currentValue !== "on") {
    await keep.first().click().catch(() => undefined);
  }
}

async function fillLogin(page, username, password) {
  await page.waitForSelector('input[name="id"]', { timeout: 15000 });
  await page.fill('input[name="id"]', username);
  await page.fill('input[name="pw"]', password);
  await clickRememberDevice(page);

  const nextButton = page.locator("button#log.login, button.btn_login, button[type='button']");
  await nextButton.first().click();
}

async function waitForSessionCookies(context, timeoutMs = 10 * 60 * 1000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const cookies = await context.cookies([
      "https://comic.naver.com",
      "https://nid.naver.com",
    ]);

    if (hasRequiredCookies(cookies)) {
      return cookies;
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 1500);
    });
  }

  throw new Error("Timed out waiting for Naver session cookies.");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.has("help")) {
    printUsage();
    process.exit(0);
  }

  const toonarrUrl = normalizeBaseUrl(args.get("toonarr-url"));
  const username = args.get("username")?.trim();
  const password = args.get("password")?.trim();
  const headless = args.get("headless") === "true";
  const profileDir =
    args.get("profile-dir")?.trim() ||
    path.join(os.tmpdir(), "toonarr-naver-session-bridge");

  if (!username || !password) {
    throw new Error("Missing --username or --password");
  }

  console.log("[toonarr-bridge] saving credentials to Toonarr...");
  await saveCredentials(toonarrUrl, username, password);

  console.log("[toonarr-bridge] opening local browser...");
  const launchOptions = await resolveBrowserLaunchOptions();
  const context = await chromium.launchPersistentContext(profileDir, {
    ...launchOptions,
    headless,
    viewport: { width: 1440, height: 960 },
  });

  try {
    const page = context.pages()[0] ?? (await context.newPage());

    await page.goto("https://nid.naver.com/nidlogin.login", {
      waitUntil: "domcontentloaded",
    });
    await fillLogin(page, username, password);

    console.log(
      "[toonarr-bridge] complete Naver login, 2FA, and trusted-device confirmation in the opened browser.",
    );

    const cookies = await waitForSessionCookies(context);
    const cookieHeader = buildCookieHeader(cookies);

    console.log("[toonarr-bridge] uploading captured Naver session to Toonarr...");
    const session = await saveSession(toonarrUrl, cookieHeader);

    console.log("[toonarr-bridge] done");
    console.log(
      JSON.stringify(
        {
          adultAccess: session?.adultAccess ?? null,
          updatedAt: session?.updatedAt ?? null,
          configured: session?.configured ?? null,
        },
        null,
        2,
      ),
    );
  } finally {
    await context.close().catch(() => undefined);
  }
}

main().catch((error) => {
  console.error(
    `[toonarr-bridge] ${
      error instanceof Error ? error.message : "Unknown error"
    }`,
  );
  process.exit(1);
});
