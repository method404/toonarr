import { access, readdir } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

function uniquePaths(values: string[]) {
  return [...new Set(values)];
}

async function pathExists(targetPath: string) {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function getAvailableRoots() {
  const candidates = uniquePaths([
    process.cwd(),
    "/data",
    "/storage",
    "/mnt",
    "/media",
    "/volume1",
    "/volume2",
  ]);

  const results = await Promise.all(
    candidates.map(async (candidate) =>
      (await pathExists(candidate)) ? candidate : null,
    ),
  );

  const roots = results.filter((value): value is string => Boolean(value));
  return roots.length ? roots : [process.cwd()];
}

async function resolveDirectoryPath(inputPath: string | null) {
  const roots = await getAvailableRoots();
  const requestedPath = inputPath?.trim()
    ? path.isAbsolute(inputPath.trim())
      ? path.resolve(inputPath.trim())
      : path.resolve(process.cwd(), inputPath.trim())
    : roots[0];

  if (await pathExists(requestedPath)) {
    return {
      currentPath: requestedPath,
      roots,
    };
  }

  return {
    currentPath: roots[0],
    roots,
  };
}

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const inputPath = searchParams.get("path");
    const { currentPath, roots } = await resolveDirectoryPath(inputPath);
    const entries = await readdir(currentPath, { withFileTypes: true });
    const directories = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => ({
        name: entry.name,
        path: path.join(currentPath, entry.name),
      }))
      .sort((left, right) => left.name.localeCompare(right.name, "ko"));

    return NextResponse.json({
      ok: true,
      currentPath,
      parentPath: path.dirname(currentPath) === currentPath ? null : path.dirname(currentPath),
      roots,
      directories,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to read directories.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
