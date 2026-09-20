const crypto = require('crypto');

// Per https://aps.autodesk.com/en/docs/webhooks/v1/tutorials/how-to-verify-payload-signature/ -
// the x-adsk-signature header holds "sha1hash=" followed by the HMAC-SHA1 of the raw request
// body, keyed with the secret token set on the webhook.
function verifySignature(secret, rawBody, signatureHeader) {
    if (!secret || !rawBody || !signatureHeader) {
        return false;
    }
    const expected = 'sha1hash=' + crypto.createHmac('sha1', secret).update(rawBody).digest('hex');
    const expectedBuffer = Buffer.from(expected);
    const actualBuffer = Buffer.from(signatureHeader);
    if (expectedBuffer.length !== actualBuffer.length) {
        return false;
    }
    return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

function createModelDerivativeWebhookHandler(secret, recordFinished) {
    return function handleModelDerivativeWebhook(req, res) {
        if (!verifySignature(secret, req.rawBody, req.header('x-adsk-signature'))) {
            res.status(403).send('Signature verification failed.');
            return;
        }
        const urn = req.body?.payload?.URN;
        const status = req.body?.payload?.Payload?.status;
        if (urn && status) {
            recordFinished(urn, status);
        }
        res.status(204).end();
    };
}

module.exports = { verifySignature, createModelDerivativeWebhookHandler };
