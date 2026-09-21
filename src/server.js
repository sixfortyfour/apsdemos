const path = require('path');
const express = require('express');
const session = require('express-session');
const { PORT, SESSION_SECRET, APS_WEBHOOK_CALLBACK_BASE_URL, APS_WEBHOOK_SECRET } = require('./config');
const { router: sessionRouter, requireAuth } = require('./routes/session.js');
const { ensureWebhook } = require('./services/aps');

let app = express();
app.use(express.json({
    // The webhook callback route needs the exact raw bytes to verify its HMAC signature.
    verify: (req, res, buf) => { req.rawBody = buf; }
}));
app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax' }
}));
app.use(sessionRouter);
// Called by APS's servers, not a signed-in user, so this has to sit ahead of the auth gate below.
app.use(require('./routes/webhooks.js'));
app.get('/login.html', (req, res) => res.sendFile(path.join(__dirname, 'wwwroot', 'login.html')));
// Built JS/CSS chunks are just UI code, not sensitive, and the login page needs
// its own chunk before the user is authenticated, so serve /assets ahead of the auth gate.
app.use('/assets', express.static(path.join(__dirname, 'wwwroot', 'assets')));
app.use(requireAuth);
app.use(express.static(path.join(__dirname, 'wwwroot')));
app.use(require('./routes/auth.js'));
app.use(require('./routes/models.js'));
app.use(require('./routes/statusEvents.js'));
app.listen(PORT, function () {
    console.log(`Server listening on port ${PORT}...`);
    if (APS_WEBHOOK_CALLBACK_BASE_URL && APS_WEBHOOK_SECRET) {
        ensureWebhook(APS_WEBHOOK_SECRET, APS_WEBHOOK_CALLBACK_BASE_URL).catch((err) => {
            console.error('Failed to register the Model Derivative webhook - falling back to polling only.', err);
        });
    }
});