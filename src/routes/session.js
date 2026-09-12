const express = require('express');
const { LOGIN_PASSPHRASE } = require('../config');
const { requireAuth, createLogin, logout } = require('./authHandlers');

let router = express.Router();

const login = createLogin(LOGIN_PASSPHRASE);

router.post('/api/auth/login', login);
router.post('/api/auth/logout', logout);

module.exports = { router, requireAuth, login, logout };
