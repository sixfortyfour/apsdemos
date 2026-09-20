const express = require('express');
const formidable = require('express-formidable');
const { listObjects, uploadObject, deleteObject, translateObject, getManifest, urnify } = require('../services/aps');
const { summarizeManifest, applyWebhookStatus } = require('../services/manifestSummary');
const { getFinished } = require('../services/webhookEvents');

let router = express.Router();

router.get('/api/models', async function (req, res, next) {
    try {
        const objects = await listObjects();
        res.json(objects.map(o => ({
            name: o.objectKey,
            urn: urnify(o.objectId),
            size: o.size,
            contentType: o.contentType
        })));
    } catch (err) {
        next(err);
    }
});

router.get('/api/models/:urn/status', async function (req, res, next) {
    try {
        const manifest = await getManifest(req.params.urn);
        // This is polled every couple of seconds while translation is running - never let the
        // browser (or a proxy) serve a cached/304 response instead of the current status.
        res.set('Cache-Control', 'no-store');
        const summary = applyWebhookStatus(summarizeManifest(manifest), getFinished(req.params.urn));
        res.json(summary);
    } catch (err) {
        next(err);
    }
});

router.post('/api/models', formidable({ maxFileSize: Infinity }), async function (req, res, next) {
    const file = req.files['model-file'];
    if (!file) {
        res.status(400).send('The required field ("model-file") is missing.');
        return;
    }
    try {
        const obj = await uploadObject(file.name, file.path);
        await translateObject(urnify(obj.objectId), req.fields['model-zip-entrypoint']);
        res.json({
            name: obj.objectKey,
            urn: urnify(obj.objectId)
        });
    } catch (err) {
        next(err);
    }
});

router.delete('/api/models/:objectKey', async function (req, res, next) {
    try {
        await deleteObject(req.params.objectKey);
        res.status(204).end();
    } catch (err) {
        next(err);
    }
});

module.exports = router;