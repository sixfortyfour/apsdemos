import { Data } from 'effect';

export class ApsRequestError extends Data.TaggedError('ApsRequestError')<{
  readonly operation: string;
  readonly status: number | null;
  readonly cause: unknown;
}> {}

// SDK errors expose `httpStatusCode()` (OssApiError, ModelDerivativeApiError, AuthenticationApiError);
// anything else (network failure, DNS, etc.) surfaces as a null status.
export function statusOf(err: unknown): number | null {
  const fn = (err as { httpStatusCode?: () => number | null })?.httpStatusCode;
  return typeof fn === 'function' ? fn.call(err) : null;
}

// Server-side/network failures (status >= 500 or unknown) are worth retrying; a 4xx means the
// request itself is wrong and retrying it would just fail again the same way.
export function isTransientError(err: { status: number | null }): boolean {
  return err.status === null || err.status >= 500;
}

export function urnify(id: string): string {
  return Buffer.from(id).toString('base64').replace(/=/g, '');
}
