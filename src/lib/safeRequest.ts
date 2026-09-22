/**
 * Retry an async action with linear backoff.
 *
 * Lives in its own module rather than beside the page component: a non-
 * component export in a `.tsx` component file disables React Fast Refresh
 * for that entire file, so every edit to the workspace forced a full reload.
 */
export async function safeRequest<T>(
  action: () => Promise<T>,
  onRetry?: (attempt: number) => void,
  maxRetries = 2,
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await action();
    } catch (error) {
      // Never retry a caller-cancelled request.
      if ((error as Error)?.name === "AbortError" || attempt >= maxRetries) throw error;
      onRetry?.(attempt + 1);
      await new Promise((resolve) => setTimeout(resolve, 1200 * (attempt + 1)));
    }
  }
}
