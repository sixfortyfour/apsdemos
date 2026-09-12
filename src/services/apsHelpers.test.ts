import { describe, it, expect } from 'vitest';
import { statusOf, isTransientError, urnify } from './apsHelpers';

describe('statusOf', () => {
  it('reads the status from an SDK error exposing httpStatusCode()', () => {
    const err = { httpStatusCode: () => 404 };
    expect(statusOf(err)).toBe(404);
  });

  it('returns null when httpStatusCode() itself returns null', () => {
    const err = { httpStatusCode: () => null };
    expect(statusOf(err)).toBeNull();
  });

  it('returns null for errors without httpStatusCode (e.g. network failures)', () => {
    expect(statusOf(new Error('ECONNRESET'))).toBeNull();
  });

  it('returns null for non-object/null input', () => {
    expect(statusOf(null)).toBeNull();
    expect(statusOf(undefined)).toBeNull();
    expect(statusOf('oops')).toBeNull();
  });
});

describe('isTransientError', () => {
  it('treats unknown status (null) as transient', () => {
    expect(isTransientError({ status: null })).toBe(true);
  });

  it('treats 5xx as transient', () => {
    expect(isTransientError({ status: 500 })).toBe(true);
    expect(isTransientError({ status: 503 })).toBe(true);
  });

  it('treats 4xx as non-transient', () => {
    expect(isTransientError({ status: 400 })).toBe(false);
    expect(isTransientError({ status: 404 })).toBe(false);
  });

  it('treats 2xx/3xx as non-transient', () => {
    expect(isTransientError({ status: 200 })).toBe(false);
    expect(isTransientError({ status: 304 })).toBe(false);
  });
});

describe('urnify', () => {
  it('base64-encodes the id', () => {
    expect(urnify('hello')).toBe(Buffer.from('hello').toString('base64').replace(/=/g, ''));
  });

  it('strips padding "=" characters', () => {
    // 'a' -> base64 "YQ==" — a case that actually has padding to strip.
    expect(urnify('a')).toBe('YQ');
  });

  it('round-trips back to the original id once padding is restored', () => {
    const id = 'urn:adsk.objects:os.object:some-bucket/some-object.rvt';
    const encoded = urnify(id);
    expect(encoded).not.toMatch(/=/);
    const padded = encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '=');
    expect(Buffer.from(padded, 'base64').toString()).toBe(id);
  });
});
