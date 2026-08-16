const path = require('path');
const express = require('express');
const session = require('express-session');
const { PORT, SESSION_SECRET } = require('./config.js');
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
app.get('/login.css', (req, res) => res.sendFile(path.join(__dirname, 'wwwroot', 'login.css')));
app.get('/login.js', (req, res) => res.sendFile(path.join(__dirname, 'wwwroot', 'login.js')));
app.use(requireAuth);
app.use(express.static(path.join(__dirname, 'wwwroot')));
app.use(require('./routes/auth.js'));
app.use(require('./routes/models.js'));
app.listen(PORT, function () { console.log(`Server listening on port ${PORT}...`); });