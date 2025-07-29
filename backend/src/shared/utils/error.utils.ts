/**
 * Enterprise Error Handling Utilities for NestJS 11 + TypeScript 5.8 + ES2023
 * Provides type-safe error handling with proper unknown type checking
 */

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  return 'Unknown error occurred';
}

export function getErrorStack(error: unknown): string | undefined {
  if (error instanceof Error) {
    return error.stack;
  }
  if (error && typeof error === 'object' && 'stack' in error) {
    return String(error.stack);
  }
  return undefined;
}

export function isErrorWithMessage(error: unknown): error is Error {
  return error instanceof Error || (
    error && 
    typeof error === 'object' && 
    'message' in error
  );
}

export function formatError(error: unknown): { message: string; stack?: string } {
  const stack = getErrorStack(error);
  return {
    message: getErrorMessage(error),
    ...(stack && { stack })
  };
}
