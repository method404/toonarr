const DEFAULT_FETCH_TIMEOUT_MS = 30_000;

function clampTimeoutMs(value: number, fallbackMs: number) {
  if (!Number.isFinite(value) || value < 1_000) {
    return fallbackMs;
  }

  return Math.trunc(value);
}

export function getTimeoutFromEnv(envName: string, fallbackMs: number) {
  return clampTimeoutMs(Number(process.env[envName] ?? fallbackMs), fallbackMs);
}

export async function withTimeout<T>(
  factory: () => Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> {
  let timer: NodeJS.Timeout | undefined;

  try {
    return await Promise.race([
      factory(),
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`${label} timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

export async function fetchWithTimeout(
  input: string | URL | Request,
  init: RequestInit | undefined,
  options?: {
    timeoutMs?: number;
    label?: string;
  },
) {
  const timeoutMs = clampTimeoutMs(
    options?.timeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS,
    DEFAULT_FETCH_TIMEOUT_MS,
  );
  const timeoutController = new AbortController();
  const timeout = setTimeout(() => {
    timeoutController.abort();
  }, timeoutMs);

  try {
    const signal = init?.signal
      ? AbortSignal.any([init.signal, timeoutController.signal])
      : timeoutController.signal;

    return await fetch(input, {
      ...init,
      signal,
    });
  } catch (error) {
    if (timeoutController.signal.aborted && !init?.signal?.aborted) {
      throw new Error(
        `${options?.label ?? "fetch"} timed out after ${timeoutMs}ms`,
      );
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
