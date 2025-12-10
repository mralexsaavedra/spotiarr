/**
 * Type-safe error handling utilities
 */

/**
 * Type guard to check if an error is an Error instance
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * Safely extracts error message from unknown error
 */
export function getErrorMessage(error: unknown): string {
  if (isError(error)) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }
  return "Unknown error";
}

/**
 * Safely extracts error stack from unknown error
 */
export function getErrorStack(error: unknown): string | undefined {
  if (isError(error)) {
    return error.stack;
  }
  return undefined;
}

/**
 * Converts unknown error to Error instance
 */
export function toError(error: unknown): Error {
  if (isError(error)) {
    return error;
  }
  if (typeof error === "string") {
    return new Error(error);
  }
  return new Error(getErrorMessage(error));
}
