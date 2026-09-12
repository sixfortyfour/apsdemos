function requireAuth(req, res, next) {
    if (req.session?.authenticated) {
        return next();
    }
    if (req.path.startsWith('/api/')) {
        return res.status(401).json({ error: 'Not authenticated.' });
    }
    res.redirect(`/login.html?redirect=${encodeURIComponent(req.originalUrl)}`);
}

function createLogin(expectedPassphrase) {
    return function login(req, res) {
        const passphrase = req.body?.passphrase;
        if (passphrase === expectedPassphrase) {
            req.session.authenticated = true;
            res.json({ ok: true });
        } else {
            res.status(401).json({ ok: false, error: 'Incorrect passphrase.' });
        }
    };
}

function logout(req, res) {
    req.session.destroy(() => res.json({ ok: true }));
}

module.exports = { requireAuth, createLogin, logout };
