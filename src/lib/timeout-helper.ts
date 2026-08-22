/**
 * Timeout helper to prevent hung SSR streams.
 * Wraps async operations with a configurable timeout.
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  fallback: T,
): Promise<T> {
  let timeoutId: NodeJS.Timeout | null = null;

  const timeoutPromise = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => {
      console.warn(`Operation timed out after ${timeoutMs}ms, using fallback`);
      resolve(fallback);
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    if (timeoutId) clearTimeout(timeoutId);
    return result;
  } catch (error) {
    if (timeoutId) clearTimeout(timeoutId);
    console.error("Operation failed, using fallback:", error);
    return fallback;
  }
}
