import { spawn } from "node:child_process";
import { constants } from "node:fs";
import { access } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type OpenPathBody = {
  path?: string;
};

function getOpenCommand(targetPath: string) {
  if (process.platform === "darwin") {
    return { command: "open", args: [targetPath] };
  }

  if (process.platform === "win32") {
    return { command: "cmd", args: ["/c", "start", "", targetPath] };
  }

  if (process.platform === "linux") {
    return { command: "xdg-open", args: [targetPath] };
  }

  throw new Error("Unsupported platform.");
}

function openPathInSystem(targetPath: string) {
  const { command, args } = getOpenCommand(targetPath);

  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      detached: true,
      stdio: "ignore",
    });

    child.once("error", reject);
    child.once("spawn", () => {
      child.unref();
      resolve();
    });
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as OpenPathBody;
    const targetPath = body.path?.trim();

    if (!targetPath) {
      return NextResponse.json({ error: "Invalid path." }, { status: 400 });
    }

    const resolvedPath = path.isAbsolute(targetPath)
      ? targetPath
      : path.resolve(process.cwd(), targetPath);

    await access(resolvedPath, constants.F_OK);
    await openPathInSystem(resolvedPath);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to open path.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
