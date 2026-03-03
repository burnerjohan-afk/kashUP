/**
 * Utility to wrap async functions with a timeout
 * Returns default value if timeout is exceeded
 */
export const withTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number,
  defaultValue: T,
  errorMessage?: string
): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => {
        reject(new Error(errorMessage || `Timeout after ${timeoutMs}ms`));
      }, timeoutMs)
    )
  ]).catch(() => defaultValue);
};

/**
 * Safe Prisma query wrapper with timeout and error handling
 */
export const safePrismaQuery = <T>(
  queryFn: () => Promise<T>,
  defaultValue: T,
  timeoutMs: number = 3000,
  logContext?: string
): Promise<T> => {
  return withTimeout(
    queryFn().catch((error) => {
      console.error(`[API] Prisma error in ${logContext || 'query'}:`, error.message);
      return defaultValue;
    }),
    timeoutMs,
    defaultValue,
    `Prisma timeout in ${logContext || 'query'}`
  );
};

