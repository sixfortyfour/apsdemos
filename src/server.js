const path = require('path');
const express = require('express');
const session = require('express-session');
const { PORT, SESSION_SECRET } = require('./config');
const { router: sessionRouter, requireAuth } = require('./routes/session.js');

let app = express();
app.use(express.json());
app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax' }
}));
app.use(sessionRouter);
app.get('/login.html', (req, res) => res.sendFile(path.join(__dirname, 'wwwroot', 'login.html')));
// Built JS/CSS chunks are just UI code, not sensitive, and the login page needs
// its own chunk before the user is authenticated, so serve /assets ahead of the auth gate.
app.use('/assets', express.static(path.join(__dirname, 'wwwroot', 'assets')));
app.use(requireAuth);
app.use(express.static(path.join(__dirname, 'wwwroot')));
app.use(require('./routes/auth.js'));
app.use(require('./routes/models.js'));
app.listen(PORT, function () { console.log(`Server listening on port ${PORT}...`); });