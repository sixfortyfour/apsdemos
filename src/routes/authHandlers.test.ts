import { describe, it, expect, vi } from 'vitest';
import authHandlersModule from './authHandlers.js';

const { requireAuth, createLogin, logout } = authHandlersModule as unknown as {
  requireAuth: (req: any, res: any, next: any) => void;
  createLogin: (expectedPassphrase: string) => (req: any, res: any) => void;
  logout: (req: any, res: any) => void;
};

function mockRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.redirect = vi.fn().mockReturnValue(res);
  return res;
}

describe('createLogin', () => {
  const login = createLogin('correct-horse-battery-staple');

  it('marks the session authenticated and responds ok on the correct passphrase', () => {
    const req: any = { body: { passphrase: 'correct-horse-battery-staple' }, session: {} };
    const res = mockRes();

    login(req, res);

    expect(req.session.authenticated).toBe(true);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
    expect(res.status).not.toHaveBeenCalled();
  });

  it('rejects an incorrect passphrase with 401 and leaves the session unauthenticated', () => {
    const req: any = { body: { passphrase: 'wrong' }, session: {} };
    const res = mockRes();

    login(req, res);

    expect(req.session.authenticated).toBeUndefined();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: 'Incorrect passphrase.' });
  });

  it('rejects a missing body without throwing', () => {
    const req: any = { session: {} };
    const res = mockRes();

    login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });
});

describe('logout', () => {
  it('destroys the session and responds ok', () => {
    const destroy = vi.fn((cb: () => void) => cb());
    const req: any = { session: { destroy } };
    const res = mockRes();

    logout(req, res);

    expect(destroy).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });
});

describe('requireAuth', () => {
  it('calls next() when the session is authenticated', () => {
    const req: any = { session: { authenticated: true } };
    const res = mockRes();
    const next = vi.fn();

    requireAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it('responds with 401 JSON for unauthenticated API requests', () => {
    const req: any = { session: {}, path: '/api/models' };
    const res = mockRes();
    const next = vi.fn();

    requireAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Not authenticated.' });
  });

  it('redirects unauthenticated page requests to the login page, preserving the target URL', () => {
    const req: any = { session: {}, path: '/dashboard', originalUrl: '/dashboard?tab=1' };
    const res = mockRes();
    const next = vi.fn();

    requireAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith('/login.html?redirect=%2Fdashboard%3Ftab%3D1');
  });

  it('treats a missing session as unauthenticated', () => {
    const req: any = { path: '/api/models' };
    const res = mockRes();
    const next = vi.fn();

    requireAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
