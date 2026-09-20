import { describe, it, expect, vi } from 'vitest';
import crypto from 'crypto';
import webhookHandlersModule from './webhookHandlers.js';

const { verifySignature, createModelDerivativeWebhookHandler } = webhookHandlersModule as unknown as {
  verifySignature: (secret: string | undefined, rawBody: Buffer | undefined, signatureHeader: string | undefined) => boolean;
  createModelDerivativeWebhookHandler: (
    secret: string | undefined,
    recordFinished: (urn: string, status: string) => void
  ) => (req: any, res: any) => void;
};

function sign(secret: string, body: string): string {
  return 'sha1hash=' + crypto.createHmac('sha1', secret).update(body).digest('hex');
}

function mockRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);
  res.end = vi.fn().mockReturnValue(res);
  return res;
}

describe('verifySignature', () => {
  const secret = 'shh-its-a-secret';
  const body = Buffer.from(JSON.stringify({ hello: 'world' }));

  it('accepts a signature computed with the correct secret over the exact body', () => {
    expect(verifySignature(secret, body, sign(secret, body.toString()))).toBe(true);
  });

  it('rejects a signature computed with the wrong secret', () => {
    expect(verifySignature(secret, body, sign('wrong-secret', body.toString()))).toBe(false);
  });

  it('rejects a signature that does not match the exact body received', () => {
    expect(verifySignature(secret, body, sign(secret, 'a different body'))).toBe(false);
  });

  it('rejects when the secret, body, or header is missing', () => {
    expect(verifySignature(undefined, body, sign(secret, body.toString()))).toBe(false);
    expect(verifySignature(secret, undefined, sign(secret, body.toString()))).toBe(false);
    expect(verifySignature(secret, body, undefined)).toBe(false);
  });
});

describe('createModelDerivativeWebhookHandler', () => {
  const secret = 'shh-its-a-secret';

  it('records the finished translation and acks with 204 on a valid signature', () => {
    const payload = { payload: { URN: 'some-urn', Payload: { status: 'success' } } };
    const rawBody = Buffer.from(JSON.stringify(payload));
    const recordFinished = vi.fn();
    const handler = createModelDerivativeWebhookHandler(secret, recordFinished);
    const req: any = {
      rawBody,
      body: payload,
      header: (name: string) => (name === 'x-adsk-signature' ? sign(secret, rawBody.toString()) : undefined),
    };
    const res = mockRes();

    handler(req, res);

    expect(recordFinished).toHaveBeenCalledWith('some-urn', 'success');
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.end).toHaveBeenCalled();
  });

  it('rejects with 403 and does not record anything on an invalid signature', () => {
    const payload = { payload: { URN: 'some-urn', Payload: { status: 'success' } } };
    const recordFinished = vi.fn();
    const handler = createModelDerivativeWebhookHandler(secret, recordFinished);
    const req: any = {
      rawBody: Buffer.from(JSON.stringify(payload)),
      body: payload,
      header: () => 'sha1hash=not-the-right-signature',
    };
    const res = mockRes();

    handler(req, res);

    expect(recordFinished).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('does not throw and skips recording when the payload is missing expected fields', () => {
    const payload = { payload: {} };
    const rawBody = Buffer.from(JSON.stringify(payload));
    const recordFinished = vi.fn();
    const handler = createModelDerivativeWebhookHandler(secret, recordFinished);
    const req: any = {
      rawBody,
      body: payload,
      header: (name: string) => (name === 'x-adsk-signature' ? sign(secret, rawBody.toString()) : undefined),
    };
    const res = mockRes();

    handler(req, res);

    expect(recordFinished).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(204);
  });
});
