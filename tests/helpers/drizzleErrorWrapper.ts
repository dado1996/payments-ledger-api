interface PostgresDriverError {
  code: string;
  message: string;
}

interface DrizzleWrappedError {
  cause: PostgresDriverError;
}

export function isDrizzlePostgresError(error: unknown): error is DrizzleWrappedError {
  if (typeof error !== "object" || error === null) return false;

  // Extract and check the nested 'cause' property
  const hasCause = "cause" in error;
  if (!hasCause) return false;

  const cause = (error as Record<string, unknown>).cause;
  return (
    typeof cause === "object" &&
    cause !== null &&
    "code" in cause &&
    "message" in cause &&
    typeof (cause as Record<string, unknown>).code === "string" &&
    typeof (cause as Record<string, unknown>).message === "string"
  );
}
