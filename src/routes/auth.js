const express = require('express');
const { getViewerToken } = require('../services/aps');

let router = express.Router();

router.get('/api/auth/token', async function (req, res, next) {
    try {
        res.json(await getViewerToken());
    } catch (err) {
        next(err);
    }
});

module.exports = router;