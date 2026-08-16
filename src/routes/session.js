const express = require('express');
const { LOGIN_PASSPHRASE } = require('../config.js');

let router = express.Router();

router.post('/api/auth/login', function (req, res) {
    const passphrase = req.body?.passphrase;
    if (passphrase === LOGIN_PASSPHRASE) {
        req.session.authenticated = true;
        res.json({ ok: true });
    } else {
        res.status(401).json({ ok: false, error: 'Incorrect passphrase.' });
    }
});

router.post('/api/auth/logout', function (req, res) {
    req.session.destroy(() => res.json({ ok: true }));
});

function requireAuth(req, res, next) {
    if (req.session?.authenticated) {
        return next();
    }
    if (req.path.startsWith('/api/')) {
        return res.status(401).json({ error: 'Not authenticated.' });
    }
    res.redirect(`/login.html?redirect=${encodeURIComponent(req.originalUrl)}`);
}

module.exports = { router, requireAuth };
